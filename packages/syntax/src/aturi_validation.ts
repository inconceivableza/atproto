import { AtUri } from './aturi'
import { ensureValidDidRegex } from './did'
import { ensureValidHandleRegex } from './handle'
import { ensureValidNsidRegex } from './nsid'

// Human-readable constraints on ATURI:
//   - following regular URLs, a 8KByte hard total length limit
//   - follows ATURI docs on website
//      - all ASCII characters, no whitespace. non-ASCII could be URL-encoded
//      - starts "at://"
//      - "authority" is a valid DID or a valid handle
//      - optionally, follow "authority" with "/" and valid NSID as start of path
//      - optionally, if NSID given, follow that with "/" and rkey
//      - rkey path component can include URL-encoded ("percent encoded"), or:
//          ALPHA / DIGIT / "-" / "." / "_" / "~" / ":" / "@" / "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
//          [a-zA-Z0-9._~:@!$&'\(\)*+,;=-]
//      - rkey must have at least one char
//      - regardless of path component, a fragment can follow  as "#" and then a JSON pointer (RFC-6901)
export const ensureValidAtUri = (uri: string) => {
  if (!new AtUri(uri)) {
    throw new Error('Invalid at-uri')
  }
}

export const ensureValidAtUriRegex = (uri: string): void => {
  // simple regex to enforce most constraints via just regex and length.
  // hand wrote this regex based on above constraints. whew!
  const aturiRegex =
    /^at:\/\/(?<authority>[a-zA-Z0-9._:%-]+)(\/(?<collection>[a-zA-Z0-9-.]+)(\/(?<rkey>[a-zA-Z0-9._~:@!$&%')(*+,;=-]+))?)?(#(?<fragment>\/[a-zA-Z0-9._~:@!$&%')(*+,;=\-[\]/\\]*))?$/
  const rm = uri.match(aturiRegex)
  if (!rm || !rm.groups) {
    throw new Error("ATURI didn't validate via regex")
  }
  const groups = rm.groups

  try {
    ensureValidHandleRegex(groups.authority)
  } catch {
    try {
      ensureValidDidRegex(groups.authority)
    } catch {
      throw new Error('ATURI authority must be a valid handle or DID')
    }
  }

  if (groups.collection) {
    try {
      ensureValidNsidRegex(groups.collection)
    } catch {
      throw new Error('ATURI collection path segment must be a valid NSID')
    }
  }

  if (uri.length > 8 * 1024) {
    throw new Error('ATURI is far too long')
  }
}
