import { buildAgreementViewModel } from '../common/helpers/build-view-agreement-model.js'
import { getBaseUrl } from '../common/helpers/base-url.js'

export const viewAgreementController = {
  async handler(request, h) {
    const { agreementData, auth } = request.pre?.data || {}

    const baseUrl = getBaseUrl(request)
    if (
      agreementData?.status === 'offered' &&
      auth?.source === 'defra' &&
      !request.headers.referer?.endsWith(baseUrl)
    ) {
      return h.redirect(baseUrl)
    }

    return h.view('view-agreement/index', {
      pageTitle: 'Farm payments technical test agreement document',
      ...buildAgreementViewModel(agreementData)
    })
  }
}
