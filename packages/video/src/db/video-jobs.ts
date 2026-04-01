import { Database } from './db'
import { now } from './util'

export interface CreateJobParams {
  jobId: string
  did: string
  videoCid?: string
  postUri?: string
}

export interface UpdateJobParams {
  state?: string
  blobCid?: string
  error?: string
  progress?: number
}

export class VideoJobs {
  constructor(private db: Database) {}

  async createJob(params: CreateJobParams) {
    const { jobId, did, videoCid, postUri } = params
    const timestamp = now()

    await this.db.db
      .insertInto('video_job')
      .values({
        jobId,
        did,
        state: 'JOB_STATE_CREATED',
        blobCid: null,
        videoCid: videoCid || null,
        postUri: postUri || null,
        error: null,
        progress: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .execute()

    return this.getJob(jobId)
  }

  async getJob(jobId: string) {
    return await this.db.db
      .selectFrom('video_job')
      .selectAll()
      .where('jobId', '=', jobId)
      .executeTakeFirst()
  }

  async updateJob(jobId: string, params: UpdateJobParams) {
    const { state, blobCid, error, progress } = params
    const timestamp = now()

    const update: any = {
      updatedAt: timestamp,
    }

    if (state !== undefined) update.state = state
    if (blobCid !== undefined) update.blobCid = blobCid
    if (error !== undefined) update.error = error
    if (progress !== undefined) update.progress = progress

    await this.db.db
      .updateTable('video_job')
      .set(update)
      .where('jobId', '=', jobId)
      .execute()

    return this.getJob(jobId)
  }

  async getJobsByDid(did: string, limit = 50) {
    return await this.db.db
      .selectFrom('video_job')
      .selectAll()
      .where('did', '=', did)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .execute()
  }

  async getJobsByState(state: string, limit = 100) {
    return await this.db.db
      .selectFrom('video_job')
      .selectAll()
      .where('state', '=', state)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .execute()
  }

  async deleteJob(jobId: string) {
    await this.db.db
      .deleteFrom('video_job')
      .where('jobId', '=', jobId)
      .execute()
  }
}
