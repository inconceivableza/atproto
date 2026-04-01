import { IdResolver } from '@atproto/identity'
import { WriteOpAction } from '@atproto/repo'
import { Event as FirehoseEvent, Firehose, MemoryRunner } from '@atproto/sync'
import { AtUri } from '@atproto/syntax'
import { CID } from 'multiformats/cid'
import { Database } from './db/db'
import { VideoProcessor } from './processing/processor'
import { VideoJobs } from './db/video-jobs'
import { isMain as isEmbedVideo } from './lexicon/types/app/bsky/embed/video'
import { Record as PostRecord } from './lexicon/types/app/bsky/feed/post'
import { separateEmbeds } from './util'

export class VideoSubscription {
  firehose: Firehose
  runner: MemoryRunner

  constructor(
    public opts: {
      service: string
      db: Database
      idResolver: IdResolver
      processor: VideoProcessor
      videoJobs: VideoJobs
    },
  ) {
    const { service, idResolver } = opts

    const { runner, firehose } = createFirehose({
      idResolver,
      service,
      handleVideoRecord: this.handleVideoRecord.bind(this),
    })
    this.runner = runner
    this.firehose = firehose
  }

  start() {
    this.firehose.start()
  }

  async restart() {
    await this.destroy()
    const { runner, firehose } = createFirehose({
      idResolver: this.opts.idResolver,
      service: this.opts.service,
      handleVideoRecord: this.handleVideoRecord.bind(this),
    })
    this.runner = runner
    this.firehose = firehose
    this.start()
  }

  async processAll() {
    await this.runner.processAll()
  }

  async destroy() {
    await this.firehose.destroy()
    await this.runner.destroy()
  }

  /**
   * Handle a post record that may contain a video embed
   */
  private async handleVideoRecord(
    uri: AtUri,
    cid: CID,
    record: unknown,
    action: WriteOpAction.Create | WriteOpAction.Update,
  ) {
    // Only process app.bsky.feed.post records
    if (uri.collection !== 'app.bsky.feed.post') {
      return
    }
    // TODO handle recipes, reviews
    const post = record as PostRecord
    if (!post.embed) {
      return
    }

    // Check if the post has a video embed
    const embeds = separateEmbeds(post.embed)
    for (const embed of embeds) {
      if (isEmbedVideo(embed)) {
        const { video } = embed
        const videoCid = video.ref.toString()

        console.log(
          `[VideoSubscription] Found video embed in post ${uri.toString()}: CID ${videoCid}`,
        )

        // Create a job for this video
        const jobId = videoCid // Use video CID as job ID to avoid duplicates
        const did = uri.host

        // Check if job already exists
        const existingJob = await this.opts.videoJobs.getJob(jobId)
        if (existingJob) {
          console.log(`[VideoSubscription] Job already exists for ${jobId}`)
          continue
        }

        // Create job
        await this.opts.videoJobs.createJob({
          jobId,
          did,
          videoCid,
          postUri: uri.toString(),
        })

        console.log(`[VideoSubscription] Created job ${jobId} for DID ${did}`)

        // The processing queue will pick up this job automatically
      }
    }
  }
}

const createFirehose = (opts: {
  idResolver: IdResolver
  service: string
  handleVideoRecord: (
    uri: AtUri,
    cid: CID,
    record: unknown,
    action: WriteOpAction.Create | WriteOpAction.Update,
  ) => Promise<void>
}) => {
  const { idResolver, service, handleVideoRecord } = opts
  const runner = new MemoryRunner({ startCursor: 0 })
  const firehose = new Firehose({
    idResolver,
    runner,
    service,
    unauthenticatedHandles: true,
    unauthenticatedCommits: true,
    onError: (err) => console.error('[VideoSubscription] Error:', err),
    handleEvent: async (evt: FirehoseEvent) => {
      // We only care about record create/update events
      if (evt.event === 'create' || evt.event === 'update') {
        await handleVideoRecord(
          evt.uri,
          evt.cid,
          evt.record,
          evt.event === 'create'
            ? WriteOpAction.Create
            : WriteOpAction.Update,
        )
      }
      // Ignore other event types (identity, account, sync, delete)
    },
  })
  return { firehose, runner }
}
