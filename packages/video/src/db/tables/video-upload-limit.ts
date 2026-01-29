export const tableName = 'video_upload_limit'

export interface VideoUploadLimit {
  did: string
  date: string // YYYY-MM-DD format
  uploadedBytes: string // bigint is returned as string from PostgreSQL
  uploadedVideos: number
}

export type PartialDB = { [tableName]: VideoUploadLimit }
