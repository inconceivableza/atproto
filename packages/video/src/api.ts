import { randomUUID } from 'node:crypto'
import { Server } from './lexicon'
import AppContext from './context'

export default function (server: Server, ctx: AppContext) {
  // Upload video endpoint
  server.app.bsky.video.uploadVideo({
    auth: ctx.authVerifier.user,
    handler: async ({ input, auth }) => {
      const did = ctx.authVerifier.parseCreds(auth)
      if (!did) {
        throw new Error('Authentication required')
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

      // Create a new job
      const jobId = randomUUID()
      const job = await ctx.videoJobs.createJob({ jobId, did })

      // Store uploaded video file
      await ctx.processor.storeUploadedVideo(jobId, videoData)

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
            blob: job!.blobCid
              ? {
                  $type: 'blob',
                  ref: { $link: job!.blobCid },
                  mimeType: 'video/mp4',
                  size: 0,
                }
              : undefined,
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
