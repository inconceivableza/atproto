import { Server } from './lexicon'
import AppContext from './context'

export default function (server: Server, ctx: AppContext) {
  // Upload video endpoint
  server.app.bsky.video.uploadVideo({
    // TODO: Add auth verifier function here
    handler: async ({ input, req }) => {
      // TODO: Implement video upload logic
      // 1. Validate user permissions and limits
      // 2. Store video blob
      // 3. Create processing job
      // 4. Return job status

      throw new Error('Not implemented: uploadVideo')
    },
  })

  // Get job status endpoint
  server.app.bsky.video.getJobStatus({
    // TODO: Add auth verifier function here
    handler: async ({ params }) => {
      const { jobId } = params

      // TODO: Implement job status lookup
      // 1. Query job database
      // 2. Return current status

      throw new Error('Not implemented: getJobStatus')
    },
  })

  // Get upload limits endpoint
  server.app.bsky.video.getUploadLimits({
    // TODO: Add auth verifier function here
    handler: async ({ req }) => {
      // TODO: Implement upload limits check
      // 1. Get user from auth token
      // 2. Check current usage
      // 3. Calculate remaining limits
      // 4. Return limits object

      throw new Error('Not implemented: getUploadLimits')
    },
  })

  return server
}
