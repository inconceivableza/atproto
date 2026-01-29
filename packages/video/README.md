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

## Database

This service uses PostgreSQL for persistent storage, following the same patterns as the bsky and ozone services.

Tables:
- `video_job` - Video processing job tracking (state, progress, errors)
- `video_upload_limit` - Daily upload quota tracking per user

Migrations are automatically run on service startup.

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
4. **Job Creation**: When a video embed is detected, a job is created
5. **Blob Fetch**: Job queue fetches the original video blob from user's PDS
6. **Processing**: Video is processed asynchronously (HLS conversion, thumbnail generation)
7. **Completion**: Job state updated to `JOB_STATE_COMPLETED` with processed blob CID

### Proxied Flow (uploadVideo Endpoint)

1. **Upload to Video Service**: Client uploads video to `app.bsky.video.uploadVideo`
2. **Proxy to PDS**: Video service uploads blob to user's PDS via `com.atproto.repo.uploadBlob`
3. **Job Creation**: Video service creates a processing job with the blob CID
4. **Return Blob Reference**: Client receives blob reference
5. **Post Creation**: Client creates post with the blob reference
6. **Relay Processing**: Same as standard flow - relay subscription triggers processing
7. **Polling**: Client can poll `getJobStatus` for progress

Both flows converge at the relay subscription, ensuring consistent processing regardless of upload method.

## API Endpoints

- `app.bsky.video.uploadVideo` - Proxy upload: uploads video to user's PDS via uploadBlob, creates processing job
- `app.bsky.video.getJobStatus` - Get the status of a video processing job
- `app.bsky.video.getUploadLimits` - Get current upload limits for a user

### uploadVideo Flow

When a client calls `uploadVideo`:
1. Client requests service auth token from PDS: `getServiceAuth({ aud: videoServiceDid })`
2. Client uploads video + token to video service
3. Video service verifies the token (confirms user authorized this)
4. Video service resolves the user's PDS from their DID
5. Video service uploads blob to user's PDS using the **user's token** via `uploadBlob`
6. Video service creates a processing job with the blob CID
7. Returns the blob reference to the client
8. Client creates a post with this blob reference
9. Relay subscription detects the post and triggers video processing

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
