import { Kysely, Migration } from 'kysely'

const initial: Migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // video_job table
    await db.schema
      .createTable('video_job')
      .addColumn('jobId', 'varchar', (col) => col.primaryKey())
      .addColumn('did', 'varchar', (col) => col.notNull())
      .addColumn('state', 'varchar', (col) => col.notNull())
      .addColumn('blobCid', 'varchar')
      .addColumn('error', 'text')
      .addColumn('progress', 'integer')
      .addColumn('createdAt', 'varchar', (col) => col.notNull())
      .addColumn('updatedAt', 'varchar', (col) => col.notNull())
      .execute()

    // Index for querying jobs by DID
    await db.schema
      .createIndex('video_job_did_idx')
      .on('video_job')
      .column('did')
      .execute()

    // Index for querying jobs by state
    await db.schema
      .createIndex('video_job_state_idx')
      .on('video_job')
      .column('state')
      .execute()

    // video_upload_limit table
    await db.schema
      .createTable('video_upload_limit')
      .addColumn('did', 'varchar', (col) => col.notNull())
      .addColumn('date', 'varchar', (col) => col.notNull())
      .addColumn('uploadedBytes', 'bigint', (col) => col.notNull().defaultTo(0))
      .addColumn('uploadedVideos', 'integer', (col) =>
        col.notNull().defaultTo(0),
      )
      .addPrimaryKeyConstraint('video_upload_limit_pkey', ['did', 'date'])
      .execute()

    // Index for querying limits by date
    await db.schema
      .createIndex('video_upload_limit_date_idx')
      .on('video_upload_limit')
      .column('date')
      .execute()
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('video_upload_limit').execute()
    await db.schema.dropTable('video_job').execute()
  },
}

export default {
  '20260129T000000000Z-init': initial,
}
