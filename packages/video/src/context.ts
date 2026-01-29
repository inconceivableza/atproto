import { VideoConfig } from './config'

export type AppContextOptions = {
  cfg: VideoConfig
}

export class AppContext {
  public cfg: VideoConfig

  constructor(opts: AppContextOptions) {
    this.cfg = opts.cfg
  }
}

export default AppContext
