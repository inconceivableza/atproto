# Video Service

Video processing service for the AT Protocol / Bluesky.

## Running

```bash
# Set environment variables
export VIDEO_PORT=2583
export VIDEO_HOSTNAME=localhost
export VIDEO_SERVER_DID=did:plc:your-server-did
export VIDEO_PUBLIC_URL=https://video.example.com
export VIDEO_JWT_SECRET=your-jwt-secret
export VIDEO_SERVICE_SIGNING_KEY=your-signing-key

# Start the service
node index.js
```

## Environment Variables

- `VIDEO_PORT` - Port to listen on (default: 2583)
- `VIDEO_HOSTNAME` - Hostname to bind to (default: localhost)
- `VIDEO_SERVER_DID` - Server DID for authentication
- `VIDEO_PUBLIC_URL` - Public URL for the service
- `VIDEO_MAX_SIZE` - Max video size in bytes (default: 100MB)
- `VIDEO_BLOBSTORE_LOCATION` - Path to blob storage directory
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
