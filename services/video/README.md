# Video Service

Video processing service for the AT Protocol / Bluesky.

## Running

```bash
# Install ffmpeg (required)
# On Ubuntu/Debian: apt-get install ffmpeg
# On macOS: brew install ffmpeg

# Set environment variables
export VIDEO_PORT=2583
export VIDEO_HOSTNAME=localhost
export VIDEO_SERVER_DID=did:plc:your-server-did
export VIDEO_PUBLIC_URL=https://video.example.com
export VIDEO_DB_POSTGRES_URL=postgresql://user:password@localhost:5432/video
export VIDEO_DB_POSTGRES_SCHEMA=public
export VIDEO_DB_POOL_SIZE=10
export VIDEO_STORAGE_DIR=./storage
export VIDEO_FFMPEG_PATH=ffmpeg
export VIDEO_FFPROBE_PATH=ffprobe
export VIDEO_PROCESSING_CONCURRENCY=2
export VIDEO_JWT_SECRET=your-jwt-secret
export VIDEO_SERVICE_SIGNING_KEY=your-signing-key

# Start the service
node index.js
```

## Requirements

**ffmpeg** must be installed and available in PATH:
- Ubuntu/Debian: `apt-get install ffmpeg`
- macOS: `brew install ffmpeg`
- Or specify custom paths with `VIDEO_FFMPEG_PATH` and `VIDEO_FFPROBE_PATH`

## Environment Variables

- `VIDEO_PORT` - Port to listen on (default: 2583)
- `VIDEO_HOSTNAME` - Hostname to bind to (default: localhost)
- `VIDEO_SERVER_DID` - Server DID for authentication
- `VIDEO_PUBLIC_URL` - Public URL for the service
- `VIDEO_DB_POSTGRES_URL` - PostgreSQL connection string (required)
- `VIDEO_DB_POSTGRES_SCHEMA` - PostgreSQL schema name (optional)
- `VIDEO_DB_POOL_SIZE` - Database connection pool size (default: 10)
- `VIDEO_STORAGE_DIR` - Directory for storing videos and HLS output (default: ./storage)
- `VIDEO_FFMPEG_PATH` - Path to ffmpeg binary (default: ffmpeg)
- `VIDEO_FFPROBE_PATH` - Path to ffprobe binary (default: ffprobe)
- `VIDEO_PROCESSING_CONCURRENCY` - Number of videos to process concurrently (default: 2)
- `VIDEO_MAX_SIZE` - Max video size in bytes (default: 100MB)
- `VIDEO_DAILY_UPLOAD_LIMIT_BYTES` - Daily upload limit in bytes (default: 500MB)
- `VIDEO_DAILY_UPLOAD_LIMIT_VIDEOS` - Daily upload limit in count (default: 25)
- `VIDEO_JWT_SECRET` - JWT secret for authentication
- `VIDEO_SERVICE_SIGNING_KEY` - Service signing key

## API Endpoints

### Upload Video
`POST /xrpc/app.bsky.video.uploadVideo`

Upload a video for processing.

### Get Job Status
`GET /xrpc/app.bsky.video.getJobStatus?jobId=<jobId>`

Get the status of a video processing job.

### Get Upload Limits
`GET /xrpc/app.bsky.video.getUploadLimits`

Get current upload limits for the authenticated user.

## Health Check

`GET /xrpc/_health`

Returns service health status.
