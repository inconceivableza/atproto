# @atproto/video

Reference implementation of video processing service for the AT Protocol.

## Overview

This package provides the video processing service that handles:
- Video upload
- Video processing job management
- Job status tracking
- Upload limits management

## Usage

```typescript
import { VideoService, VideoConfig } from '@atproto/video'

const config = VideoConfig.readEnv()
const service = await VideoService.create(config)
await service.start()
```

## API Endpoints

- `app.bsky.video.uploadVideo` - Upload a video for processing
- `app.bsky.video.getJobStatus` - Get the status of a video processing job
- `app.bsky.video.getUploadLimits` - Get current upload limits for a user
