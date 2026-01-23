import { Router } from 'express'
import { AppContext } from '../context'

export const createRouter = (ctx: AppContext): Router => {
  const router = Router()

  router.get('/.well-known/did.json', (_req, res) => {
    const hostname =
      ctx.cfg.service.publicUrl && new URL(ctx.cfg.service.publicUrl).hostname
    if (!hostname || ctx.cfg.service.did !== `did:web:${hostname}`) {
      return res.sendStatus(404)
    }
    res.json({
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/multikey/v1',
      ],
      id: ctx.cfg.service.did,
      verificationMethod: [
        {
          id: `${ctx.cfg.service.did}#atproto_label`,
          type: 'Multikey',
          controller: ctx.cfg.service.did,
          publicKeyMultibase: ctx.signingKey.did().replace('did:key:', ''),
        },
      ].concat(ctx.cfg.pds?.ozoneAccountPublicKey ? [
        {
          id: `${ctx.cfg.service.did}#atproto`,
          type: 'Multikey',
          controller: ctx.cfg.service.did,
          publicKeyMultibase: ctx.cfg.pds.ozoneAccountPublicKey,
        }
      ] : []),
      service: [
        {
          id: '#atproto_labeler',
          type: 'AtprotoLabeler',
          serviceEndpoint: `https://${hostname}`,
        },
      ].concat(ctx.cfg.pds?.url ? [
        {
          id: '#atproto_pds',
          type: 'AtprotoPersonalDataServer',
          serviceEndpoint: ctx.cfg.pds?.url,
        },
      ] : []),
      ...(ctx.cfg.service.did == `did:web:${hostname}` ? {
        alsoKnownAs: [`at://${hostname}`]
      } : {})
    })
  })

  router.get('/.well-known/atproto-did', (_req, res) => {
    const hostname =
      ctx.cfg.service.publicUrl && new URL(ctx.cfg.service.publicUrl).hostname
    if (!hostname || ctx.cfg.service.did !== `did:web:${hostname}`) {
      return res.sendStatus(404)
    }
    return res.send(ctx.cfg.service.did)
  })

  router.get('/.well-known/ozone-metadata.json', (_req, res) => {
    return res.json({
      did: ctx.cfg.service.did,
      url: ctx.cfg.service.publicUrl,
      publicKey: ctx.signingKey.did(),
    })
  })

  return router
}
