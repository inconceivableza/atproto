import { VideoConfig } from './config'
import { Database, VideoJobs, VideoUploadLimits } from './db'

export type AppContextOptions = {
  cfg: VideoConfig
  db: Database
}

export class AppContext {
  public cfg: VideoConfig
  public db: Database
  public videoJobs: VideoJobs
  public videoUploadLimits: VideoUploadLimits

  constructor(opts: AppContextOptions) {
    this.cfg = opts.cfg
    this.db = opts.db
    this.videoJobs = new VideoJobs(opts.db)
    this.videoUploadLimits = new VideoUploadLimits(opts.db)
  }
}

export default AppContext
