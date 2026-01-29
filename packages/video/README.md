# @atproto/video

Reference implementation of video processing service for the AT Protocol.

## Overview

This package provides the video processing service that handles:
- Listening to relay for video uploads via `com.atproto.repo.uploadBlob`
- Fetching video blobs from user PDSs
- HLS (HTTP Live Streaming) video conversion with multiple quality variants
- Thumbnail generation
- Asynchronous job processing with progress tracking
- Upload limits and quota management

## Features

### Video Processing
- **HLS Conversion**: Converts uploaded videos to HLS format with adaptive bitrate streaming
- **Multiple Quality Levels**: Generates 1080p, 720p, and 480p variants automatically
- **ffmpeg-based**: Uses native ffmpeg via child_process for maximum performance and control
- **Progress Tracking**: Real-time progress updates during conversion
- **Thumbnail Generation**: Automatic thumbnail extraction from video

### Job Queue
- **Asynchronous Processing**: Videos are processed in the background
- **Configurable Concurrency**: Process multiple videos simultaneously
- **Automatic Retry**: Failed jobs are tracked with error messages
- **Database-backed**: Job state persisted to PostgreSQL

### Storage
- **Job-based Storage**: Each job gets its own directory
- **HLS Output**: Master playlist and variant playlists with segment files
- **Thumbnails**: JPEG thumbnails stored alongside video

## Requirements

**ffmpeg** must be installed:
- Ubuntu/Debian: `apt-get install ffmpeg`
- macOS: `brew install ffmpeg`

## CLI Tools

### Convert Video

Convert a video file to HLS format from the command line:

```bash
# Convert a video file (output to ./hls-output/)
npm run convert-video video.mp4

# Convert with custom output directory
npm run convert-video video.mp4 ./my-output

# Example with full path
npm run convert-video /path/to/video.mp4 /path/to/output
```

This will:
- Validate ffmpeg installation
- Analyze the input video
- Convert to HLS with 3 quality variants (1080p, 720p, 480p)
- Generate a thumbnail
- Create master playlist and segment files

Test playback with:
```bash
ffplay ./hls-output/playlist.m3u8
```

## Database

This service uses PostgreSQL for persistent storage, following the same patterns as the bsky and ozone services.

Tables:
- `video_job` - Video processing job tracking (state, progress, errors, videoCid, postUri)
- `video_upload_limit` - Daily upload quota tracking per user

Migrations are automatically run on service startup.

## Known Limitations

1. **Cursor Persistence**: The relay subscription currently uses an in-memory cursor (starts from 0). If the service restarts, it reprocesses the entire firehose history. Duplicate job creation is prevented by checking for existing jobs, but this is inefficient. A production implementation should persist the cursor to the database.

2. **Job Cleanup**: Processed video files (HLS segments, thumbnails) are stored indefinitely. A cleanup mechanism should be implemented to remove old job data after a retention period.

3. **Rate Limiting**: Upload limits are tracked but not enforced in a distributed manner. Multiple instances of the video service may not coordinate limits properly.

4. **File Storage**: Videos are stored on the local filesystem. A production deployment should use object storage (S3, etc.) for scalability and reliability.

## Usage

```typescript
import { VideoService, VideoConfig } from '@atproto/video'

const config = VideoConfig.readEnv({
  serviceDid: 'did:web:video.example.com',
  dbPostgresUrl: 'postgresql://user:password@localhost:5432/video',
  relayService: 'wss://bsky.network',
  storageDir: './storage',
  processingConcurrency: 2,
})
const service = VideoService.create(config)
await service.start()
```

## Architecture

### Standard Flow (Direct PDS Upload)

1. **Upload to PDS**: Client uploads video blob to their PDS via `com.atproto.repo.uploadBlob`
2. **Post Creation**: Client creates a post with video embed referencing the blob
3. **Relay Subscription**: Video service listens to relay for posts with video embeds
4. **Job Creation**: Job is created with videoCid as the jobId (content-addressed deduplication)
5. **Blob Fetch**: Job queue fetches the original video blob from user's PDS
6. **Processing**: Video is processed asynchronously (HLS conversion, thumbnail generation)
7. **Completion**: Job state updated to `JOB_STATE_COMPLETED` with videoCid as blobCid
8. **Playback**: Client requests `GET /video/{videoCid}/playlist.m3u8` to play the video

### Proxied Flow (uploadVideo Endpoint)

1. **Upload to Video Service**: Client uploads video to `app.bsky.video.uploadVideo`
2. **Proxy to PDS**: Video service uploads blob to user's PDS via `com.atproto.repo.uploadBlob`, receives videoCid
3. **Job Creation**: Video service creates a processing job with videoCid as jobId
4. **Return Blob Reference**: Client receives blob reference with videoCid
5. **Post Creation**: Client creates post with the blob reference
6. **Relay Processing**: Same as standard flow - relay subscription detects it (deduped by CID)
7. **Polling**: Client polls `getJobStatus` with videoCid to wait for completion
8. **Playback**: Once complete, client uses videoCid to play video from video service

