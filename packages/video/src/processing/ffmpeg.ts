import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface VideoInfo {
  duration: number
  width: number
  height: number
  bitrate: number
  codec: string
  fps: number
}

export interface ConversionProgress {
  percent: number
  currentTime: number
  fps: number
  speed: number
}

export interface ConversionOptions {
  inputPath: string
  outputDir: string
  onProgress?: (progress: ConversionProgress) => void
}

export class FFmpegProcessor {
  private ffmpegPath: string
  private ffprobePath: string

  constructor(ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe') {
    this.ffmpegPath = ffmpegPath
    this.ffprobePath = ffprobePath
  }

  /**
   * Get video information using ffprobe
   */
  async getVideoInfo(videoPath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,duration,bit_rate,codec_name,r_frame_rate',
        '-of',
        'json',
        videoPath,
      ]

      const proc = spawn(this.ffprobePath, args)
      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe failed: ${stderr}`))
          return
        }

        try {
          const data = JSON.parse(stdout)
          const stream = data.streams[0]

          if (!stream) {
            reject(new Error('No video stream found'))
            return
          }

          // Parse frame rate (could be like "30/1")
          const [fpsNum, fpsDen] = stream.r_frame_rate.split('/').map(Number)
          const fps = fpsDen ? fpsNum / fpsDen : fpsNum

          resolve({
            duration: parseFloat(stream.duration) || 0,
            width: stream.width,
            height: stream.height,
            bitrate: parseInt(stream.bit_rate) || 0,
            codec: stream.codec_name,
            fps,
          })
        } catch (err) {
          reject(new Error(`Failed to parse ffprobe output: ${err}`))
        }
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn ffprobe: ${err}`))
      })
    })
  }

  /**
   * Convert video to HLS format with multiple quality levels
   */
  async convertToHLS(options: ConversionOptions): Promise<void> {
    const { inputPath, outputDir, onProgress } = options

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    // Get video info for progress calculation
    const videoInfo = await this.getVideoInfo(inputPath)
    const masterPlaylistPath = path.join(outputDir, 'playlist.m3u8')

    return new Promise((resolve, reject) => {
      // Build ffmpeg command for HLS conversion with multiple quality variants
      const args = [
        '-i',
        inputPath,
        // Video codec settings
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        // Audio codec settings
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ac',
        '2',
        // Create multiple quality variants
        '-map',
        '0:v:0',
        '-map',
        '0:a:0',
        '-map',
        '0:v:0',
        '-map',
        '0:a:0',
        '-map',
        '0:v:0',
        '-map',
        '0:a:0',
        // Quality variants
        '-b:v:0',
        '4000k',
        '-maxrate:v:0',
        '4280k',
        '-bufsize:v:0',
        '8560k',
        '-s:v:0',
        '1920x1080',
        '-b:v:1',
        '2000k',
        '-maxrate:v:1',
        '2140k',
        '-bufsize:v:1',
        '4280k',
        '-s:v:1',
        '1280x720',
        '-b:v:2',
        '800k',
        '-maxrate:v:2',
        '856k',
        '-bufsize:v:2',
        '1712k',
        '-s:v:2',
        '854x480',
        // HLS settings
        '-f',
        'hls',
        '-hls_time',
        '6',
        '-hls_playlist_type',
        'vod',
        '-hls_segment_filename',
        path.join(outputDir, 'segment_%v_%03d.ts'),
        '-master_pl_name',
        'playlist.m3u8',
        '-var_stream_map',
        'v:0,a:0 v:1,a:1 v:2,a:2',
        path.join(outputDir, 'stream_%v.m3u8'),
      ]

      const proc = spawn(this.ffmpegPath, args)
      let stderr = ''

      proc.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output

        // Parse progress from ffmpeg output
        if (onProgress && videoInfo.duration > 0) {
          const timeMatch = output.match(/time=(\d+):(\d+):(\d+\.\d+)/)
          const fpsMatch = output.match(/fps=\s*(\d+\.?\d*)/)
          const speedMatch = output.match(/speed=\s*(\d+\.?\d*)x/)

          if (timeMatch) {
            const hours = parseInt(timeMatch[1])
            const minutes = parseInt(timeMatch[2])
            const seconds = parseFloat(timeMatch[3])
            const currentTime = hours * 3600 + minutes * 60 + seconds
            const percent = Math.min(
              (currentTime / videoInfo.duration) * 100,
              100,
            )

            onProgress({
              percent: Math.round(percent),
              currentTime,
              fps: fpsMatch ? parseFloat(fpsMatch[1]) : 0,
              speed: speedMatch ? parseFloat(speedMatch[1]) : 0,
            })
          }
        }
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`))
          return
        }
        resolve()
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn ffmpeg: ${err}`))
      })
    })
  }

  /**
   * Generate a thumbnail from the video
   */
  async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timeOffset = 1,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i',
        videoPath,
        '-ss',
        timeOffset.toString(),
        '-vframes',
        '1',
        '-vf',
        'scale=1280:720:force_original_aspect_ratio=decrease',
        '-q:v',
        '2',
        outputPath,
      ]

      const proc = spawn(this.ffmpegPath, args)
      let stderr = ''

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg thumbnail generation failed: ${stderr}`))
          return
        }
        resolve()
      })

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn ffmpeg: ${err}`))
      })
    })
  }

  /**
   * Validate that ffmpeg is available
   */
  async validateFFmpeg(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.ffmpegPath, ['-version'])

      proc.on('close', (code) => {
        resolve(code === 0)
      })

      proc.on('error', () => {
        resolve(false)
      })
    })
  }

  /**
   * Validate that ffprobe is available
   */
  async validateFFprobe(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.ffprobePath, ['-version'])

      proc.on('close', (code) => {
        resolve(code === 0)
      })

      proc.on('error', () => {
        resolve(false)
      })
    })
  }
}
