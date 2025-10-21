import { createServer } from '../server.js'

describe('#offerAcceptedController', () => {
  let server

  beforeAll(async () => {
    globalThis.fetch = vi.fn()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should call the backend API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    await server.inject({
      method: 'GET',
      url: '/SFI123456789',
      headers: {
        'x-encrypted-auth': 'mock-auth'
      }
    })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3555/SFI123456789', {
      headers: {
        'Content-Type': 'application/json',
        'x-encrypted-auth': 'mock-auth'
      },
      method: 'POST'
    })
  })
})