Both flows converge at the relay subscription, ensuring consistent processing regardless of upload method.

## Video Playback

After processing completes, clients can access the video files using the videoCid:

```
# HLS Master Playlist (for video players)
GET https://video.example.com/video/{videoCid}/playlist.m3u8

# Thumbnail
GET https://video.example.com/video/{videoCid}/thumbnail.jpg

# HLS Segments (referenced by playlist)
GET https://video.example.com/video/{videoCid}/stream_0.ts
GET https://video.example.com/video/{videoCid}/stream_1.ts
# etc.
```

The videoCid is content-addressed, meaning:
- The same video uploaded multiple times will have the same CID
- Jobs are automatically deduplicated based on CID
- URLs are stable and cacheable

The master playlist contains references to variant playlists for different quality levels (1080p, 720p, 480p), which in turn reference the .ts segment files.

## API Endpoints

### XRPC Endpoints

- `app.bsky.video.uploadVideo` - Proxy upload: uploads video to user's PDS via uploadBlob, creates processing job
- `app.bsky.video.getJobStatus` - Get the status of a video processing job
- `app.bsky.video.getUploadLimits` - Get current upload limits for a user

### Video Serving Endpoints

- `GET /video/:videoCid/playlist.m3u8` - HLS master playlist for the processed video
- `GET /video/:videoCid/thumbnail.jpg` - Video thumbnail image
- `GET /video/:videoCid/:filename` - HLS segment files (.ts) and variant playlists (.m3u8)

Note: The videoCid is used as the jobId for content-addressed storage and serving.

### uploadVideo Flow

When a client calls `uploadVideo`:
1. Client requests service auth token from PDS: `getServiceAuth({ aud: videoServiceDid })`
2. Client uploads video + token to video service
3. Video service verifies the token (confirms user authorized this)
4. Video service resolves the user's PDS from their DID
5. Video service uploads blob to user's PDS using the **user's token** via `uploadBlob`
6. PDS returns blob reference with videoCid (content-addressed identifier)
7. Video service checks if job exists for this videoCid (automatic deduplication)
8. If new, creates processing job with videoCid as jobId
9. Returns blob reference + videoCid to client
10. Client creates a post with this blob reference
11. Relay subscription detects the post (skips if already processing based on CID)

## Authentication

The video service uses **service JWT authentication** following ATProto standards.

### Client Flow

1. **Request Service Auth Token** from PDS:
   ```typescript
   const { data } = await agent.com.atproto.server.getServiceAuth({
     aud: 'did:web:video.example.com', // Video service DID
     lxm: 'app.bsky.video.uploadVideo', // Method being called
   })
   const token = data.token
   ```

2. **Make Request** with Bearer token:
   ```typescript
   const response = await fetch('https://video.example.com/xrpc/app.bsky.video.uploadVideo', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'video/mp4'
     },
     body: videoData
   })
   ```

### Service Verification

The video service:
1. Extracts Bearer token from Authorization header
2. Resolves the user's DID document via DID resolver
3. Retrieves the user's public signing key (`atproto` key)
4. Verifies the JWT signature using the public key
5. Validates the audience matches the service DID
6. Extracts the user's DID from the `iss` claim
7. Authorizes the request for that user

### Authentication for Proxied Uploads

When the video service uses `uploadVideo` to proxy blob uploads to the user's PDS, it uses the user's own authentication:

1. User requests a service auth token from their PDS for the video service
2. User sends video + token to video service
3. Video service verifies the token (proves user authorized this)
4. Video service uses the **same token** to upload the blob to the user's PDS
5. PDS accepts the upload because the token proves the user authorized it

This is secure because:
- The JWT was issued by the user's PDS
- It proves the user authorized the video service to act on their behalf
- The video service is simply proxying the upload using the user's credentials
- No separate service-to-service authentication needed

### Security

- JWTs are short-lived (max 1 hour expiration)
- Signatures are verified using secp256k1 keys
- Each job is tied to the authenticated user's DID
- Users can only access their own jobs

## Configuration

See `VideoConfigValues` interface for all options:
- `serviceDid` - Service DID for JWT audience validation (required)
- `relayService` - Relay WebSocket URL for subscribing to repo events (required, e.g., wss://bsky.network)
- `didPlcUrl` - PLC directory URL for DID resolution
- Database connection settings
- Storage directory path
- ffmpeg/ffprobe paths
- Processing concurrency
- Upload limits and quotas
