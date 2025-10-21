import { vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: () => mockReadFileSync()
  }
})
vi.mock('../../../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))

describe('context and cache', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    vi.resetModules()
  })

  describe('#context', () => {
    const mockRequest = {
      path: '/',
      pre: { data: { agreementData: 'mock agreement' } },
      headers: { 'x-csp-nonce': 'mock-nonce' }
    }

    describe('When webpack manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        process.env.SERVICE_VERSION = 'TEST'
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          agreement: 'mock agreement',
          assetPath: '/public/assets',
          breadcrumbs: [],
          cspNonce: 'mock-nonce',
          getAssetPath: expect.any(Function),
          baseUrl: '/',
          navigation: [
            {
              current: true,
              text: 'Home',
              href: '/'
            },
            {
              current: false,
              text: 'About',
              href: '/about'
            }
          ],
          serviceName: 'farming-grants-agreements-ui',
          serviceTitle: 'Farm payments',
          serviceUrl: '/',
          serviceVersion: 'TEST'
        })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(
            contextResult.getAssetPath('base-path', 'application.js')
          ).toBe('base-path/public/javascripts/application.js')
        })
      })

      describe('With invalid asset path', () => {
        test('Should provide expected asset', () => {
          expect(contextResult.getAssetPath('base-path', 'an-image.png')).toBe(
            'base-path/public/an-image.png'
          )
        })
      })
    })

    describe('When webpack manifest file read fails', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        mockReadFileSync.mockReturnValue(new Error('File not found'))

        contextImport.context(mockRequest)
      })

      test('Should log that the Webpack Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Webpack assets-manifest.json not found'
        )
      })
    })
  })

  describe('#context cache', () => {
    const mockRequest = { path: '/', headers: { 'x-csp-nonce': 'mock-nonce' } }
    let contextResult

    describe('Webpack manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        process.env.SERVICE_VERSION = 'TEST'
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should read file', () => {
        expect(mockReadFileSync).toHaveBeenCalled()
      })

      test('Should use cache', () => {
        expect(mockReadFileSync).not.toHaveBeenCalled()
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          agreement: undefined,
          assetPath: '/public/assets',
          baseUrl: '/',
          breadcrumbs: [],
          cspNonce: 'mock-nonce',
          getAssetPath: expect.any(Function),
          navigation: [
            {
              current: true,
              text: 'Home',
              href: '/'
            },
            {
              current: false,
              text: 'About',
              href: '/about'
            }
          ],
          serviceName: 'farming-grants-agreements-ui',
          serviceTitle: 'Farm payments',
          serviceUrl: '/',
          serviceVersion: 'TEST'
        })
      })
    })
  })
})
