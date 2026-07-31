import path from 'node:path'

import Boom from '@hapi/boom'

import { config } from '#~/config/config.js'

import { encryptedAuthQueryName } from './agreement-request.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i
const agreementPathPattern =
  /^\/agreements\/([^/]+?)(?:\/actions\/([^/]+))?\/?$/
const unsupportedLocationHeaderMessage =
  'GAS returned an unsupported Location header'

const isAbsoluteUrl = (value) =>
  absoluteUrlPattern.test(value) || value.startsWith('//')

const parseUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl)
  } catch {
    return undefined
  }
}

const isSafeSegment = (segment) =>
  segment &&
  !['.', '..'].includes(segment.toLowerCase()) &&
  !/%(?:2f|5c)/i.test(segment)

const getAgreementSegments = (pathname) => {
  const match = agreementPathPattern.exec(pathname)
  if (!match || !isSafeSegment(match[1]) || !isSafeSegment(match[2] ?? 'x')) {
    return undefined
  }

  const [, agreementId, actionName] = match
  return actionName ? [agreementId, 'actions', actionName] : [agreementId]
}

export const appendQueryAuthentication = (value, queryAuthentication) => {
  if (queryAuthentication === undefined) {
    return value
  }

  const hashIndex = value.indexOf('#')
  const hash = hashIndex === -1 ? '' : value.slice(hashIndex)
  const valueWithoutHash = hashIndex === -1 ? value : value.slice(0, hashIndex)
  const queryIndex = valueWithoutHash.indexOf('?')
  const pathname =
    queryIndex === -1 ? valueWithoutHash : valueWithoutHash.slice(0, queryIndex)
  const searchParams = new URLSearchParams(
    queryIndex === -1 ? '' : valueWithoutHash.slice(queryIndex + 1)
  )
  searchParams.set(encryptedAuthQueryName, queryAuthentication)

  return `${pathname}?${searchParams.toString()}${hash}`
}

const appendToBaseUrl = (
  baseUrl,
  segments,
  queryAuthentication,
  search = '',
  hash = ''
) => {
  if (!absoluteUrlPattern.test(baseUrl)) {
    return appendQueryAuthentication(
      `${path.posix.join(baseUrl, ...segments)}${search}${hash}`,
      queryAuthentication
    )
  }

  const publicUrl = new URL(baseUrl)
  publicUrl.pathname = path.posix.join(publicUrl.pathname, ...segments)
  publicUrl.search = search
  publicUrl.hash = hash
  return appendQueryAuthentication(publicUrl.toString(), queryAuthentication)
}

export const translateAgreementPath = (value, baseUrl, queryAuthentication) => {
  if (typeof value !== 'string') {
    return undefined
  }

  const gasBaseUrl = new URL(config.get('gasBackend.url'))
  const target = parseUrl(value, gasBaseUrl)
  if (!target) {
    return undefined
  }

  if (isAbsoluteUrl(value) && target.origin !== gasBaseUrl.origin) {
    return undefined
  }

  const segments = getAgreementSegments(target.pathname)
  if (isAbsoluteUrl(value) && !segments) {
    throw Boom.badGateway('GAS returned an unsupported Agreement URL')
  }

  return segments
    ? appendToBaseUrl(
        baseUrl,
        segments,
        queryAuthentication,
        target.search,
        target.hash
      )
    : undefined
}

const getGasLocation = (location) => {
  if (!location) {
    throw Boom.badGateway('GAS response did not include a Location header')
  }

  const gasBaseUrl = new URL(config.get('gasBackend.url'))
  const target = parseUrl(location, gasBaseUrl)
  if (!target) {
    throw Boom.badGateway(unsupportedLocationHeaderMessage)
  }

  if (target.origin !== gasBaseUrl.origin) {
    throw Boom.badGateway(unsupportedLocationHeaderMessage)
  }

  const segments = getAgreementSegments(target.pathname)
  if (!segments) {
    throw Boom.badGateway(unsupportedLocationHeaderMessage)
  }

  return { segments, target }
}

const buildPublicLocation = (
  { segments, target },
  baseUrl,
  queryAuthentication
) =>
  appendToBaseUrl(
    baseUrl,
    segments,
    queryAuthentication,
    target.search,
    target.hash
  )

export const translateGasLocation = (location, baseUrl, queryAuthentication) =>
  buildPublicLocation(getGasLocation(location), baseUrl, queryAuthentication)

export const translateGasAgreementLocation = (
  location,
  agreementId,
  baseUrl,
  queryAuthentication
) => {
  const gasLocation = getGasLocation(location)
  const isCurrentAgreement =
    gasLocation.segments.length === 1 &&
    [agreementId, encodeURIComponent(agreementId)].includes(
      gasLocation.segments[0]
    )

  if (!isCurrentAgreement) {
    throw Boom.badGateway(
      'GAS returned a stale Location for another Agreement page'
    )
  }

  return buildPublicLocation(gasLocation, baseUrl, queryAuthentication)
}
