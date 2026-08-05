import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import {
  gasAgreementDocumentApiUrls,
  gasBackendUrl,
  gasGrantCode,
  gasPublicAgreementPaths,
  gasViewPageModel
} from '#~/server/agreement/__test__/gas-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createServer } from '#~/server/server.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'

vi.mock('#~/server/common/helpers/jwt-auth.js', () => ({
  extractJwtPayload: vi.fn()
}))

describe('GAS public agreement rendering', () => {
  let server
  const originalFetch = globalThis.fetch

  beforeAll(async () => {
    config.set('gasBackend.url', gasBackendUrl)
    config.set('gasBackend.authToken', 'mock-gas-token')
    config.set('gasBackend.allowedGrantCodes', [gasGrantCode])
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    globalThis.fetch = originalFetch
    await server?.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn()
    extractJwtPayload.mockReturnValue({
      source: 'entra',
      grantCode: gasGrantCode,
      clientRef: 'case-reference',
      sbi: '300000000'
    })
  })

  test('renders the same GAS document through the public view and print routes', async () => {
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => gasViewPageModel
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => gasViewPageModel
      })

    const viewResponse = await server.inject({
      method: 'GET',
      url: `${gasPublicAgreementPaths.view}?x-encrypted-auth=query-auth`,
      headers: { 'x-encrypted-auth': 'caseworking-header-auth' }
    })
    const printResponse = await server.inject({
      method: 'GET',
      url: `${gasPublicAgreementPaths.print}?x-encrypted-auth=pdf-query-auth`
    })

    expect(viewResponse.statusCode).toBe(200)
    expect(printResponse.statusCode).toBe(200)
    expect(extractJwtPayload).toHaveBeenNthCalledWith(
      1,
      'caseworking-header-auth'
    )
    expect(extractJwtPayload).toHaveBeenNthCalledWith(2, 'pdf-query-auth')
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      gasAgreementDocumentApiUrls.view,
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer mock-gas-token',
          'x-agreement-source': 'entra',
          'x-agreement-code': gasGrantCode,
          'x-agreement-sbi': '300000000'
        },
        method: 'GET'
      })
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      gasAgreementDocumentApiUrls.print,
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer mock-gas-token',
          'x-agreement-source': 'entra',
          'x-agreement-code': gasGrantCode,
          'x-agreement-sbi': '300000000'
        },
        method: 'GET'
      })
    )
    expect(viewResponse.result).toContain('Pigs Might Fly agreement')
    expect(viewResponse.result).toContain(
      'This content came from the complete GAS page model.'
    )
    expect(viewResponse.result).toContain('Status supplied by GAS')
    expect(viewResponse.result).toContain('Terminated')
    expect(viewResponse.result).toContain('GAS provided action')
    expect(printResponse.result).toContain('Pigs Might Fly agreement')
    expect(printResponse.result).toContain(
      'This content came from the complete GAS page model.'
    )
  })
})
