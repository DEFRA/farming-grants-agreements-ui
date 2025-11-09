import { getAgreementCalculations } from '../common/helpers/get-agreement-calculations.js'

export const viewAgreementController = {
  async handler(request, h) {
    const { agreementData } = request.pre?.data || {}

    const {
      applicant: {
        business: {
          address: {
            line1,
            line2,
            line3,
            line4,
            line5,
            street,
            city,
            postalCode
          } = {}
        } = {}
      } = {}
    } = agreementData

    const agreementName =
      agreementData.agreementName || 'Sustainable Farming Incentive agreement'

    return h.view('view-agreement/index', {
      pageTitle: agreementName,
      agreementName,
      address: [line1, line2, line3, line4, line5, street, city, postalCode]
        .filter(Boolean)
        .join(', '),
      showWatermark: agreementData?.status === 'offered',
      ...getAgreementCalculations(agreementData)
    })
  }
}
