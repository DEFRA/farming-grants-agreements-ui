import { buildAgreementViewModel } from '../common/helpers/build-view-agreement-model.js'
import { getBaseUrl } from '../common/helpers/base-url.js'

export const viewAgreementController = {
  async handler(request, h) {
    const { agreementData, auth } = request.pre?.data || {}

    if (
      agreementData?.status === 'offered' &&
      auth?.source === 'defra' &&
      request.params.mode !== 'print'
    ) {
      return h.redirect(getBaseUrl(request))
    }

    return h.view('view-agreement/index', {
      pageTitle: 'Farm payments technical test agreement document',
      ...buildAgreementViewModel(agreementData)
    })
  }
}
