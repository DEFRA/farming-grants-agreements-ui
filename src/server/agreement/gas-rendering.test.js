import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

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
    config.set('gasBackend.url', 'http://localhost:3102')
    config.set('gasBackend.authToken', 'mock-gas-token')
    config.set('gasBackend.allowedGrantCodes', ['pigs-might-fly'])
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
      grantCode: 'pigs-might-fly'
    })
  })

  test('renders GAS view and print page models through the public routes', async () => {
    const viewModel = {
      page: { title: 'GAS managed agreement', layout: 'document' },
      agreement: {
        agreementNumber: 'PMF823153883',
        code: 'GAS-ONLY',
        status: 'terminated'
      },
      components: [
        {
          component: 'heading',
          level: 1,
          text: 'Pigs Might Fly agreement'
        },
        {
          component: 'paragraph',
          text: 'This content came from the complete GAS page model.'
        },
        {
          component: 'summary-list',
          title: 'Agreement details',
          rows: [
            { label: 'Agreement number', text: 'PMF823153883' },
            { label: 'Status supplied by GAS', text: 'Terminated' }
          ]
        }
      ],
      actions: [
        {
          href: '/agreements/PMF823153883/actions/accept-offer',
          text: 'GAS provided action'
        }
      ],
      availableActions: ['gas-only-action'],
      lifecycle: { current: 'gas-owned-state' },
      readOnly: false
    }
    const printModel = {
      page: { title: 'Printable GAS agreement', layout: 'document' },
      agreement: {
        agreementNumber: 'PMF823153883',
        code: 'GAS-ONLY',
        status: 'terminated'
      },
      components: [
        { component: 'watermark', text: 'GAS PRINT' },
        {
          component: 'heading',
          level: 1,
          text: 'Printable Pigs Might Fly agreement'
        },
        {
          component: 'paragraph',
          text: 'Print content supplied by GAS.'
        }
      ],
      actions: []
    }
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => viewModel
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => printModel
      })

    const viewResponse = await server.inject({
      method: 'GET',
      url: '/PMF823153883?x-encrypted-auth=query-auth',
      headers: { 'x-encrypted-auth': 'caseworking-header-auth' }
    })
    const printResponse = await server.inject({
      method: 'GET',
      url: '/PMF823153883/print?x-encrypted-auth=pdf-query-auth'
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
      'http://localhost:3102/agreements/PMF823153883',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-gas-token' },
        method: 'GET'
      })
    )
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3102/agreements/PMF823153883?mode=print',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-gas-token' },
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
    expect(printResponse.result).toContain('GAS PRINT')
    expect(printResponse.result).toContain('Printable Pigs Might Fly agreement')
    expect(printResponse.result).toContain('Print content supplied by GAS.')

    const evidenceDirectory = process.env.NO_MISTAKES_EVIDENCE_DIR
    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true })
      await Promise.all([
        writeFile(
          path.join(evidenceDirectory, 'gas-agreement-view.html'),
          viewResponse.result
        ),
        writeFile(
          path.join(evidenceDirectory, 'gas-agreement-print.html'),
          printResponse.result
        )
      ])
    }
  })
})
