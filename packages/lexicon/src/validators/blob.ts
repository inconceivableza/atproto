import { check } from '@atproto/common-web'
import {
  BlobRef,
  jsonBlobRef
} from '../blob-refs'
import { Lexicons } from '../lexicons'
import { LexUserType, ValidationError, ValidationResult } from '../types'

export function blob(
  lexicons: Lexicons,
  path: string,
  def: LexUserType,
  value: unknown,
): ValidationResult {
  // check if value is already a BlobRef instance or can be converted to one
  if (typeof value === "object" && value && 'original' in value && check.is(value['original'], jsonBlobRef)) {
    value = value.original
  }
  const blobRef = value instanceof BlobRef ? value : BlobRef.asBlobRef(value)

  if (!blobRef) {
    return {
      success: false,
      error: new ValidationError(`${path} should be a blob ref`),
    }
  }
  return { success: true, value: blobRef }
}
