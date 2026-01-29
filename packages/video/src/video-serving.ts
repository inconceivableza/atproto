import { Request, Response, NextFunction } from 'express'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import AppContext from './context'

/**
 * Middleware to serve processed video files (HLS playlists, segments, thumbnails)
 *
 * URLs use videoCid (which is the same as jobId in our implementation)
 * for content-addressed serving.
 */
export const createVideoServingRoutes = (ctx: AppContext) => {
  /**
   * Serve HLS master playlist
   * GET /video/:jobId/playlist.m3u8
   *
   * Note: jobId is the videoCid (content-addressed identifier)
   */
  const servePlaylist = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { jobId } = req.params

      // Verify job exists and is completed
      const job = await ctx.videoJobs.getJob(jobId)
      if (!job) {
        return res.status(404).json({ error: 'Job not found' })
      }

      if (job.state !== 'JOB_STATE_COMPLETED') {
        return res.status(404).json({ error: 'Video not ready yet' })
      }

      // Serve the master playlist
      const playlistPath = path.join(
        ctx.processor.getJobStoragePath(jobId),
        'playlist.m3u8',
      )

      const playlistContent = await fs.readFile(playlistPath, 'utf8')
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
      res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
      res.send(playlistContent)
    } catch (error) {
      console.error('Error serving playlist:', error)
      next(error)
    }
  }

  /**
   * Serve HLS segment files
   * GET /video/:jobId/:filename
   *
   * Note: jobId is the videoCid (content-addressed identifier)
   */
  const serveSegment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { jobId, filename } = req.params

      // Verify job exists and is completed
      const job = await ctx.videoJobs.getJob(jobId)
      if (!job) {
        return res.status(404).json({ error: 'Job not found' })
      }

      if (job.state !== 'JOB_STATE_COMPLETED') {
        return res.status(404).json({ error: 'Video not ready yet' })
      }

      // Security: Only allow specific file extensions
      const allowedExtensions = ['.m3u8', '.ts', '.jpg', '.jpeg']
      const ext = path.extname(filename).toLowerCase()
      if (!allowedExtensions.includes(ext)) {
        return res.status(403).json({ error: 'Forbidden file type' })
      }

      // Security: Prevent path traversal
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(403).json({ error: 'Invalid filename' })
      }

      const filePath = path.join(
        ctx.processor.getJobStoragePath(jobId),
        filename,
      )

      // Check if file exists
      try {
        await fs.access(filePath)
      } catch {
        return res.status(404).json({ error: 'File not found' })
      }

      // Set appropriate content type
      let contentType = 'application/octet-stream'
      if (ext === '.m3u8') {
        contentType = 'application/vnd.apple.mpegurl'
      } else if (ext === '.ts') {
        contentType = 'video/mp2t'
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg'
      }

      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year

      // Stream the file
      const fileStream = require('fs').createReadStream(filePath)
      fileStream.pipe(res)

      fileStream.on('error', (err: Error) => {
        console.error('Error streaming file:', err)
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' })
        }
      })
    } catch (error) {
      console.error('Error serving segment:', error)
      next(error)
    }
  }

  /**
   * Serve video thumbnail
   * GET /video/:jobId/thumbnail.jpg
   *
   * Note: jobId is the videoCid (content-addressed identifier)
   */
  const serveThumbnail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { jobId } = req.params

      // Verify job exists and is completed
      const job = await ctx.videoJobs.getJob(jobId)
      if (!job) {
        return res.status(404).json({ error: 'Job not found' })
      }

      if (job.state !== 'JOB_STATE_COMPLETED') {
        return res.status(404).json({ error: 'Thumbnail not ready yet' })
      }

      const thumbnailPath = path.join(
        ctx.processor.getJobStoragePath(jobId),
        'thumbnail.jpg',
      )

      // Check if thumbnail exists
      try {
        await fs.access(thumbnailPath)
      } catch {
        return res.status(404).json({ error: 'Thumbnail not found' })
      }

      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year

      // Stream the thumbnail
      const fileStream = require('fs').createReadStream(thumbnailPath)
      fileStream.pipe(res)

      fileStream.on('error', (err: Error) => {
        console.error('Error streaming thumbnail:', err)
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming thumbnail' })
        }
      })
    } catch (error) {
      console.error('Error serving thumbnail:', error)
      next(error)
    }
  }

  return {
    servePlaylist,
    serveSegment,
    serveThumbnail,
  }
}
