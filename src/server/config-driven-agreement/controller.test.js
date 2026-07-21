import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configDrivenAgreementController } from './controller.js'
import * as baseUrlHelper from '#~/server/common/helpers/base-url.js'

vi.mock('#~/server/common/helpers/base-url.js', () => ({
  getBaseUrl: vi.fn()
}))

describe('configDrivenAgreementController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      pre: {
        data: {}
      },
      log: vi.fn(),
      headers: {}
    }
    mockH = {
      view: vi.fn().mockReturnValue('rendered-view')
    }
    vi.mocked(baseUrlHelper.getBaseUrl).mockReturnValue('/')
  })

  describe('handler', () => {
    it('should render the page with default model when no data is provided', () => {
      mockRequest.pre.data = {}

      const result = configDrivenAgreementController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'config-driven-agreement/page',
        expect.objectContaining({
          pageTitle: 'Agreement',
          components: [],
          actions: [],
          errors: [],
          hasWatermark: false,
          layout: 'default'
        })
      )
      expect(result).toBe('rendered-view')
    })

    it('should use renderModel.page.title for pageTitle if available', () => {
      mockRequest.pre.data = {
        page: { title: 'Custom Title' }
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'config-driven-agreement/page',
        expect.objectContaining({
          pageTitle: 'Custom Title'
        })
      )
    })

    it('should use renderModel.title for pageTitle if renderModel.page.title is missing', () => {
      mockRequest.pre.data = {
        title: 'Model Title'
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'config-driven-agreement/page',
        expect.objectContaining({
          pageTitle: 'Model Title'
        })
      )
    })

    it('should set hasWatermark to true if a watermark component exists', () => {
      mockRequest.pre.data = {
        components: [{ component: 'watermark' }]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'config-driven-agreement/page',
        expect.objectContaining({
          hasWatermark: true
        })
      )
    })

    it('should use renderModel.content if renderModel.components is missing', () => {
      mockRequest.pre.data = {
        content: [{ component: 'paragraph', text: 'hello' }]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'config-driven-agreement/page',
        expect.objectContaining({
          components: [{ component: 'paragraph', text: 'hello' }]
        })
      )
    })

    it('should use renderModel.page.layout if available', () => {
      mockRequest.pre.data = {
        page: { layout: 'document' }
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'config-driven-agreement/page',
        expect.objectContaining({
          layout: 'document'
        })
      )
    })

    it('should use renderModel.layout if renderModel.page.layout is missing', () => {
      mockRequest.pre.data = {
        layout: 'custom-layout'
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'config-driven-agreement/page',
        expect.objectContaining({
          layout: 'custom-layout'
        })
      )
    })
  })

  describe('buildProxiedPath logic (via buildActions)', () => {
    it('should not modify absolute URLs', () => {
      mockRequest.pre.data = {
        actions: [
          { href: 'https://example.com/external', text: 'External' },
          { action: 'http://example.com/api', text: 'API' }
        ]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      const model = mockH.view.mock.calls[0][1]
      expect(model.actions[0].href).toBe('https://example.com/external')
      expect(model.actions[1].action).toBe('http://example.com/api')
    })

    it('should not modify anchor links', () => {
      mockRequest.pre.data = {
        actions: [{ href: '#main-content', text: 'Skip' }]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      const model = mockH.view.mock.calls[0][1]
      expect(model.actions[0].href).toBe('#main-content')
    })

    it('should join baseUrl with relative paths', () => {
      vi.mocked(baseUrlHelper.getBaseUrl).mockReturnValue('/my-proxy')
      mockRequest.pre.data = {
        actions: [{ href: 'submit', text: 'Submit' }]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      const model = mockH.view.mock.calls[0][1]
      expect(model.actions[0].href).toBe('/my-proxy/submit')
    })

    it('should not modify path if it already starts with baseUrl', () => {
      vi.mocked(baseUrlHelper.getBaseUrl).mockReturnValue('/my-proxy')
      mockRequest.pre.data = {
        actions: [
          { href: '/my-proxy', text: 'Home' },
          { href: '/my-proxy/details', text: 'Details' }
        ]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      const model = mockH.view.mock.calls[0][1]
      expect(model.actions[0].href).toBe('/my-proxy')
      expect(model.actions[1].href).toBe('/my-proxy/details')
    })

    it('should handle undefined values in buildProxiedPath gracefully', () => {
      mockRequest.pre.data = {
        actions: [{ text: 'No href' }]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      const model = mockH.view.mock.calls[0][1]
      expect(model.actions[0]).not.toHaveProperty('href')
    })
  })
})
