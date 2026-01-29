import { Database } from './db'
import { today } from './util'

export interface RecordUploadParams {
  did: string
  videoBytes: number
}

export class VideoUploadLimits {
  constructor(private db: Database) {}

  async getUploadStats(did: string, date?: string) {
    const targetDate = date || today()

    const record = await this.db.db
      .selectFrom('video_upload_limit')
      .selectAll()
      .where('did', '=', did)
      .where('date', '=', targetDate)
      .executeTakeFirst()

    return (
      record || {
        did,
        date: targetDate,
        uploadedBytes: 0,
        uploadedVideos: 0,
      }
    )
  }

  async recordUpload(params: RecordUploadParams) {
    const { did, videoBytes } = params
    const date = today()

    // Try to update existing record
    const updated = await this.db.db
      .updateTable('video_upload_limit')
      .set((eb) => ({
        uploadedBytes: eb('uploadedBytes', '+', videoBytes),
        uploadedVideos: eb('uploadedVideos', '+', 1),
      }))
      .where('did', '=', did)
      .where('date', '=', date)
      .execute()

    // If no record exists, insert one
    if (updated.length === 0) {
      await this.db.db
        .insertInto('video_upload_limit')
        .values({
          did,
          date,
          uploadedBytes: videoBytes,
          uploadedVideos: 1,
        })
        .execute()
    }

    return this.getUploadStats(did, date)
  }

  async canUpload(
    did: string,
    videoBytes: number,
    dailyBytesLimit: number,
    dailyVideosLimit: number,
  ): Promise<{ canUpload: boolean; reason?: string }> {
    const stats = await this.getUploadStats(did)

    if (stats.uploadedVideos >= dailyVideosLimit) {
      return {
        canUpload: false,
        reason: 'User has exceeded daily upload videos limit',
      }
    }

    if (stats.uploadedBytes + videoBytes > dailyBytesLimit) {
      return {
        canUpload: false,
        reason: 'User has exceeded daily upload bytes limit',
      }
    }

    return { canUpload: true }
  }

  async cleanupOldRecords(daysToKeep = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    await this.db.db
      .deleteFrom('video_upload_limit')
      .where('date', '<', cutoffDateStr)
      .execute()
  }
}
