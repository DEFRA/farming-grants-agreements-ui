import { extractJwtPayload } from './jwt-auth.js'
import Jwt from '@hapi/jwt'
import { config } from '#~/config/config.js'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'

vi.mock('@hapi/jwt')
vi.mock('#~/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'featureFlags.isJwtEnabled') return true
      if (key === 'jwtSecret') return 'mock-jwt-secret'
      if (key === 'log') {
        return { enabled: true, level: 'info', redact: [], format: 'ecs' }
      }
      if (key === 'serviceName') return 'test-service'
      if (key === 'serviceVersion') return '1.0.0'
      return null
    }),
    validate: vi.fn()
  }
}))
vi.mock('#~/server/common/helpers/logging/logger.js', () => {
  const mockLogger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
  return {
    createLogger: vi.fn(() => mockLogger),
    mockLogger // Exported for easy access if needed, but we'll use vi.mocked(createLogger)().error etc.
  }
})

describe('jwt-auth', () => {
  const getMockLogger = () => vi.mocked(createLogger)()

  const setupMockConfig = (isJwtEnabled = true, overrides = {}) => {
    const {
      enforce = false,
      keyring = {},
      defaultKid = 'agreements-hs256-1'
    } = overrides
    config.get.mockImplementation((key) => {
      if (key === 'featureFlags.isJwtEnabled') return isJwtEnabled
      if (key === 'jwtSecret') return 'mock-jwt-secret'
      if (key === 'jwtDefaultKid') return defaultKid
      if (key === 'jwtKeyring') return keyring
      if (key === 'callerTokenEnforce') return enforce
      if (key === 'log') {
        return { enabled: true, level: 'info', redact: [], format: 'ecs' }
      }
      if (key === 'serviceName') return 'test-service'
      if (key === 'serviceVersion') return '1.0.0'
      return null
    })
  }

  const setupMockJwt = (payload = null, throwError = null, header = {}) => {
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
          header,
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
      const result = extractJwtPayload('')
      expect(result).toBeNull()
      expect(getMockLogger().error).toHaveBeenCalledWith(
        'No JWT token provided'
      )
    })

    test('should return null if token is whitespace only', () => {
      const result = extractJwtPayload('   ')
      expect(result).toBeNull()
      expect(getMockLogger().error).toHaveBeenCalledWith(
        'No JWT token provided'
      )
    })

    test('should successfully decode and verify a valid token', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        grantCode: 'G1',
        clientRef: 'C1'
      }
      setupMockJwt(mockPayload)

      const result = extractJwtPayload('eyJ.valid.token')

      expect(result).toEqual(mockPayload)
      expect(Jwt.token.decode).toHaveBeenCalledWith('eyJ.valid.token')
      expect(Jwt.token.verify).toHaveBeenCalledWith(expect.any(Object), {
        key: 'mock-jwt-secret',
        algorithms: ['HS256']
      })
      expect(getMockLogger().info).toHaveBeenCalledWith(
        expect.objectContaining({ isJwtFormat: true }),
        'Attempting to decode JWT token'
      )
      expect(getMockLogger().info).toHaveBeenCalledWith(
        'JWT token decoded successfully, attempting verification'
      )
      expect(getMockLogger().info).toHaveBeenCalledWith(
        'JWT token verified successfully'
      )
      expect(getMockLogger().info).toHaveBeenCalledWith(
        expect.objectContaining({ hasSbi: true, hasSource: true }),
        'JWT payload extracted'
      )
    })

    test('should warn (but still accept) when hardened FGP-1307 claims are missing', () => {
      const mockPayload = { sbi: '123456', source: 'defra' }
      setupMockJwt(mockPayload)

      const result = extractJwtPayload('eyJ.legacy.token')

      expect(result).toEqual(mockPayload)
      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { missingClaims: ['iss', 'aud', 'sub', 'exp', 'iat'] },
        'Caller token is missing hardened claims (FGP-1307); accepted for now'
      )
    })

    test('should not warn when a fully hardened token targets agreements-ui', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'grants-ui',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat: 1893455700,
        exp: 1893456000
      }
      setupMockJwt(mockPayload)

      const result = extractJwtPayload('eyJ.hardened.token')

      expect(result).toEqual(mockPayload)
      expect(getMockLogger().warn).not.toHaveBeenCalled()
    })

    test('should warn when the token has no exp claim', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'grants-ui',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat: 1893455700
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.noexp.token')

      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { missingClaims: ['exp'] },
        'Caller token is missing hardened claims (FGP-1307); accepted for now'
      )
    })

    test('should warn when the token has no iat claim', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'grants-ui',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        exp: 1893456000
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.noiat.token')

      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { missingClaims: ['iat'] },
        'Caller token is missing hardened claims (FGP-1307); accepted for now'
      )
    })

    test('should warn when iat is not numeric', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'grants-ui',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat: '1893455700',
        exp: 1893456000
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.badiat.token')

      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { iatType: 'string' },
        'Caller token iat is not a numeric claim (FGP-1307); accepted for now'
      )
    })

    test('should warn when the token lifetime exceeds the agreed maximum', () => {
      const iat = 1893455700
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'grants-ui',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat,
        exp: iat + 60 * 60 * 24 * 365 // one year
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.longlived.token')

      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { lifetimeSeconds: 60 * 60 * 24 * 365, maxLifetimeSeconds: 300 },
        'Caller token lifetime (exp - iat) is outside the agreed range (FGP-1307); accepted for now'
      )
    })

    test('should warn when the token lifetime is not positive', () => {
      const iat = 1893456000
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'grants-ui',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat,
        exp: iat - 10
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.negativelifetime.token')

      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { lifetimeSeconds: -10, maxLifetimeSeconds: 300 },
        'Caller token lifetime (exp - iat) is outside the agreed range (FGP-1307); accepted for now'
      )
    })

    test('should warn when the token issuer is not in the allowed producers list', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'rogue-service',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat: 1893455700,
        exp: 1893456000
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.badissuer.token')

      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { iss: 'rogue-service' },
        'Caller token issuer is not in the allowed producers list (FGP-1307); accepted for now'
      )
    })

    test('should not warn on issuer for each agreed producer', () => {
      for (const iss of ['grants-ui', 'fg-cw-frontend', 'agreements-pdf']) {
        vi.clearAllMocks()
        setupMockConfig()
        const mockPayload = {
          sbi: '123456',
          source: 'defra',
          iss,
          aud: ['agreements-ui', 'gas'],
          sub: '123456',
          iat: 1893455700,
          exp: 1893456000
        }
        setupMockJwt(mockPayload)

        extractJwtPayload('eyJ.producer.token')

        expect(getMockLogger().warn).not.toHaveBeenCalled()
      }
    })

    test('should warn when the token audience excludes agreements-ui', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        iss: 'grants-ui',
        aud: ['gas'],
        sub: '123456'
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.wrongaud.token')

      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { aud: ['gas'] },
        'Caller token audience does not include agreements-ui (FGP-1307); accepted for now'
      )
    })

    test('should return null and log error if Jwt.token.decode fails', () => {
      const mockError = new Error('Decode error')
      setupMockJwt(null, mockError)

      const result = extractJwtPayload('eyJ.invalid.token')

      expect(result).toBeNull()
      expect(getMockLogger().error).toHaveBeenCalledWith(
        {
          errorType: 'Error',
          errorMessage: 'Decode error',
          failureCategory: 'structure'
        },
        'Invalid JWT token provided'
      )
    })

    test('should return null and log error if Jwt.token.verify fails', () => {
      Jwt.token.decode = vi.fn().mockReturnValue({ decoded: { payload: {} } })
      const mockError = new Error('Verify error')
      Jwt.token.verify = vi.fn().mockImplementation(() => {
        throw mockError
      })

      const result = extractJwtPayload('eyJ.invalid.token')

      expect(result).toBeNull()
      expect(getMockLogger().error).toHaveBeenCalledWith(
        {
          errorType: 'Error',
          errorMessage: 'Verify error',
          failureCategory: 'unknown'
        },
        'Invalid JWT token provided'
      )
    })

    test('should categorise an expired-token failure', () => {
      Jwt.token.decode = vi.fn().mockReturnValue({ decoded: { payload: {} } })
      Jwt.token.verify = vi.fn().mockImplementation(() => {
        throw new Error('Token expired')
      })

      const result = extractJwtPayload('eyJ.expired.token')

      expect(result).toBeNull()
      expect(getMockLogger().error).toHaveBeenCalledWith(
        expect.objectContaining({ failureCategory: 'expired' }),
        'Invalid JWT token provided'
      )
    })

    test('should categorise an invalid-signature failure', () => {
      Jwt.token.decode = vi.fn().mockReturnValue({ decoded: { payload: {} } })
      Jwt.token.verify = vi.fn().mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const result = extractJwtPayload('eyJ.badsig.token')

      expect(result).toBeNull()
      expect(getMockLogger().error).toHaveBeenCalledWith(
        expect.objectContaining({ failureCategory: 'signature' }),
        'Invalid JWT token provided'
      )
    })

    test('should not log token material when a decode error carries JWT artifacts', () => {
      const rawToken =
        'eyJhbGciOiJIUzI1NiJ9.eyJzYmkiOiIxMjM0NTYiLCJjbGllbnRSZWYiOiJDTElFTlQtUkVGLTk5OSJ9.sig-abc'
      // Simulate an @hapi/jwt error carrying token artifacts / decoded payload.
      const jwtError = new Error('Invalid token')
      jwtError.name = 'TokenError'
      jwtError.artifacts = {
        token: rawToken,
        decoded: { payload: { clientRef: 'CLIENT-REF-999', sbi: '123456' } }
      }
      jwtError.token = rawToken
      setupMockJwt(null, jwtError)

      const result = extractJwtPayload(rawToken)

      expect(result).toBeNull()

      const errorCall = getMockLogger().error.mock.calls.find(
        ([, msg]) => msg === 'Invalid JWT token provided'
      )
      expect(errorCall).toBeDefined()
      expect(errorCall[0]).toEqual({
        errorType: 'TokenError',
        errorMessage: 'Invalid token',
        failureCategory: 'structure'
      })

      // Nothing logged for this error should contain token material.
      const serialised = JSON.stringify(getMockLogger().error.mock.calls)
      expect(serialised).not.toContain(rawToken)
      expect(serialised).not.toContain('CLIENT-REF-999')
      expect(serialised).not.toContain('sig-abc')
    })

    test('should log only non-identifying payload presence flags', () => {
      const mockPayload = { sbi: '123456' } // missing source, grantCode, clientRef
      setupMockJwt(mockPayload)

      const result = extractJwtPayload('eyJ.partial.token')

      expect(result).toEqual(mockPayload)
      expect(getMockLogger().info).toHaveBeenCalledWith(
        {
          hasSbi: true,
          hasSource: false,
          hasClientRef: false,
          hasGrantCode: false
        },
        'JWT payload extracted'
      )
    })

    test('should not log identifying claim values (clientRef/grantCode/source)', () => {
      const mockPayload = {
        sbi: '123456',
        source: 'defra',
        clientRef: 'CLIENT-REF-123',
        grantCode: 'GRANT-CODE-XYZ'
      }
      setupMockJwt(mockPayload)

      extractJwtPayload('eyJ.identifying.token')

      const extractedCall = getMockLogger().info.mock.calls.find(
        ([, msg]) => msg === 'JWT payload extracted'
      )
      expect(extractedCall).toBeDefined()
      const serialised = JSON.stringify(extractedCall[0])
      expect(serialised).not.toContain('CLIENT-REF-123')
      expect(serialised).not.toContain('GRANT-CODE-XYZ')
      expect(serialised).not.toContain('defra')
    })
  })

  describe('extractJwtPayload - kid keyring', () => {
    const fullyHardenedPayload = () => {
      const iat = Math.floor(Date.now() / 1000)
      return {
        iss: 'fg-cw-frontend',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat,
        exp: iat + 300,
        source: 'entra',
        sbi: '123456'
      }
    }

    test('accepts a token with no kid using the default secret', () => {
      setupMockConfig(true, { enforce: true })
      setupMockJwt(fullyHardenedPayload(), null, {})

      const result = extractJwtPayload('eyJ.nokid.token')

      expect(result).not.toBeNull()
      expect(Jwt.token.verify).toHaveBeenCalledWith(expect.any(Object), {
        key: 'mock-jwt-secret',
        algorithms: ['HS256']
      })
    })

    test('accepts a token whose kid matches the default kid', () => {
      setupMockConfig(true, { enforce: true })
      setupMockJwt(fullyHardenedPayload(), null, { kid: 'agreements-hs256-1' })

      const result = extractJwtPayload('eyJ.defaultkid.token')

      expect(result).not.toBeNull()
      expect(Jwt.token.verify).toHaveBeenCalledWith(expect.any(Object), {
        key: 'mock-jwt-secret',
        algorithms: ['HS256']
      })
    })

    test('verifies a rotated kid using the keyring secret', () => {
      setupMockConfig(true, {
        enforce: true,
        keyring: { 'agreements-hs256-2': 'rotated-secret' }
      })
      setupMockJwt(fullyHardenedPayload(), null, { kid: 'agreements-hs256-2' })

      const result = extractJwtPayload('eyJ.rotatedkid.token')

      expect(result).not.toBeNull()
      expect(Jwt.token.verify).toHaveBeenCalledWith(expect.any(Object), {
        key: 'rotated-secret',
        algorithms: ['HS256']
      })
    })

    test('rejects a token whose kid is not in the keyring', () => {
      setupMockConfig(true, { enforce: true })
      setupMockJwt(fullyHardenedPayload(), null, { kid: 'unknown-kid' })

      const result = extractJwtPayload('eyJ.unknownkid.token')

      expect(result).toBeNull()
      expect(Jwt.token.verify).not.toHaveBeenCalled()
      expect(getMockLogger().error).toHaveBeenCalledWith(
        { kid: 'unknown-kid' },
        'Caller token kid is not in the verification keyring (FGP-1307)'
      )
    })
  })

  describe('extractJwtPayload - enforcement', () => {
    test('rejects a token missing hardened claims when enforcing', () => {
      setupMockConfig(true, { enforce: true })
      setupMockJwt({ source: 'defra', sbi: '123456' })

      const result = extractJwtPayload('eyJ.missingclaims.token')

      expect(result).toBeNull()
      expect(getMockLogger().warn).toHaveBeenCalledWith(
        expect.objectContaining({ missingClaims: expect.any(Array) }),
        'Caller token is missing hardened claims (FGP-1307); rejected'
      )
    })

    test('rejects a token whose audience excludes agreements-ui when enforcing', () => {
      const iat = Math.floor(Date.now() / 1000)
      setupMockConfig(true, { enforce: true })
      setupMockJwt({
        iss: 'fg-cw-frontend',
        aud: ['gas'],
        sub: '123456',
        iat,
        exp: iat + 300
      })

      const result = extractJwtPayload('eyJ.wrongaud.token')

      expect(result).toBeNull()
      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { aud: ['gas'] },
        'Caller token audience does not include agreements-ui (FGP-1307); rejected'
      )
    })

    test('rejects a token from an unknown issuer when enforcing', () => {
      const iat = Math.floor(Date.now() / 1000)
      setupMockConfig(true, { enforce: true })
      setupMockJwt({
        iss: 'attacker',
        aud: ['agreements-ui'],
        sub: '123456',
        iat,
        exp: iat + 300
      })

      const result = extractJwtPayload('eyJ.badiss.token')

      expect(result).toBeNull()
      expect(getMockLogger().warn).toHaveBeenCalledWith(
        { iss: 'attacker' },
        'Caller token issuer is not in the allowed producers list (FGP-1307); rejected'
      )
    })

    test('accepts a fully hardened token when enforcing', () => {
      const iat = Math.floor(Date.now() / 1000)
      setupMockConfig(true, { enforce: true })
      const payload = {
        iss: 'grants-ui',
        aud: ['agreements-ui', 'gas'],
        sub: '123456',
        iat,
        exp: iat + 300,
        source: 'defra',
        sbi: '123456'
      }
      setupMockJwt(payload)

      const result = extractJwtPayload('eyJ.valid.token')

      expect(result).toEqual(payload)
      expect(getMockLogger().warn).not.toHaveBeenCalled()
    })
  })
})
