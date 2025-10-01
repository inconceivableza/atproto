/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as AppFoodiosFeedRecipeRevision from './recipeRevision.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.foodios.feed.defs'

export interface RecipeRevisionView {
  $type?: 'app.foodios.feed.defs#recipeRevisionView'
  selectedRevisionUri: string
  revisionRefs: RevisionRef[]
  revisionContent: AppFoodiosFeedRecipeRevision.Record
}

const hashRecipeRevisionView = 'recipeRevisionView'

export function isRecipeRevisionView<V>(v: V) {
  return is$typed(v, id, hashRecipeRevisionView)
}

export function validateRecipeRevisionView<V>(v: V) {
  return validate<RecipeRevisionView & V>(v, id, hashRecipeRevisionView)
}

export interface RevisionRef {
  $type?: 'app.foodios.feed.defs#revisionRef'
  uri: string
  createdAt: string
}

const hashRevisionRef = 'revisionRef'

export function isRevisionRef<V>(v: V) {
  return is$typed(v, id, hashRevisionRef)
}

export function validateRevisionRef<V>(v: V) {
  return validate<RevisionRef & V>(v, id, hashRevisionRef)
}
