import EventEmitter from 'node:events'
import { Database, VideoJobs } from '../db'
import { VideoProcessor, ProcessVideoOptions } from './processor'

export interface ProcessingQueueConfig {
  concurrency?: number
  pollInterval?: number
}

export class ProcessingQueue extends EventEmitter {
  private db: Database
  private processor: VideoProcessor
  private videoJobs: VideoJobs
  private config: ProcessingQueueConfig
  private running = false
  private activeJobs = new Set<string>()
  private pollTimer?: NodeJS.Timeout

  constructor(
    db: Database,
    processor: VideoProcessor,
    config: ProcessingQueueConfig = {},
  ) {
    super()
    this.db = db
    this.processor = processor
    this.videoJobs = new VideoJobs(db)
    this.config = {
      concurrency: config.concurrency || 2,
      pollInterval: config.pollInterval || 5000, // 5 seconds
    }
  }

  /**
   * Start the processing queue
   */
  start(): void {
    if (this.running) {
      return
    }

    this.running = true
    this.emit('start')
    this.poll()
  }

  /**
   * Stop the processing queue
   */
  async stop(): Promise<void> {
    this.running = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = undefined
    }

    // Wait for active jobs to complete
    while (this.activeJobs.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    this.emit('stop')
  }

  /**
   * Poll for new jobs to process
   */
  private async poll(): Promise<void> {
    if (!this.running) {
      return
    }

    try {
      await this.processNextJobs()
    } catch (error) {
      this.emit('error', error)
    }

    // Schedule next poll
    if (this.running) {
      this.pollTimer = setTimeout(
        () => this.poll(),
        this.config.pollInterval,
      )
    }
  }

  /**
   * Process the next available jobs up to concurrency limit
   */
  private async processNextJobs(): Promise<void> {
    const availableSlots = this.config.concurrency! - this.activeJobs.size

    if (availableSlots <= 0) {
      return
    }

    // Get pending jobs
    const jobs = await this.videoJobs.getJobsByState(
      'JOB_STATE_CREATED',
      availableSlots,
    )

    for (const job of jobs) {
      if (this.activeJobs.has(job.jobId)) {
        continue
      }

      this.activeJobs.add(job.jobId)
      this.processJob(job.jobId, job.did).catch((error) => {
        this.emit('job-error', job.jobId, error)
      })
    }
  }

  /**
   * Process a single job
   */
  private async processJob(jobId: string, did: string): Promise<void> {
    try {
      this.emit('job-start', jobId)

      // Get job details to check for videoCid
      const job = await this.videoJobs.getJob(jobId)
      if (!job) {
        throw new Error(`Job ${jobId} not found`)
      }

      const storagePath = this.processor.getJobStoragePath(jobId)
      let inputPath: string

      // If job has videoCid, fetch from PDS
      // Otherwise assume it was directly uploaded
      if (job.videoCid) {
        console.log(`[Queue] Fetching video blob ${job.videoCid} from PDS for job ${jobId}`)
        inputPath = await this.processor.fetchAndStoreVideoBlob(
          did,
          job.videoCid,
          jobId,
        )
      } else {
        inputPath = `${storagePath}/input.mp4`
      }

      await this.processor.processVideo({
        jobId,
        inputPath,
        outputDir: storagePath,
        did,
      })

      this.emit('job-complete', jobId)
    } catch (error) {
      this.emit('job-failed', jobId, error)
      throw error
    } finally {
      this.activeJobs.delete(jobId)
    }
  }

  /**
   * Get queue status
   */
  getStatus(): {
    running: boolean
    activeJobs: number
    concurrency: number
  } {
    return {
      running: this.running,
      activeJobs: this.activeJobs.size,
      concurrency: this.config.concurrency!,
    }
  }
}
