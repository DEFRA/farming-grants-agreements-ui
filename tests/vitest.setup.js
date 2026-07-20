// Global Vitest setup to avoid crashes on environments lacking certain Node built-ins
// and to prevent loading heavy Pact native bindings during unit tests.
import { vi } from 'vitest'

// Mock missing built-in 'node:inspector/promises' (older Node versions)
vi.mock(
  'node:inspector/promises',
  () => ({
    open: async () => {},
    close: async () => {}
  }),
  { virtual: true }
)

// Mock Pact across the whole test suite
vi.mock(
  '@pact-foundation/pact',
  () => {
    class MockPact {
      addInteraction() {
        return this
      }
      given() {
        return this
      }
      uponReceiving() {
        return this
      }
      withRequest() {
        return this
      }
      willRespondWith() {
        return this
      }
      async executeTest(fn) {
        const mockServer = { url: 'http://localhost:3555' }
        await fn(mockServer)
      }
    }
    const passthrough = (v) => v
    return {
      Pact: MockPact,
      MatchersV2: { like: passthrough, iso8601DateTimeWithMillis: passthrough },
      MatchersV3: { like: passthrough, iso8601DateTimeWithMillis: passthrough }
    }
  },
  { virtual: true }
)

// Mock pino and hapi-pino to avoid pulling optional inspector integrations
vi.mock(
  'pino',
  () => ({
    pino: () => ({
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {}
    })
  }),
  { virtual: true }
)

vi.mock(
  'hapi-pino',
  () => ({
    default: {
      name: 'hapi-pino-mock',
      version: '0.0.0',
      register: async () => {}
    },
    plugin: {
      name: 'hapi-pino-mock',
      version: '0.0.0',
      register: async () => {}
    }
  }),
  { virtual: true }
)
