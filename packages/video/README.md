# @atproto/video

Reference implementation of video processing service for the AT Protocol.

## Overview

This package provides the video processing service that handles:
- Video upload
- Video processing job management
- Job status tracking
- Upload limits management

## Database

This service uses PostgreSQL for persistent storage, following the same patterns as the bsky and ozone services.

Required tables:
- `video_job` - Video processing job tracking
- `video_upload_limit` - Daily upload quota tracking per user

Migrations are automatically run on service startup.

## Usage

```typescript
import { VideoService, VideoConfig } from '@atproto/video'

const config = VideoConfig.readEnv({
  dbPostgresUrl: 'postgresql://user:password@localhost:5432/video',
  dbPostgresSchema: 'public',
})
const service = VideoService.create(config)
await service.start()
```

## API Endpoints

- `app.bsky.video.uploadVideo` - Upload a video for processing
- `app.bsky.video.getJobStatus` - Get the status of a video processing job
- `app.bsky.video.getUploadLimits` - Get current upload limits for a user
