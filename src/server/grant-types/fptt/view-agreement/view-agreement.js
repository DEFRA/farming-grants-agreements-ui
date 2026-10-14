import * as agreementCalcs from '#~/server/common/helpers/get-agreement-calculations.js'
import {
  formatAgreementDate,
  formatApplicantName,
  getAgreementStatusFlags,
  maskIfRequired,
  shouldMaskAgreementPartyDetails
} from '#~/server/grant-types/shared/view-agreement.js'

const buildAgreementViewModel = (agreementData) => {
  const statusFlags = getAgreementStatusFlags(agreementData)
  const shouldMask = shouldMaskAgreementPartyDetails(statusFlags)

  return {
    agreementName: `${agreementData.applicant.business.name} FPTT`,
    agreementStartDate: formatAgreementDate(
      agreementData.payment.agreementStartDate,
      shouldMask
    ),
    agreementEndDate: formatAgreementDate(
      agreementData.payment.agreementEndDate,
      shouldMask
    ),
    businessName: maskIfRequired(
      agreementData.applicant.business.name,
      shouldMask
    ),
    applicantName: maskIfRequired(
      formatApplicantName(agreementData.applicant.customer),
      shouldMask
    ),
    ...statusFlags,
    ...agreementCalcs.getAgreementCalculations(agreementData)
  }
}

export const viewAgreement = {
  template: 'grant-types/fptt/view-agreement/view-agreement',
  buildModel: ({ agreementData }) => ({
    pageTitle: 'Farm payments technical test agreement document',
    ...buildAgreementViewModel(agreementData)
  })
}
