export const tableName = 'video_upload_limit'

export interface VideoUploadLimit {
  did: string
  date: string // YYYY-MM-DD format
  uploadedBytes: number
  uploadedVideos: number
}

export type PartialDB = { [tableName]: VideoUploadLimit }
