/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  AppBskyVideoDefs: {
    lexicon: 1,
    id: 'app.bsky.video.defs',
    defs: {
      jobStatus: {
        type: 'object',
        required: ['jobId', 'did', 'state'],
        properties: {
          jobId: {
            type: 'string',
          },
          did: {
            type: 'string',
            format: 'did',
          },
          state: {
            type: 'string',
            description:
              'The state of the video processing job. All values not listed as a known value indicate that the job is in process.',
            knownValues: ['JOB_STATE_COMPLETED', 'JOB_STATE_FAILED'],
          },
          progress: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: 'Progress within the current processing state.',
          },
          blob: {
            type: 'blob',
          },
          error: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
        },
      },
    },
  },
  AppBskyVideoGetJobStatus: {
    lexicon: 1,
    id: 'app.bsky.video.getJobStatus',
    defs: {
      main: {
        type: 'query',
        description: 'Get status details for a video processing job.',
        parameters: {
          type: 'params',
          required: ['jobId'],
          properties: {
            jobId: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['jobStatus'],
            properties: {
              jobStatus: {
                type: 'ref',
                ref: 'lex:app.bsky.video.defs#jobStatus',
              },
            },
          },
        },
      },
    },
  },
  AppBskyVideoGetUploadLimits: {
    lexicon: 1,
    id: 'app.bsky.video.getUploadLimits',
    defs: {
      main: {
        type: 'query',
        description: 'Get video upload limits for the authenticated user.',
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['canUpload'],
            properties: {
              canUpload: {
                type: 'boolean',
              },
              remainingDailyVideos: {
                type: 'integer',
              },
              remainingDailyBytes: {
                type: 'integer',
              },
              message: {
                type: 'string',
              },
              error: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  },
  AppBskyVideoUploadVideo: {
    lexicon: 1,
    id: 'app.bsky.video.uploadVideo',
    defs: {
      main: {
        type: 'procedure',
        description: 'Upload a video to be processed then stored on the PDS.',
        input: {
          encoding: 'video/mp4',
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['jobStatus'],
            properties: {
              jobStatus: {
                type: 'ref',
                ref: 'lex:app.bsky.video.defs#jobStatus',
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  AppBskyVideoDefs: 'app.bsky.video.defs',
  AppBskyVideoGetJobStatus: 'app.bsky.video.getJobStatus',
  AppBskyVideoGetUploadLimits: 'app.bsky.video.getUploadLimits',
  AppBskyVideoUploadVideo: 'app.bsky.video.uploadVideo',
} as const
