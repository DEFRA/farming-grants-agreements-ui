import { getAgreementCalculations } from '../common/helpers/get-agreement-calculations.js'

export const viewAgreementController = {
  async handler(request, h) {
    const { agreementData } = request.pre?.data || {}

    const agreementName =
      agreementData.agreementName || 'Sustainable Farming Incentive agreement'

    return h.view('view-agreement/index', {
      pageTitle: agreementName,
      agreementName,
      isDraftAgreement: agreementData?.status === 'offered',
      ...getAgreementCalculations(agreementData)
    })
  }
}
