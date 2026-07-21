import { extractJwtPayload } from './jwt-auth.js'
import Jwt from '@hapi/jwt'
import { config } from '#~/config/config.js'

vi.mock('@hapi/jwt')
vi.mock('#~/config/config.js')

describe('jwt-auth', () => {
  const mockLogger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }

  const setupMockConfig = (isJwtEnabled = true) => {
    config.get = vi.fn((key) => {
      if (key === 'featureFlags.isJwtEnabled') return isJwtEnabled
      if (key === 'jwtSecret') return 'mock-jwt-secret'
      return null
    })
  }

  const setupMockJwt = (payload = null, throwError = null) => {
    if (throwError) {
      Jwt.token.decode = vi.fn().mockImplementation(() => {
        throw throwError
      })
      Jwt.token.verify = vi.fn()
      return
    }

    if (payload) {
      const mockDecoded = {
        decoded: {
          payload
        }
      }
      Jwt.token.decode = vi.fn().mockReturnValue(mockDecoded)
      Jwt.token.verify = vi.fn().mockImplementation(() => Promise.resolve())
    } else {
      Jwt.token.decode = vi.fn().mockReturnValue(null)
      Jwt.token.verify = vi.fn()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupMockConfig()
  })

  describe('extractJwtPayload', () => {
    test('should return null if no token is provided', () => {
      const result = extractJwtPayload('', mockLogger)
      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith('No JWT token provided')
    })

    test('should return null if token is whitespace only', () => {
      const result = extractJwtPayload('   ', mockLogger)
      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith('No JWT token provided')
    })

    test('should successfully decode and verify a valid token', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        grantCode: 'G1',
        clientRef: 'C1'
      }
      setupMockJwt(mockPayload)

      const result = extractJwtPayload('eyJ.valid.token', mockLogger)

      expect(result).toEqual(mockPayload)
      expect(Jwt.token.decode).toHaveBeenCalledWith('eyJ.valid.token')
      expect(Jwt.token.verify).toHaveBeenCalledWith(expect.any(Object), {
        key: 'mock-jwt-secret',
        algorithms: ['HS256']
      })
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ isJwtFormat: true }),
        'Attempting to decode JWT token'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'JWT token decoded successfully, attempting verification'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'JWT token verified successfully'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ hasSbi: true, hasSource: true }),
        'JWT payload extracted'
      )
    })

    test('should return null and log error if Jwt.token.decode fails', () => {
      const mockError = new Error('Decode error')
      setupMockJwt(null, mockError)

      const result = extractJwtPayload('eyJ.invalid.token', mockLogger)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        mockError,
        'Invalid JWT token provided: Decode error'
      )
    })

    test('should return null and log error if Jwt.token.verify fails', () => {
      Jwt.token.decode = vi.fn().mockReturnValue({ decoded: { payload: {} } })
      const mockError = new Error('Verify error')
      Jwt.token.verify = vi.fn().mockImplementation(() => {
        throw mockError
      })

      const result = extractJwtPayload('eyJ.invalid.token', mockLogger)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        mockError,
        'Invalid JWT token provided: Verify error'
      )
    })

    test('should log payload details correctly even if some fields are missing', () => {
      const mockPayload = { sbi: '123456' } // missing source, grantCode, clientRef
      setupMockJwt(mockPayload)

      const result = extractJwtPayload('eyJ.partial.token', mockLogger)

      expect(result).toEqual(mockPayload)
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          hasSbi: true,
          hasSource: false,
          source: undefined,
          clientRef: undefined,
          grantCode: undefined
        },
        'JWT payload extracted'
      )
    })
  })
})
