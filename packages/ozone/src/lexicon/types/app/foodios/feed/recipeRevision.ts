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
import type * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef.js'
import type * as AppBskyRichtextFacet from '../../bsky/richtext/facet.js'
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'
import type * as AppBskyEmbedImages from '../../bsky/embed/images.js'
import type * as AppBskyEmbedVideo from '../../bsky/embed/video.js'
import type * as AppBskyEmbedExternal from '../../bsky/embed/external.js'
import type * as AppBskyEmbedRecord from '../../bsky/embed/record.js'
import type * as AppBskyEmbedRecordWithMedia from '../../bsky/embed/recordWithMedia.js'
import type * as AppFoodiosFeedDefs from './defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.foodios.feed.recipeRevision'

export interface Main {
  $type: 'app.foodios.feed.recipeRevision'
  recipePostRef: ComAtprotoRepoStrongRef.Main
  parentRevisionRef?: ComAtprotoRepoStrongRef.Main
  /** The name/title of the recipe */
  name: string
  /** Body providing a description of the recipe */
  text: string
  /** Annotations of text (mentions, URLs, hashtags, etc) */
  facets?: AppBskyRichtextFacet.Main[]
  ingredients: Ingredient[]
  instructionSections: InstructionSection[]
  /** Preparation time in minutes */
  prepTime?: string
  /** Preparation time in minutes */
  cookingTime?: string
  recipeCategory?: string[]
  recipeCuisine?: string[]
  suitableForDiet?: string[]
  recipeYield?: QuantityAndUnit
  nutrition?: Nutrition
  attribution?:
    | $Typed<OriginalAttribution>
    | $Typed<PersonAttribution>
    | $Typed<PublicationAttribution>
    | $Typed<WebsiteAttribution>
    | $Typed<ShowAttribution>
    | $Typed<ProductAttribution>
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string }
  /** Indicates human language of post primary text content. */
  langs?: string[]
  /** Additional hashtags, in addition to any included in post text and facets. */
  tags?: string[]
  /** Client-declared timestamp when this post was originally created. */
  createdAt: string
  embed?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | $Typed<AppBskyEmbedExternal.Main>
    | $Typed<AppBskyEmbedRecord.Main>
    | $Typed<AppBskyEmbedRecordWithMedia.Main>
    | { $type: string }
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}

export interface InstructionSection {
  $type?: 'app.foodios.feed.recipeRevision#instructionSection'
  name?: string
  instructions: Instruction[]
  images?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | { $type: string }
}

const hashInstructionSection = 'instructionSection'

export function isInstructionSection<V>(v: V) {
  return is$typed(v, id, hashInstructionSection)
}

export function validateInstructionSection<V>(v: V) {
  return validate<InstructionSection & V>(v, id, hashInstructionSection)
}

export interface Instruction {
  $type?: 'app.foodios.feed.recipeRevision#instruction'
  text: string
  images?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | { $type: string }
}

const hashInstruction = 'instruction'

export function isInstruction<V>(v: V) {
  return is$typed(v, id, hashInstruction)
}

export function validateInstruction<V>(v: V) {
  return validate<Instruction & V>(v, id, hashInstruction)
}

export interface Ingredient {
  $type?: 'app.foodios.feed.recipeRevision#ingredient'
  name: string
  quantity: string
  unit: string
  images?:
    | $Typed<AppBskyEmbedImages.Main>
    | $Typed<AppBskyEmbedVideo.Main>
    | { $type: string }
}

const hashIngredient = 'ingredient'

export function isIngredient<V>(v: V) {
  return is$typed(v, id, hashIngredient)
}

export function validateIngredient<V>(v: V) {
  return validate<Ingredient & V>(v, id, hashIngredient)
}

export interface QuantityAndUnit {
  $type?: 'app.foodios.feed.recipeRevision#quantityAndUnit'
  quantity: string
  unit: string
}

const hashQuantityAndUnit = 'quantityAndUnit'

export function isQuantityAndUnit<V>(v: V) {
  return is$typed(v, id, hashQuantityAndUnit)
}

export function validateQuantityAndUnit<V>(v: V) {
  return validate<QuantityAndUnit & V>(v, id, hashQuantityAndUnit)
}

