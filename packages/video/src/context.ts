import { IdResolver } from '@atproto/identity'
import { VideoConfig } from './config'
import { Database, VideoJobs, VideoUploadLimits } from './db'
import { VideoProcessor, ProcessingQueue } from './processing'
import { AuthVerifier } from './auth-verifier'
import { VideoSubscription } from './subscription'

export type AppContextOptions = {
  cfg: VideoConfig
  db: Database
  processor: VideoProcessor
  queue: ProcessingQueue
  idResolver: IdResolver
  authVerifier: AuthVerifier
  subscription: VideoSubscription
}

export class AppContext {
  public cfg: VideoConfig
  public db: Database
  public videoJobs: VideoJobs
  public videoUploadLimits: VideoUploadLimits
  public processor: VideoProcessor
  public queue: ProcessingQueue
  public idResolver: IdResolver
  public authVerifier: AuthVerifier
  public subscription: VideoSubscription

  constructor(opts: AppContextOptions) {
    this.cfg = opts.cfg
    this.db = opts.db
    this.videoJobs = new VideoJobs(opts.db)
    this.videoUploadLimits = new VideoUploadLimits(opts.db)
    this.processor = opts.processor
    this.queue = opts.queue
    this.idResolver = opts.idResolver
    this.authVerifier = opts.authVerifier
    this.subscription = opts.subscription
  }
}

export default AppContext
