// Test-only stub for '@pact-foundation/pact' to avoid loading native bindings
// and transitive modules that may not be available in the local Node runtime.

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

export { MockPact as Pact }
export const MatchersV2 = {
  like: passthrough,
  iso8601DateTimeWithMillis: passthrough
}
export const MatchersV3 = {
  like: passthrough,
  iso8601DateTimeWithMillis: passthrough
}

export default {
  Pact: MockPact,
  MatchersV2,
  MatchersV3
}
