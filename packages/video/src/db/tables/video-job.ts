export const tableName = 'video_job'

export interface VideoJob {
  jobId: string
  did: string
  state: string // JOB_STATE_CREATED, JOB_STATE_PROCESSING, JOB_STATE_COMPLETED, JOB_STATE_FAILED
  blobCid: string | null
  videoCid: string | null // Original video blob CID from PDS
  postUri: string | null // URI of the post containing the video embed
  error: string | null
  progress: number | null
  createdAt: string
  updatedAt: string
}

export type PartialDB = { [tableName]: VideoJob }
