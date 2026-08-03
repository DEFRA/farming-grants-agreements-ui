import { randomUUID } from 'node:crypto'

import Boom from '@hapi/boom'

const actionTransportFieldNames = Object.freeze({
  etag: '__agreementsUiEtag',
  idempotencyKey: '__agreementsUiIdempotencyKey'
})

export const createActionTransport = (etag, idempotencyKey = randomUUID()) => ({
  etag: {
    name: actionTransportFieldNames.etag,
    value: etag
  },
  idempotencyKey: {
    name: actionTransportFieldNames.idempotencyKey,
    value: idempotencyKey
  }
})

export const extractActionSubmission = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw Boom.badRequest('Agreement action transport metadata is missing')
  }

  const etag = payload[actionTransportFieldNames.etag]
  const idempotencyKey = payload[actionTransportFieldNames.idempotencyKey]

  if (typeof etag !== 'string' || typeof idempotencyKey !== 'string') {
    throw Boom.badRequest('Agreement action transport metadata is missing')
  }

  const reservedNames = new Set(Object.values(actionTransportFieldNames))
  const values = Object.fromEntries(
    Object.entries(payload).filter(([name]) => !reservedNames.has(name))
  )

  return { etag, idempotencyKey, values }
}
