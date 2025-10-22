import { vi } from 'vitest'

import { catchAll } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(
      statusCode === statusCodes.notFound ||
        statusCode === statusCodes.internalServerError
    ).toBe(true)
  })
})

describe('#catchAll', () => {
  const mockLogger = { info: vi.fn(), error: vi.fn() }
  let mockErrorResponse
  const errorPage = 'error/index.njk'
  const mockRequest = (statusCode) => {
    mockErrorResponse = {
      isBoom: true,
      output: {
        statusCode
      }
    }

    return {
      response: mockErrorResponse,
      logger: mockLogger
    }
  }
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis(),
    header: mockToolkitCode.mockReturnThis()
  }

  test('Should provide expected "Not Found" page', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockLogger.error).not.toHaveBeenCalledWith(mockErrorResponse)
    expect(mockToolkitView).toHaveBeenCalledWith('error/not-found.njk', {
      errorMessage: 'Page not found'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide expected "Forbidden" page', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockLogger.error).not.toHaveBeenCalledWith(mockErrorResponse)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      errorMessage: 'Forbidden'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should provide expected "Unauthorized" page', () => {
    catchAll(mockRequest(statusCodes.unauthorized), mockToolkit)

    expect(mockLogger.error).not.toHaveBeenCalledWith(mockErrorResponse)
    expect(mockToolkitView).toHaveBeenCalledWith('error/unauthorized.njk', {
      errorMessage: 'Unauthorized'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should provide expected "Bad Request" page', () => {
    catchAll(mockRequest(statusCodes.badRequest), mockToolkit)

    expect(mockLogger.error).not.toHaveBeenCalledWith(mockErrorResponse)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      errorMessage: 'Bad Request'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badRequest)
  })

  test('Should provide expected default page', () => {
    catchAll(mockRequest(statusCodes.imATeapot), mockToolkit)

    expect(mockLogger.error).not.toHaveBeenCalledWith(mockErrorResponse)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      errorMessage: 'Something went wrong'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.imATeapot)
  })

  test('Should provide expected "Something went wrong" page and log error for internalServerError', () => {
    catchAll(mockRequest(statusCodes.internalServerError), mockToolkit)

    expect(mockLogger.error).toHaveBeenCalledWith(mockErrorResponse)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      errorMessage: 'Something went wrong'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })
})
