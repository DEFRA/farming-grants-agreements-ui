import { createServer } from '../server.js'

describe('#acceptOfferController', () => {
  let server

  beforeAll(async () => {
    globalThis.fetch = vi.fn()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should call the backend API before accepting', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    await server.inject({
      method: 'POST',
      url: '/SFI123456789',
      headers: {
        'x-encrypted-auth': 'mock-auth'
      },
      payload: {
        action: 'display-accept'
      }
    })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3555/SFI123456789', {
      headers: {
        'x-encrypted-auth': 'mock-auth'
      },
      method: 'GET'
    })
  })

  test('should call the backend API when accepting', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    await server.inject({
      method: 'POST',
      url: '/SFI123456789',
      headers: {
        'x-encrypted-auth': 'mock-auth'
      },
      payload: {
        action: 'accept-offer'
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
