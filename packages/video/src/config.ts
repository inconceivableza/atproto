export interface VideoConfigValues {
  port?: number
  hostname?: string
  serviceDid: string
  publicUrl?: string

  // Database
  dbPostgresUrl?: string
  dbPostgresSchema?: string
  dbPoolSize?: number

  // Identity Resolution
  didPlcUrl?: string

  // Video processing
  maxVideoSize?: number
  supportedMimeTypes?: string[]

  // Storage
  storageDir?: string

  // FFmpeg
  ffmpegPath?: string
  ffprobePath?: string

  // Processing
  processingConcurrency?: number

  // Rate limiting
  dailyUploadLimitBytes?: number
  dailyUploadLimitVideos?: number

  // Auth
  jwtSecret?: string
  serviceSigningKey?: string
}

export class VideoConfig {
  private assignedPort?: number

  constructor(private cfg: VideoConfigValues) {
    // Set defaults
    this.cfg.storageDir ??= './storage'
    this.cfg.ffmpegPath ??= 'ffmpeg'
    this.cfg.ffprobePath ??= 'ffprobe'
    this.cfg.processingConcurrency ??= 2
    this.cfg.maxVideoSize ??= 100 * 1024 * 1024 // 100MB
    this.cfg.supportedMimeTypes ??= [
      'video/mp4',
      'video/webm',
      'video/mpeg',
      'video/quicktime',
      'image/gif',
    ]
    this.cfg.dailyUploadLimitBytes ??= 500 * 1024 * 1024 // 500MB
    this.cfg.dailyUploadLimitVideos ??= 25
  }

  static readEnv(overrides?: Partial<VideoConfigValues>) {
    const cfg: VideoConfigValues = {
      port: parseIntWithFallback(process.env.VIDEO_PORT, 2583),
      hostname: process.env.VIDEO_HOSTNAME,
      serviceDid: process.env.VIDEO_SERVICE_DID || '',
      publicUrl: process.env.VIDEO_PUBLIC_URL,
      dbPostgresUrl: process.env.VIDEO_DB_POSTGRES_URL,
      dbPostgresSchema: process.env.VIDEO_DB_POSTGRES_SCHEMA,
      dbPoolSize: parseIntWithFallback(process.env.VIDEO_DB_POOL_SIZE, 10),
      didPlcUrl: process.env.VIDEO_DID_PLC_URL || 'https://plc.directory',
      storageDir: process.env.VIDEO_STORAGE_DIR,
      ffmpegPath: process.env.VIDEO_FFMPEG_PATH,
      ffprobePath: process.env.VIDEO_FFPROBE_PATH,
      processingConcurrency: parseIntWithFallback(
        process.env.VIDEO_PROCESSING_CONCURRENCY,
      ),
      maxVideoSize: parseIntWithFallback(process.env.VIDEO_MAX_SIZE),
      dailyUploadLimitBytes: parseIntWithFallback(
        process.env.VIDEO_DAILY_UPLOAD_LIMIT_BYTES,
      ),
      dailyUploadLimitVideos: parseIntWithFallback(
        process.env.VIDEO_DAILY_UPLOAD_LIMIT_VIDEOS,
      ),
      jwtSecret: process.env.VIDEO_JWT_SECRET,
      serviceSigningKey: process.env.VIDEO_SERVICE_SIGNING_KEY,
      ...overrides,
    }
    return new VideoConfig(cfg)
  }

  get port() {
    return this.assignedPort || this.cfg.port
  }

  get hostname() {
    return this.cfg.hostname
  }

  get serviceDid() {
    return this.cfg.serviceDid
  }

  get publicUrl() {
    return this.cfg.publicUrl
  }

  get didPlcUrl() {
    return this.cfg.didPlcUrl
  }

  get dbPostgresUrl() {
    return this.cfg.dbPostgresUrl
  }

  get dbPostgresSchema() {
    return this.cfg.dbPostgresSchema
  }

  get dbPoolSize() {
    return this.cfg.dbPoolSize!
  }

  get maxVideoSize() {
    return this.cfg.maxVideoSize!
  }

  get supportedMimeTypes() {
    return this.cfg.supportedMimeTypes!
  }

  get storageDir() {
    return this.cfg.storageDir!
  }

  get ffmpegPath() {
    return this.cfg.ffmpegPath!
  }

  get ffprobePath() {
    return this.cfg.ffprobePath!
  }

  get processingConcurrency() {
    return this.cfg.processingConcurrency!
  }

  get dailyUploadLimitBytes() {
    return this.cfg.dailyUploadLimitBytes!
  }

  get dailyUploadLimitVideos() {
    return this.cfg.dailyUploadLimitVideos!
  }

  get jwtSecret() {
    return this.cfg.jwtSecret
  }

  get serviceSigningKey() {
    return this.cfg.serviceSigningKey
  }

  assignPort(port: number) {
    this.assignedPort = port
  }
}

function parseIntWithFallback(
  value: string | undefined,
  fallback?: number,
): number | undefined {
  if (value === undefined) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}
