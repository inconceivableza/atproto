import express from 'express'
import * as jose from 'jose'
import { IdResolver } from '@atproto/identity'
import {
  AuthRequiredError,
  verifyJwt as verifyServiceJwt,
  parseReqNsid,
} from '@atproto/xrpc-server'

export type ReqCtx = {
  req: express.Request
}

export type AuthOutput = {
  credentials: {
    type: 'user'
    did: string
    aud: string
  }
}

export type NullOutput = {
  credentials: {
    type: 'none'
    did: null
  }
}

export type AuthVerifierOpts = {
  serviceDid: string
  adminPass?: string
}

export class AuthVerifier {
  public serviceDid: string
  private adminPass?: string

  constructor(
    public idResolver: IdResolver,
    opts: AuthVerifierOpts,
  ) {
    this.serviceDid = opts.serviceDid
    this.adminPass = opts.adminPass
  }

  /**
   * Verify a user's service JWT token (required)
   * Use this in the auth field of handlers
   */
  user = async (ctx: ReqCtx): Promise<AuthOutput> => {
    const output = await this.userOptional(ctx)
    if (output.credentials.type === 'none') {
      throw new AuthRequiredError(undefined, 'AuthMissing')
    }
    return output as AuthOutput
  }

  /**
   * Optionally verify a user's service JWT token
   * Use this in the auth field of handlers that support optional auth
   */
  userOptional = async (ctx: ReqCtx): Promise<AuthOutput | NullOutput> => {
    if (!isBearerToken(ctx.req)) {
      return this.nullCreds()
    }

    const token = bearerTokenFromReq(ctx.req)
    if (!token) {
      throw new AuthRequiredError('missing jwt', 'MissingJwt')
    }

    // Get signing key for the issuer
    const getSigningKey = async (
      iss: string,
      _forceRefresh: boolean,
    ): Promise<string> => {
      try {
        // Resolve the DID to get the signing key
        const didDoc = await this.idResolver.did.resolve(iss)
        if (!didDoc) {
          throw new AuthRequiredError('identity unknown')
        }

        // Get the atproto signing key
        const signingKey = didDoc.verificationMethod?.find(
          (vm) =>
            vm.id === `${iss}#atproto` ||
            vm.controller === iss ||
            vm.id.includes('atproto'),
        )

        if (!signingKey || !signingKey.publicKeyMultibase) {
          throw new AuthRequiredError('missing or bad signing key')
        }

        // Convert multibase key to did:key format
        const didKey = `did:key:${signingKey.publicKeyMultibase}`
        return didKey
      } catch (err) {
        if (err instanceof AuthRequiredError) {
          throw err
        }
        throw new AuthRequiredError(
          `Failed to resolve identity: ${err instanceof Error ? err.message : 'unknown error'}`,
        )
      }
    }

    // Verify the JWT
    const payload = await verifyServiceJwt(
      token,
      this.serviceDid, // Expected audience
      null, // No issuer restriction
      getSigningKey,
    )

    // Validate the lexicon method if present
    const lxm = parseReqNsid(ctx.req)
    if (payload.lxm && payload.lxm !== lxm) {
      throw new AuthRequiredError(
        `jwt lexicon method mismatch. expected: ${lxm}, got: ${payload.lxm}`,
        'BadJwtLexiconMethod',
      )
    }

    return {
      credentials: {
        type: 'user',
        did: payload.iss,
        aud: payload.aud,
      },
    }
  }

  nullCreds(): NullOutput {
    return {
      credentials: {
        type: 'none',
        did: null,
      },
    }
  }

  /**
   * Parse authentication result to get user DID
   */
  parseCreds(auth: AuthOutput | NullOutput): string | null {
    if (auth.credentials.type === 'user') {
      return auth.credentials.did
    }
    return null
  }
}

// HELPERS
// ---------

const BEARER = 'Bearer '

const isBearerToken = (req: express.Request): boolean => {
  return req.headers.authorization?.startsWith(BEARER) ?? false
}

const bearerTokenFromReq = (req: express.Request): string | null => {
  const header = req.headers.authorization || ''
  if (!header.startsWith(BEARER)) return null
  return header.slice(BEARER.length).trim()
}