export interface Nutrition {
  $type?: 'app.foodios.feed.recipeRevision#nutrition'
  servingSize: QuantityAndUnit
  /** Energy in kJ */
  energy: string
  /** Carbohydrate in g */
  carbohydrateContent?: string
  /** Cholesterol in mg */
  cholesterolContent?: string
  /** Fat per serving in g */
  fatContent?: string
  /** Fat per serving in g */
  fiberContent?: string
  /** Protein per serving in g */
  proteinContent?: string
  /** Saturated per serving fat in g */
  saturatedFatContent?: string
  /** Sodium in mg */
  sodiumContent?: string
  /** Sugar in g */
  sugarContent?: string
  /** Trans fat in g */
  transFatContent?: string
  /** Unsaturated fat in g */
  unsaturatedFatContent?: string
}

const hashNutrition = 'nutrition'

export function isNutrition<V>(v: V) {
  return is$typed(v, id, hashNutrition)
}

export function validateNutrition<V>(v: V) {
  return validate<Nutrition & V>(v, id, hashNutrition)
}

export interface OriginalAttribution {
  $type?: 'app.foodios.feed.recipeRevision#originalAttribution'
  type: 'original'
  license:
    | $Typed<AppFoodiosFeedDefs.LicenseAllRights>
    | $Typed<AppFoodiosFeedDefs.LicenseCreativeCommonsBy>
    | $Typed<AppFoodiosFeedDefs.LicenseCreativeCommonsBySa>
    | $Typed<AppFoodiosFeedDefs.LicenseCreativeCommonsByNc>
    | $Typed<AppFoodiosFeedDefs.LicenseCreativeCommonsByNcSa>
    | $Typed<AppFoodiosFeedDefs.LicensePublicDomain>
  url?: string
}

const hashOriginalAttribution = 'originalAttribution'

export function isOriginalAttribution<V>(v: V) {
  return is$typed(v, id, hashOriginalAttribution)
}

export function validateOriginalAttribution<V>(v: V) {
  return validate<OriginalAttribution & V>(v, id, hashOriginalAttribution)
}

export interface PersonAttribution {
  $type?: 'app.foodios.feed.recipeRevision#personAttribution'
  type: 'person'
  name: string
  url?: string
  notes?: string
}

const hashPersonAttribution = 'personAttribution'

export function isPersonAttribution<V>(v: V) {
  return is$typed(v, id, hashPersonAttribution)
}

export function validatePersonAttribution<V>(v: V) {
  return validate<PersonAttribution & V>(v, id, hashPersonAttribution)
}

export interface PublicationAttribution {
  $type?: 'app.foodios.feed.recipeRevision#publicationAttribution'
  type: 'publication'
  publicationType:
    | $Typed<AppFoodiosFeedDefs.PublicationTypeBook>
    | $Typed<AppFoodiosFeedDefs.PublicationTypeMagazine>
  title: string
  author: string
  publisher?: string
  isbn?: string
  page?: number
  url?: string
  notes?: string
}

const hashPublicationAttribution = 'publicationAttribution'

export function isPublicationAttribution<V>(v: V) {
  return is$typed(v, id, hashPublicationAttribution)
}

export function validatePublicationAttribution<V>(v: V) {
  return validate<PublicationAttribution & V>(v, id, hashPublicationAttribution)
}

export interface WebsiteAttribution {
  $type?: 'app.foodios.feed.recipeRevision#websiteAttribution'
  type: 'website'
  name: string
  url: string
  notes?: string
}

const hashWebsiteAttribution = 'websiteAttribution'

export function isWebsiteAttribution<V>(v: V) {
  return is$typed(v, id, hashWebsiteAttribution)
}

export function validateWebsiteAttribution<V>(v: V) {
  return validate<WebsiteAttribution & V>(v, id, hashWebsiteAttribution)
}

export interface ShowAttribution {
  $type?: 'app.foodios.feed.recipeRevision#showAttribution'
  type: 'show'
  title: string
  episode?: string
  network: string
  airDate?: string
  url?: string
  notes?: string
}

const hashShowAttribution = 'showAttribution'

export function isShowAttribution<V>(v: V) {
  return is$typed(v, id, hashShowAttribution)
}

export function validateShowAttribution<V>(v: V) {
  return validate<ShowAttribution & V>(v, id, hashShowAttribution)
}

export interface ProductAttribution {
  $type?: 'app.foodios.feed.recipeRevision#productAttribution'
  type: 'product'
  brand: string
  name: string
  upc?: string
  url?: string
  notes?: string
}

const hashProductAttribution = 'productAttribution'

export function isProductAttribution<V>(v: V) {
  return is$typed(v, id, hashProductAttribution)
}

export function validateProductAttribution<V>(v: V) {
  return validate<ProductAttribution & V>(v, id, hashProductAttribution)
}
