import { randomUUID } from 'node:crypto'
import { AtpAgent } from '@atproto/api'
import { getPds } from '@atproto/identity'
import { Server } from './lexicon'
import AppContext from './context'

export default function (server: Server, ctx: AppContext) {
  // Upload video endpoint
  // NOTE: In the standard ATProto flow, users upload videos directly to their PDS
  // via com.atproto.repo.uploadBlob, then create a post with a video embed.
  // The video service listens to the relay for these posts and processes them automatically.
  //
  // This endpoint serves as an alternative upload method where the video service
  // proxies the upload to the user's PDS on their behalf, then creates a processing job.
  // The user can then reference the returned blob in a post, which will trigger processing
  // via the relay subscription.
  server.app.bsky.video.uploadVideo({
    auth: ctx.authVerifier.user,
    handler: async ({ input, auth, req }) => {
      const did = ctx.authVerifier.parseCreds(auth)
      if (!did) {
        throw new Error('Authentication required')
      }

      // Extract the Bearer token from the request
      // We'll use this to authenticate with the user's PDS
      const authHeader = req.headers.authorization || ''
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null

      if (!token) {
        throw new Error('Bearer token required')
      }

      // Read video data from input
      const videoData =
        input.encoding === 'video/mp4' ? input.body : Buffer.from([])
      const videoBytes = videoData.length

      // Validate video size
      if (videoBytes > ctx.cfg.maxVideoSize) {
        throw new Error(
          `Video exceeds maximum size of ${ctx.cfg.maxVideoSize} bytes`,
        )
      }

      // Check upload limits
      const limitCheck = await ctx.videoUploadLimits.canUpload(
        did,
        videoBytes,
        ctx.cfg.dailyUploadLimitBytes,
        ctx.cfg.dailyUploadLimitVideos,
      )

      if (!limitCheck.canUpload) {
        throw new Error(limitCheck.reason || 'Upload limit exceeded')
      }

      // Resolve user's PDS
      const didDoc = await ctx.idResolver.did.resolve(did)
      if (!didDoc) {
        throw new Error(`Could not resolve DID: ${did}`)
      }

      const pds = getPds(didDoc)
      if (!pds) {
        throw new Error(`No PDS found for DID: ${did}`)
      }

      // Upload blob to user's PDS using their authentication token
      // The user's JWT (issued by their PDS) proves they authorized this upload
      const agent = new AtpAgent({ service: pds })

      // Set the access token so the agent authenticates as the user
      agent.api.setHeader('authorization', `Bearer ${token}`)

      // Upload the video blob to the user's PDS
      const uploadResponse = await agent.com.atproto.repo.uploadBlob(videoData, {
        encoding: input.encoding as string,
      })

      const blobRef = uploadResponse.data.blob
      const videoCid = blobRef.ref.toString()

      // Create a processing job with the video CID
      // This job will be picked up by the queue and processed
      const jobId = randomUUID()
      const job = await ctx.videoJobs.createJob({
        jobId,
        did,
        videoCid,
      })

      // Record the upload in limits
      await ctx.videoUploadLimits.recordUpload({ did, videoBytes })

      // Job will be picked up by the processing queue automatically

      return {
        encoding: 'application/json',
        body: {
          jobStatus: {
            jobId: job!.jobId,
            did: job!.did,
            state: job!.state,
            progress: job!.progress,
            blob: {
              $type: 'blob',
              ref: { $link: videoCid },
              mimeType: input.encoding as string,
              size: videoBytes,
            },
            error: job!.error,
            message: undefined,
          },
        },
      }
    },
  })

  // Get job status endpoint
  server.app.bsky.video.getJobStatus({
    auth: ctx.authVerifier.user,
    handler: async ({ params, auth }) => {
      const did = ctx.authVerifier.parseCreds(auth)
      if (!did) {
        throw new Error('Authentication required')
      }

      const { jobId } = params

      const job = await ctx.videoJobs.getJob(jobId)

      if (!job) {
        throw new Error('Job not found')
      }

      // Verify the job belongs to the authenticated user
      if (job.did !== did) {
        throw new Error('Forbidden: job does not belong to authenticated user')
      }

      return {
        encoding: 'application/json',
        body: {
          jobStatus: {
            jobId: job.jobId,
            did: job.did,
            state: job.state,
            progress: job.progress,
            blob: job.blobCid
              ? {
                  $type: 'blob',
                  ref: { $link: job.blobCid },
                  mimeType: 'video/mp4',
                  size: 0,
                }
              : undefined,
            error: job.error,
            message: undefined,
          },
        },
      }
    },
  })

  // Get upload limits endpoint
  server.app.bsky.video.getUploadLimits({
    auth: ctx.authVerifier.user,
    handler: async ({ auth }) => {
      const did = ctx.authVerifier.parseCreds(auth)
      if (!did) {
        throw new Error('Authentication required')
      }

      const stats = await ctx.videoUploadLimits.getUploadStats(did)
      const remainingBytes = Math.max(
        0,
        ctx.cfg.dailyUploadLimitBytes - stats.uploadedBytes,
      )
      const remainingVideos = Math.max(
        0,
        ctx.cfg.dailyUploadLimitVideos - stats.uploadedVideos,
      )

      return {
        encoding: 'application/json',
        body: {
          canUpload: remainingVideos > 0 && remainingBytes > 0,
          remainingDailyVideos: remainingVideos,
          remainingDailyBytes: remainingBytes,
          message: undefined,
          error: undefined,
        },
      }
    },
  })

  return server
}
