import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getBaseUrl } from '#~/server/common/helpers/base-url.js'

import { buildViewModel } from './build-view-model.js'
import { configDrivenAgreementController } from './controller.js'
import { validateComponents } from './validate-components.js'

vi.mock('#~/server/common/helpers/base-url.js')
vi.mock('./build-view-model.js')
vi.mock('./validate-components.js')

describe('configDrivenAgreementController', () => {
  let request
  let h
  let viewResponse

  beforeEach(() => {
    request = {
      pre: {
        data: {
          components: [{ component: 'paragraph', text: 'Hello' }]
        }
      },
      logger: { error: vi.fn() }
    }
    viewResponse = {
      header: vi.fn().mockReturnValue('rendered-view')
    }
    h = {
      view: vi.fn().mockReturnValue(viewResponse)
    }
    vi.mocked(getBaseUrl).mockReturnValue('/agreement')
    vi.mocked(buildViewModel).mockReturnValue({ pageTitle: 'Agreement' })
  })

  it('validates, adapts and renders the GAS page model', () => {
    const result = configDrivenAgreementController.handler(request, h)

    expect(validateComponents).toHaveBeenCalledWith(
      request.pre.data.components,
      request.logger
    )
    expect(buildViewModel).toHaveBeenCalledWith(
      request.pre.data,
      '/agreement',
      {
        queryAuthentication: undefined,
        transportMetadata: undefined
      }
    )
    expect(h.view).toHaveBeenCalledWith('config-driven-agreement/page', {
      pageTitle: 'Agreement'
    })
    expect(viewResponse.header).toHaveBeenCalledWith(
      'Referrer-Policy',
      'no-referrer'
    )
    expect(result).toBe('rendered-view')
  })

  it('uses an empty model when pre-handler data is missing', () => {
    request.pre = undefined

    configDrivenAgreementController.handler(request, h)

    expect(validateComponents).toHaveBeenCalledWith([], request.logger)
    expect(buildViewModel).toHaveBeenCalledWith({}, '/agreement', {
      queryAuthentication: undefined,
      transportMetadata: undefined
    })
  })
})
