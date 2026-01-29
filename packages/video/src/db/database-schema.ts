import { Kysely } from 'kysely'
import * as videoJob from './tables/video-job'
import * as videoUploadLimit from './tables/video-upload-limit'

export type DatabaseSchemaType = videoJob.PartialDB &
  videoUploadLimit.PartialDB

export type DatabaseSchema = Kysely<DatabaseSchemaType>
