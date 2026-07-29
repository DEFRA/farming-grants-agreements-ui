import path from 'node:path'

import Boom from '@hapi/boom'

import { config } from '#~/config/config.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i
const agreementPathPattern =
  /^\/agreements\/([^/]+?)(?:\/actions\/([^/]+))?\/?$/

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

const appendToBaseUrl = (baseUrl, segments, search = '', hash = '') => {
  if (!absoluteUrlPattern.test(baseUrl)) {
    return `${path.posix.join(baseUrl, ...segments)}${search}${hash}`
  }

  const publicUrl = new URL(baseUrl)
  publicUrl.pathname = path.posix.join(publicUrl.pathname, ...segments)
  publicUrl.search = search
  publicUrl.hash = hash
  return publicUrl.toString()
}

export const translateAgreementPath = (value, baseUrl) => {
  if (typeof value !== 'string' || absoluteUrlPattern.test(value)) {
    return undefined
  }

  const target = new URL(value, 'http://agreements-ui.local')
  const segments = getAgreementSegments(target.pathname)
  return segments
    ? appendToBaseUrl(baseUrl, segments, target.search, target.hash)
    : undefined
}

export const translateGasLocation = (location, baseUrl) => {
  if (!location) {
    throw Boom.badGateway('GAS response did not include a Location header')
  }

  const gasBaseUrl = new URL(config.get('gasBackend.url'))
  const target = new URL(location, gasBaseUrl)

  if (target.origin !== gasBaseUrl.origin) {
    throw Boom.badGateway('GAS returned an unsupported Location header')
  }

  const segments = getAgreementSegments(target.pathname)
  if (!segments) {
    throw Boom.badGateway('GAS returned an unsupported Location header')
  }

  return appendToBaseUrl(baseUrl, segments, target.search, target.hash)
}
