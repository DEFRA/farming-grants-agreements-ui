import { buildAgreementViewModel } from '../common/helpers/build-view-agreement-model.js'

export const viewAgreementController = {
  async handler(request, h) {
    const { agreementData } = request.pre?.data || {}

    return h.view('view-agreement/index', {
      pageTitle: 'Farm payments technical test agreement document',
      ...buildAgreementViewModel(agreementData)
    })
  }
}
