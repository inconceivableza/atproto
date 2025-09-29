import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { AppContext } from '../context'

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
    const envContent = loadEnvContent()
    res.json(envContent)
  })

  return router
}

function loadEnvContent(): Record<string, any> {
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
        const data = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(data)
      }
    } catch (err) {
      console.warn(`Failed to load env-content from ${filename}:`, err)
      continue
    }
  }

  // Return default empty structure if no files found
  return {
    atproto_accounts: {
      follow: {},
    },
  }
}
