import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { AtpAgent } from '@atproto/api'
import { IdResolver, getPds } from '@atproto/identity'
import { Database, VideoJobs } from '../db'
import { FFmpegProcessor } from './ffmpeg'

export interface ProcessVideoOptions {
  jobId: string
  inputPath: string
  outputDir: string
  did: string
}

export interface VideoProcessorConfig {
  ffmpegPath?: string
  ffprobePath?: string
  storageDir: string
  idResolver?: IdResolver
}

export class VideoProcessor {
  private ffmpeg: FFmpegProcessor
  private videoJobs: VideoJobs
  private config: VideoProcessorConfig
  private idResolver?: IdResolver

  constructor(db: Database, config: VideoProcessorConfig) {
    this.ffmpeg = new FFmpegProcessor(config.ffmpegPath, config.ffprobePath)
    this.videoJobs = new VideoJobs(db)
    this.config = config
    this.idResolver = config.idResolver
  }

  /**
   * Process a video: convert to HLS and generate thumbnail
   */
  async processVideo(options: ProcessVideoOptions): Promise<void> {
    const { jobId, inputPath, outputDir, did } = options

    try {
      // Update job state to processing
      await this.videoJobs.updateJob(jobId, {
        state: 'JOB_STATE_PROCESSING',
        progress: 0,
      })

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true })

      // Get video information
      const videoInfo = await this.ffmpeg.getVideoInfo(inputPath)

      // Validate video
      if (videoInfo.duration === 0) {
        throw new Error('Invalid video: duration is 0')
      }

      if (videoInfo.width === 0 || videoInfo.height === 0) {
        throw new Error('Invalid video: width or height is 0')
      }

      // Convert to HLS
      await this.ffmpeg.convertToHLS({
        inputPath,
        outputDir,
        onProgress: async (progress) => {
          // Update job progress in database
          await this.videoJobs.updateJob(jobId, {
            progress: progress.percent,
          })
        },
      })

      // Generate thumbnail
      const thumbnailPath = path.join(outputDir, 'thumbnail.jpg')
      await this.ffmpeg.generateThumbnail(
        inputPath,
        thumbnailPath,
        Math.min(1, videoInfo.duration / 2), // Grab frame from middle of video
      )

      // Generate a blob CID for the processed video
      // TODO: This should be a proper CID based on the content
      const blobCid = randomUUID()

      // Update job state to completed
      await this.videoJobs.updateJob(jobId, {
        state: 'JOB_STATE_COMPLETED',
        progress: 100,
        blobCid,
      })
    } catch (error) {
      // Update job state to failed
      await this.videoJobs.updateJob(jobId, {
        state: 'JOB_STATE_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: 100,
      })

      throw error
    }
  }

  /**
   * Get the storage path for a job
   */
  getJobStoragePath(jobId: string): string {
    return path.join(this.config.storageDir, jobId)
  }

  /**
   * Fetch video blob from user's PDS and store locally
   */
  async fetchAndStoreVideoBlob(
    did: string,
    videoCid: string,
    jobId: string,
  ): Promise<string> {
    if (!this.idResolver) {
      throw new Error('IdResolver not configured')
    }

    // Resolve the user's DID to get their PDS
    const didDoc = await this.idResolver.did.resolve(did)
    if (!didDoc) {
      throw new Error(`Could not resolve DID: ${did}`)
    }

    const pds = getPds(didDoc)
    if (!pds) {
      throw new Error(`No PDS found for DID: ${did}`)
    }

    // Fetch the blob from the PDS
    const agent = new AtpAgent({ service: pds })
    const { data } = await agent.com.atproto.sync.getBlob({
      did,
      cid: videoCid,
    })

    // Store the blob locally
    const storagePath = this.getJobStoragePath(jobId)
    await fs.mkdir(storagePath, { recursive: true })

    const inputPath = path.join(storagePath, 'input.mp4')
    await fs.writeFile(inputPath, Buffer.from(data))

    return inputPath
  }

  /**
   * Store uploaded video file (for direct uploads)
   */
  async storeUploadedVideo(
    jobId: string,
    videoData: Buffer,
  ): Promise<string> {
    const storagePath = this.getJobStoragePath(jobId)
    await fs.mkdir(storagePath, { recursive: true })

    const inputPath = path.join(storagePath, 'input.mp4')
    await fs.writeFile(inputPath, videoData)

    return inputPath
  }

  /**
   * Clean up job files
   */
  async cleanupJob(jobId: string): Promise<void> {
    const storagePath = this.getJobStoragePath(jobId)
    try {
      await fs.rm(storagePath, { recursive: true, force: true })
    } catch (error) {
      // Ignore errors if directory doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  /**
   * Validate ffmpeg installation
   */
  async validateSetup(): Promise<{
    ffmpeg: boolean
    ffprobe: boolean
    storage: boolean
  }> {
    const results = {
      ffmpeg: await this.ffmpeg.validateFFmpeg(),
      ffprobe: await this.ffmpeg.validateFFprobe(),
      storage: false,
    }

    // Check if storage directory is writable
    try {
      await fs.mkdir(this.config.storageDir, { recursive: true })
      const testFile = path.join(this.config.storageDir, '.write-test')
      await fs.writeFile(testFile, 'test')
      await fs.unlink(testFile)
      results.storage = true
    } catch {
      results.storage = false
    }

    return results
  }
}
