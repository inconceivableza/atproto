/* eslint-env node */

'use strict'

const { VideoService, VideoConfig } = require('@atproto/video')
const pkg = require('@atproto/video/package.json')

const main = async () => {
  const env = readEnv()
  env.version ??= pkg.version
  const config = VideoConfig.readEnv(env)
  const service = VideoService.create(config)

  await service.start()

  console.log(`video service is running on port ${config.port}`)

  // Graceful shutdown (see also https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/)
  process.on('SIGTERM', async () => {
    console.log('video service is stopping')
    await service.destroy()
    console.log('video service is stopped')
  })
}

const readEnv = () => ({
  port: maybeParseInt(process.env.VIDEO_PORT),
  hostname: process.env.VIDEO_HOSTNAME,
  serverDid: process.env.VIDEO_SERVER_DID,
  publicUrl: process.env.VIDEO_PUBLIC_URL,
  dbPostgresUrl: process.env.VIDEO_DB_POSTGRES_URL,
  dbPostgresSchema: process.env.VIDEO_DB_POSTGRES_SCHEMA,
  dbPoolSize: maybeParseInt(process.env.VIDEO_DB_POOL_SIZE),
  storageDir: process.env.VIDEO_STORAGE_DIR,
  ffmpegPath: process.env.VIDEO_FFMPEG_PATH,
  ffprobePath: process.env.VIDEO_FFPROBE_PATH,
  processingConcurrency: maybeParseInt(
    process.env.VIDEO_PROCESSING_CONCURRENCY,
  ),
  maxVideoSize: maybeParseInt(process.env.VIDEO_MAX_SIZE),
  dailyUploadLimitBytes: maybeParseInt(
    process.env.VIDEO_DAILY_UPLOAD_LIMIT_BYTES,
  ),
  dailyUploadLimitVideos: maybeParseInt(
    process.env.VIDEO_DAILY_UPLOAD_LIMIT_VIDEOS,
  ),
  jwtSecret: process.env.VIDEO_JWT_SECRET,
  serviceSigningKey: process.env.VIDEO_SERVICE_SIGNING_KEY,
})

const maybeParseInt = (str) => {
  if (!str) return
  const int = parseInt(str, 10)
  if (isNaN(int)) return
  return int
}

main()
