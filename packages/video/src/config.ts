export interface VideoConfigValues {
  port?: number
  serverDid: string
  publicUrl?: string

  // Video processing
  maxVideoSize?: number
  supportedMimeTypes?: string[]

  // Storage
  blobstoreLocation?: string

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
      serverDid: process.env.VIDEO_SERVER_DID || '',
      publicUrl: process.env.VIDEO_PUBLIC_URL,
      maxVideoSize: parseIntWithFallback(process.env.VIDEO_MAX_SIZE),
      blobstoreLocation: process.env.VIDEO_BLOBSTORE_LOCATION,
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

  get serverDid() {
    return this.cfg.serverDid
  }

  get publicUrl() {
    return this.cfg.publicUrl
  }

  get maxVideoSize() {
    return this.cfg.maxVideoSize!
  }

  get supportedMimeTypes() {
    return this.cfg.supportedMimeTypes!
  }

  get blobstoreLocation() {
    return this.cfg.blobstoreLocation
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
