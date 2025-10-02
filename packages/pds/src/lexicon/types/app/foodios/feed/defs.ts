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

export interface LicenseAllRights {
  $type?: 'app.foodios.feed.defs#licenseAllRights'
  /** All rights reserved by the creator. */
  licenseType?: 'licenseAllRights'
}

const hashLicenseAllRights = 'licenseAllRights'

export function isLicenseAllRights<V>(v: V) {
  return is$typed(v, id, hashLicenseAllRights)
}

export function validateLicenseAllRights<V>(v: V) {
  return validate<LicenseAllRights & V>(v, id, hashLicenseAllRights)
}

export interface LicenseCreativeCommonsBy {
  $type?: 'app.foodios.feed.defs#licenseCreativeCommonsBy'
  /** Creative Commons Attribution 4.0 License. */
  licenseType?: 'licenseCreativeCommonsBy'
}

const hashLicenseCreativeCommonsBy = 'licenseCreativeCommonsBy'

export function isLicenseCreativeCommonsBy<V>(v: V) {
  return is$typed(v, id, hashLicenseCreativeCommonsBy)
}

export function validateLicenseCreativeCommonsBy<V>(v: V) {
  return validate<LicenseCreativeCommonsBy & V>(
    v,
    id,
    hashLicenseCreativeCommonsBy,
  )
}

export interface LicenseCreativeCommonsBySa {
  $type?: 'app.foodios.feed.defs#licenseCreativeCommonsBySa'
  /** Creative Commons Attribution-ShareAlike 4.0 License. */
  licenseType?: 'licenseCreativeCommonsBySa'
}

const hashLicenseCreativeCommonsBySa = 'licenseCreativeCommonsBySa'

export function isLicenseCreativeCommonsBySa<V>(v: V) {
  return is$typed(v, id, hashLicenseCreativeCommonsBySa)
}

export function validateLicenseCreativeCommonsBySa<V>(v: V) {
  return validate<LicenseCreativeCommonsBySa & V>(
    v,
    id,
    hashLicenseCreativeCommonsBySa,
  )
}

export interface LicenseCreativeCommonsByNc {
  $type?: 'app.foodios.feed.defs#licenseCreativeCommonsByNc'
  /** Creative Commons Attribution-NonCommercial 4.0 License. */
  licenseType?: 'licenseCreativeCommonsByNc'
}

const hashLicenseCreativeCommonsByNc = 'licenseCreativeCommonsByNc'

export function isLicenseCreativeCommonsByNc<V>(v: V) {
  return is$typed(v, id, hashLicenseCreativeCommonsByNc)
}

export function validateLicenseCreativeCommonsByNc<V>(v: V) {
  return validate<LicenseCreativeCommonsByNc & V>(
    v,
    id,
    hashLicenseCreativeCommonsByNc,
  )
}

export interface LicenseCreativeCommonsByNcSa {
  $type?: 'app.foodios.feed.defs#licenseCreativeCommonsByNcSa'
  /** Creative Commons Attribution-NonCommercial-ShareAlike 4.0 License. */
  licenseType?: 'licenseCreativeCommonsByNcSa'
}

const hashLicenseCreativeCommonsByNcSa = 'licenseCreativeCommonsByNcSa'

export function isLicenseCreativeCommonsByNcSa<V>(v: V) {
  return is$typed(v, id, hashLicenseCreativeCommonsByNcSa)
}

export function validateLicenseCreativeCommonsByNcSa<V>(v: V) {
  return validate<LicenseCreativeCommonsByNcSa & V>(
    v,
    id,
    hashLicenseCreativeCommonsByNcSa,
  )
}

export interface LicensePublicDomain {
  $type?: 'app.foodios.feed.defs#licensePublicDomain'
  /** Work dedicated to the public domain. */
  licenseType?: 'licensePublicDomain'
}

const hashLicensePublicDomain = 'licensePublicDomain'

export function isLicensePublicDomain<V>(v: V) {
  return is$typed(v, id, hashLicensePublicDomain)
}

export function validateLicensePublicDomain<V>(v: V) {
  return validate<LicensePublicDomain & V>(v, id, hashLicensePublicDomain)
}

export interface PublicationTypeBook {
  $type?: 'app.foodios.feed.defs#publicationTypeBook'
  /** Recipe from a published book. */
  publicationType?: 'publicationTypeBook'
}

const hashPublicationTypeBook = 'publicationTypeBook'

export function isPublicationTypeBook<V>(v: V) {
  return is$typed(v, id, hashPublicationTypeBook)
}

export function validatePublicationTypeBook<V>(v: V) {
  return validate<PublicationTypeBook & V>(v, id, hashPublicationTypeBook)
}

export interface PublicationTypeMagazine {
  $type?: 'app.foodios.feed.defs#publicationTypeMagazine'
  /** Recipe from a magazine. */
  publicationType?: 'publicationTypeMagazine'
}

const hashPublicationTypeMagazine = 'publicationTypeMagazine'

export function isPublicationTypeMagazine<V>(v: V) {
  return is$typed(v, id, hashPublicationTypeMagazine)
}

export function validatePublicationTypeMagazine<V>(v: V) {
  return validate<PublicationTypeMagazine & V>(
    v,
    id,
    hashPublicationTypeMagazine,
  )
}
