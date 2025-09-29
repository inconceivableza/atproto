import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { AppContext } from '../context'

// Env-content cache state
interface EnvContentCache {
  content: Record<string, any>
  filePath: string | null
  lastModified: number
  watchingFile: boolean
}

let envContentCache: EnvContentCache | null = null

export const createRouter = (ctx: AppContext): Router => {
  const router = Router()

  const did = ctx.cfg.serverDid
  if (did.startsWith('did:web:')) {
    const hostname = did.slice('did:web:'.length)
    const serviceEndpoint = `https://${hostname}`

    router.get('/.well-known/did.json', (_req, res) => {
      res.json({
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/multikey/v1',
        ],
        id: did,
        verificationMethod: [
          {
            id: `${did}#atproto`,
            type: 'Multikey',
            controller: did,
            publicKeyMultibase: ctx.signingKey.did().replace('did:key:', ''),
          },
        ],
        service: [
          {
            id: '#bsky_notif',
            type: 'BskyNotificationService',
            serviceEndpoint,
          },
          {
            id: '#bsky_appview',
            type: 'BskyAppView',
            serviceEndpoint,
          },
        ],
      })
    })
  }

  // Env-content endpoint for appview configuration
  router.get('/.well-known/atproto-appview-env-content', (_req, res) => {
    const envContent = getCachedEnvContent()
    res.json(envContent)
  })

  return router
}

function findEnvContentFile(): string | null {
  // Check for custom file first
  const customFile = process.env.APPVIEW_ENV_CONTENT_FILE
  let filenames: string[]

  if (customFile) {
    filenames = [customFile]
  } else {
    // Fall back to standard files in order: production -> test -> development
    filenames = [
      'env-content.production.json',
      'env-content.test.json',
      'env-content.json',
    ]
  }

  for (const filename of filenames) {
    try {
      const filePath = path.resolve(filename)
      if (fs.existsSync(filePath)) {
        return filePath
      }
    } catch (err) {
      console.warn(`Failed to access env-content file ${filename}:`, err)
      continue
    }
  }

  return null
}

function loadEnvContentFromFile(filePath: string): Record<string, any> {
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    console.warn(`Failed to load env-content from ${filePath}:`, err)
    throw err
  }
}

function getDefaultEnvContent(): Record<string, any> {
  return {
    atproto_accounts: {
      follow: {},
    },
  }
}

function initializeEnvContentCache(): void {
  if (envContentCache && envContentCache.watchingFile && envContentCache.filePath) {
    // Clean up existing watcher
    fs.unwatchFile(envContentCache.filePath)
  }

  const filePath = findEnvContentFile()

  if (!filePath) {
    console.log('No env-content file found, using default empty structure')
    envContentCache = {
      content: getDefaultEnvContent(),
      filePath: null,
      lastModified: 0,
      watchingFile: false
    }
    return
  }

  try {
    const stats = fs.statSync(filePath)
    const content = loadEnvContentFromFile(filePath)

    console.log(`Loaded env-content from ${filePath}`)

    envContentCache = {
      content,
      filePath,
      lastModified: stats.mtime.getTime(),
      watchingFile: false
    }

    // Set up file watcher for automatic reloading
    try {
      fs.watchFile(filePath, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          console.log(`Env-content file ${filePath} changed, reloading...`)
          reloadEnvContent()
        }
      })
      envContentCache.watchingFile = true
    } catch (watchErr) {
      console.warn(`Failed to set up file watcher for ${filePath}:`, watchErr)
    }

  } catch (err) {
    console.warn(`Failed to initialize env-content from ${filePath}:`, err)
    envContentCache = {
      content: getDefaultEnvContent(),
      filePath: null,
      lastModified: 0,
      watchingFile: false
    }
  }
}

function reloadEnvContent(): void {
  if (!envContentCache || !envContentCache.filePath) {
    return
  }

  try {
    const stats = fs.statSync(envContentCache.filePath)

    // Only reload if file was actually modified
    if (stats.mtime.getTime() <= envContentCache.lastModified) {
      return
    }

    const content = loadEnvContentFromFile(envContentCache.filePath)
    envContentCache.content = content
    envContentCache.lastModified = stats.mtime.getTime()

    console.log(`Reloaded env-content from ${envContentCache.filePath}`)
  } catch (err) {
    console.warn(`Failed to reload env-content from ${envContentCache.filePath}:`, err)
  }
}

function getCachedEnvContent(): Record<string, any> {
  if (!envContentCache) {
    initializeEnvContentCache()
  }

  return envContentCache!.content
}
