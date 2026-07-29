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
      logger: {
        error: vi.fn()
      },
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

    it.each([
      {
        component: 'checkboxes',
        name: 'confirm',
        items: [{ value: 'confirmed', html: '<img src=x onerror=alert(1)>' }]
      },
      {
        component: 'checkboxes',
        name: 'confirm',
        items: [
          {
            value: 'confirmed',
            text: 'Confirm',
            attributes: { onclick: 'alert(1)' }
          }
        ]
      },
      {
        component: 'checkboxes',
        name: 'confirm',
        attributes: 'onclick="alert(1)"',
        items: [{ value: 'confirmed', text: 'Confirm' }]
      },
      {
        component: 'checkboxes',
        name: 'confirm',
        attributes: null,
        items: [{ value: 'confirmed', text: 'Confirm' }]
      }
    ])('rejects unsafe checkbox content before rendering', (checkboxes) => {
      mockRequest.pre.data = { components: [checkboxes] }

      expect(() =>
        configDrivenAgreementController.handler(mockRequest, mockH)
      ).toThrow('Unsupported agreement checkbox content')
      expect(mockH.view).not.toHaveBeenCalled()
    })

    it('rejects an unsupported component and logs its type outside production', () => {
      mockRequest.pre.data = {
        components: [{ component: 'unsupported-widget' }]
      }

      expect(() =>
        configDrivenAgreementController.handler(mockRequest, mockH)
      ).toThrow('Unsupported agreement component')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { componentType: 'unsupported-widget' },
        'Unsupported agreement component'
      )
      expect(mockH.view).not.toHaveBeenCalled()
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
    it('proxies a GAS Agreement action through the Agreements UI base path', () => {
      vi.mocked(baseUrlHelper.getBaseUrl).mockReturnValue('/agreement')
      mockRequest.pre.data = {
        actions: [
          {
            href: '/agreements/PMF123/actions/accept',
            text: 'Accept agreement'
          }
        ]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      const model = mockH.view.mock.calls[0][1]
      expect(model.actions[0].href).toBe('/agreement/PMF123/actions/accept')
    })

    it('rejects an absolute action URL through the existing error handling', () => {
      mockRequest.pre.data = {
        actions: [{ href: 'https://example.com/external', text: 'External' }]
      }

      expect(() =>
        configDrivenAgreementController.handler(mockRequest, mockH)
      ).toThrow('Unsupported agreement action URL')
      expect(mockH.view).not.toHaveBeenCalled()
    })

    it('rejects an action path containing a query string', () => {
      const href = '/agreements/PMF123/actions/accept?confirmation=true'
      mockRequest.pre.data = {
        actions: [{ href, text: 'Accept' }]
      }

      expect(() =>
        configDrivenAgreementController.handler(mockRequest, mockH)
      ).toThrow('Unsupported agreement action URL')
      expect(mockH.view).not.toHaveBeenCalled()
    })

    it('rejects an unsupported action path through the existing error handling', () => {
      mockRequest.pre.data = {
        actions: [{ href: '/agreement/PMF123/accept', text: 'Accept' }]
      }

      expect(() =>
        configDrivenAgreementController.handler(mockRequest, mockH)
      ).toThrow('Unsupported agreement action URL')
      expect(mockH.view).not.toHaveBeenCalled()
    })

    it.each([
      '/agreements/../actions/accept',
      '/agreements/%2e%2e/actions/accept'
    ])('rejects an action path containing a traversal segment: %s', (href) => {
      mockRequest.pre.data = {
        actions: [{ href, text: 'Accept' }]
      }

      expect(() =>
        configDrivenAgreementController.handler(mockRequest, mockH)
      ).toThrow('Unsupported agreement action URL')
      expect(mockH.view).not.toHaveBeenCalled()
    })

    it('does not apply GAS href translation to a POST form target', () => {
      vi.mocked(baseUrlHelper.getBaseUrl).mockReturnValue('/agreement')
      mockRequest.pre.data = {
        actions: [
          {
            action: '/agreements/PMF123/actions/accept',
            method: 'POST',
            text: 'Accept agreement'
          }
        ]
      }

      configDrivenAgreementController.handler(mockRequest, mockH)

      const model = mockH.view.mock.calls[0][1]
      expect(model.actions[0].action).toBe(
        '/agreement/agreements/PMF123/actions/accept'
      )
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
