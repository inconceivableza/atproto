import { sql } from 'kysely'
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

    if (record) {
      // Convert bigint string to number
      return {
        did: record.did,
        date: record.date,
        uploadedBytes: parseInt(record.uploadedBytes, 10),
        uploadedVideos: record.uploadedVideos,
      }
    }

    return {
      did,
      date: targetDate,
      uploadedBytes: 0,
      uploadedVideos: 0,
    }
  }

  async recordUpload(params: RecordUploadParams) {
    const { did, videoBytes } = params
    const date = today()
    // TODO ensure this will work with concurrent uploads (maybe it needs to be calculated based on what's in the job queue)
    // Also check that the right thing happens if an uplaod fails
    // Try to update existing record
    const updated = await this.db.db
      .updateTable('video_upload_limit')
      .set({
        uploadedBytes: sql`uploaded_bytes + ${videoBytes}`,
        uploadedVideos: sql`uploaded_videos + 1`,
      })
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
          uploadedBytes: videoBytes.toString(),
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
