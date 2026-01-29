# @atproto/video

Reference implementation of video processing service for the AT Protocol.

## Overview

This package provides the video processing service that handles:
- Video upload and storage
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
  dbPostgresUrl: 'postgresql://user:password@localhost:5432/video',
  storageDir: './storage',
  processingConcurrency: 2,
})
const service = VideoService.create(config)
await service.start()
```

## Architecture

1. **Upload**: Client uploads video via `uploadVideo` endpoint
2. **Storage**: Video stored in job-specific directory
3. **Queue**: Job created with state `JOB_STATE_CREATED`
4. **Processing**: Queue picks up job and processes asynchronously
   - Validates video with ffprobe
   - Converts to HLS with multiple quality variants
   - Generates thumbnail
   - Updates progress in database
5. **Completion**: Job state updated to `JOB_STATE_COMPLETED` with blob CID
6. **Polling**: Client polls `getJobStatus` for progress and completion

## API Endpoints

- `app.bsky.video.uploadVideo` - Upload a video for processing
- `app.bsky.video.getJobStatus` - Get the status of a video processing job
- `app.bsky.video.getUploadLimits` - Get current upload limits for a user

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

### Security

- JWTs are short-lived (max 1 hour expiration)
- Signatures are verified using secp256k1 keys
- Each job is tied to the authenticated user's DID
- Users can only access their own jobs

## Configuration

See `VideoConfigValues` interface for all options:
- `serviceDid` - Service DID for JWT audience validation (required)
- `didPlcUrl` - PLC directory URL for DID resolution
- Database connection settings
- Storage directory path
- ffmpeg/ffprobe paths
- Processing concurrency
- Upload limits and quotas
