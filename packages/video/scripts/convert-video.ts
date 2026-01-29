#!/usr/bin/env node
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { FFmpegProcessor } from '../src/processing/ffmpeg'

/**
 * CLI tool to convert a video file to HLS format
 * Usage: npm run convert-video <input-file> [output-dir]
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Usage: npm run convert-video <input-file> [output-dir]')
    console.error('')
    console.error('Example:')
    console.error('  npm run convert-video video.mp4')
    console.error('  npm run convert-video video.mp4 ./output')
    process.exit(1)
  }

  const inputPath = path.resolve(args[0])
  const outputDir = args[1] ? path.resolve(args[1]) : path.join(path.dirname(inputPath), 'hls-output')

  // Check if input file exists
  try {
    await fs.access(inputPath)
  } catch {
    console.error(`Error: Input file not found: ${inputPath}`)
    process.exit(1)
  }

  console.log('Video conversion tool')
  console.log('====================')
  console.log(`Input:  ${inputPath}`)
  console.log(`Output: ${outputDir}`)
  console.log('')

  const ffmpeg = new FFmpegProcessor()

  // Validate ffmpeg installation
  console.log('Checking ffmpeg installation...')
  const ffmpegValid = await ffmpeg.validateFFmpeg()
  const ffprobeValid = await ffmpeg.validateFFprobe()

  if (!ffmpegValid) {
    console.error('Error: ffmpeg not found. Please install ffmpeg.')
    process.exit(1)
  }

  if (!ffprobeValid) {
    console.error('Error: ffprobe not found. Please install ffmpeg.')
    process.exit(1)
  }

  console.log('✓ ffmpeg is installed')
  console.log('')

  // Get video info
  console.log('Analyzing video...')
  try {
    const videoInfo = await ffmpeg.getVideoInfo(inputPath)
    console.log(`Duration: ${videoInfo.duration.toFixed(2)}s`)
    console.log(`Resolution: ${videoInfo.width}x${videoInfo.height}`)
    console.log(`Bitrate: ${(videoInfo.bitrate / 1000).toFixed(0)} kbps`)
    console.log(`Codec: ${videoInfo.codec}`)
    console.log(`FPS: ${videoInfo.fps}`)
    console.log('')
  } catch (error) {
    console.error(`Error analyzing video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true })

  // Convert to HLS
  console.log('Converting to HLS format...')
  console.log('Generating quality variants: 1080p, 720p, 480p')
  console.log('')

  let lastProgress = 0
  try {
    await ffmpeg.convertToHLS({
      inputPath,
      outputDir,
      onProgress: async (progress) => {
        if (progress.percent >= lastProgress + 5 || progress.percent === 100) {
          console.log(`Progress: ${progress.percent}%`)
          lastProgress = progress.percent
        }
      },
    })
  } catch (error) {
    console.error(`Error converting video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }

  console.log('')
  console.log('✓ HLS conversion complete')

  // Generate thumbnail
  console.log('')
  console.log('Generating thumbnail...')
  const thumbnailPath = path.join(outputDir, 'thumbnail.jpg')
  try {
    await ffmpeg.generateThumbnail(inputPath, thumbnailPath, 1)
    console.log('✓ Thumbnail generated')
  } catch (error) {
    console.error(`Error generating thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  console.log('')
  console.log('Conversion complete!')
  console.log('==================')
  console.log(`Output directory: ${outputDir}`)
  console.log(`Master playlist: ${path.join(outputDir, 'playlist.m3u8')}`)
  console.log(`Thumbnail: ${thumbnailPath}`)
  console.log('')
  console.log('To test playback, you can use a video player that supports HLS:')
  console.log(`  ffplay ${path.join(outputDir, 'playlist.m3u8')}`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
