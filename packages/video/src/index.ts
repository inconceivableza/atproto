import events from 'node:events'
import http from 'node:http'
import { AddressInfo } from 'node:net'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import { HttpTerminator, createHttpTerminator } from 'http-terminator'
import { DAY, SECOND } from '@atproto/common'
import API from './api'
import { VideoConfig } from './config'
import AppContext from './context'
import { Database } from './db'
import { VideoProcessor, ProcessingQueue } from './processing'
import { createServer } from './lexicon'

export { VideoConfig } from './config'
export type { VideoConfigValues } from './config'
export { AppContext } from './context'
export { Database } from './db'
export * from './processing'

export class VideoService {
  public ctx: AppContext
  public app: express.Application
  public server?: http.Server
  private terminator?: HttpTerminator

  constructor(opts: { ctx: AppContext; app: express.Application }) {
    this.ctx = opts.ctx
    this.app = opts.app
  }

  static create(config: VideoConfig): VideoService {
    const app = express()
    app.set('trust proxy', true)
    app.use(cors({ maxAge: DAY / SECOND }))
    app.use(compression())

    // Initialize database
    if (!config.dbPostgresUrl) {
      throw new Error('VIDEO_DB_POSTGRES_URL is required')
    }

    const db = new Database({
      url: config.dbPostgresUrl,
      schema: config.dbPostgresSchema,
      poolSize: config.dbPoolSize,
    })

    // Initialize video processor
    const processor = new VideoProcessor(db, {
      ffmpegPath: config.ffmpegPath,
      ffprobePath: config.ffprobePath,
      storageDir: config.storageDir,
    })

    // Initialize processing queue
    const queue = new ProcessingQueue(db, processor, {
      concurrency: config.processingConcurrency,
    })

    const ctx = new AppContext({
      cfg: config,
      db,
      processor,
      queue,
    })

    // Health check endpoint
    app.get('/xrpc/_health', (_req, res) => {
      res.status(200).json({ version: '0.0.1' })
    })

    // Create XRPC server
    let server = createServer({
      validateResponse: false,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: config.maxVideoSize, // Configurable video size limit
      },
    })

    // Register API routes
    server = API(server, ctx)

    app.use(server.xrpc.router)

    // Error handler
    app.use(
      (
        err: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        console.error('Server error:', err)
        res.status(err.status || 500).json({
          error: err.message || 'Internal Server Error',
        })
      },
    )

    return new VideoService({ ctx, app })
  }

  async start(): Promise<http.Server> {
    // Validate ffmpeg setup
    const setup = await this.ctx.processor.validateSetup()
    if (!setup.ffmpeg) {
      throw new Error('ffmpeg not found. Please install ffmpeg.')
    }
    if (!setup.ffprobe) {
      throw new Error('ffprobe not found. Please install ffmpeg.')
    }
    if (!setup.storage) {
      throw new Error(
        `Storage directory ${this.ctx.cfg.storageDir} is not writable`,
      )
    }

    // Run database migrations
    await this.ctx.db.migrateToLatestOrThrow()

    // Start processing queue
    this.ctx.queue.start()
    console.log('Video processing queue started')

    const server = this.app.listen(this.ctx.cfg.port)
    this.server = server
    server.keepAliveTimeout = 90000
    this.terminator = createHttpTerminator({ server })
    await events.once(server, 'listening')
    const { port } = server.address() as AddressInfo
    this.ctx.cfg.assignPort(port)
    return server
  }

  async destroy(): Promise<void> {
    await this.ctx.queue.stop()
    console.log('Video processing queue stopped')
    await this.terminator?.terminate()
    await this.ctx.db.close()
  }
}

export default VideoService
