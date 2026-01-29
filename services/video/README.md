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
export VIDEO_SERVICE_DID=did:plc:your-service-did
export VIDEO_PUBLIC_URL=https://video.example.com
export VIDEO_DB_POSTGRES_URL=postgresql://user:password@localhost:5432/video
export VIDEO_DB_POSTGRES_SCHEMA=public
export VIDEO_DB_POOL_SIZE=10
export VIDEO_DID_PLC_URL=https://plc.directory
export VIDEO_STORAGE_DIR=./storage
export VIDEO_FFMPEG_PATH=ffmpeg
export VIDEO_FFPROBE_PATH=ffprobe
export VIDEO_PROCESSING_CONCURRENCY=2

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
- `VIDEO_SERVICE_DID` - Service DID for JWT audience validation (required)
- `VIDEO_PUBLIC_URL` - Public URL for the service
- `VIDEO_DB_POSTGRES_URL` - PostgreSQL connection string (required)
- `VIDEO_DB_POSTGRES_SCHEMA` - PostgreSQL schema name (optional)
- `VIDEO_DB_POOL_SIZE` - Database connection pool size (default: 10)
- `VIDEO_DID_PLC_URL` - PLC directory URL for DID resolution (default: https://plc.directory)
- `VIDEO_STORAGE_DIR` - Directory for storing videos and HLS output (default: ./storage)
- `VIDEO_FFMPEG_PATH` - Path to ffmpeg binary (default: ffmpeg)
- `VIDEO_FFPROBE_PATH` - Path to ffprobe binary (default: ffprobe)
- `VIDEO_PROCESSING_CONCURRENCY` - Number of videos to process concurrently (default: 2)
- `VIDEO_MAX_SIZE` - Max video size in bytes (default: 100MB)
- `VIDEO_DAILY_UPLOAD_LIMIT_BYTES` - Daily upload limit in bytes (default: 500MB)
- `VIDEO_DAILY_UPLOAD_LIMIT_VIDEOS` - Daily upload limit in count (default: 25)

## Authentication

The video service uses **service JWT authentication**. Clients must:

1. Call `com.atproto.server.getServiceAuth` on their PDS with:
   - `aud`: The video service DID (VIDEO_SERVICE_DID)
   - `lxm`: The lexicon method being called (e.g., `app.bsky.video.uploadVideo`)

2. Include the returned JWT token as a Bearer token in the Authorization header:
   ```
   Authorization: Bearer <jwt-token>
   ```

3. The video service will:
   - Verify the JWT signature using the user's public key from their DID document
   - Validate the audience matches the service DID
   - Extract the user's DID from the `iss` field
   - Authorize the request for that user

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
