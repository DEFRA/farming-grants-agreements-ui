import { formatDate } from 'date-fns'
import * as agreementCalcs from './get-agreement-calculations.js'

const formatApplicantName = (customer) => {
  const name = customer?.name
  if (!name) {
    return ''
  }

  return [name.title, name.first, name.middle, name.last]
    .filter((part) => part?.length)
    .map((part) => part.trim())
    .join(' ')
}

export const buildAgreementViewModel = (agreementData) => {
  const isDraftAgreement = agreementData?.status === 'offered'
  const isAgreementAccepted = agreementData?.status === 'accepted'
  const isWithdrawnAgreement = agreementData?.status === 'withdrawn'

  let businessName = agreementData.applicant.business.name
  let applicantName = formatApplicantName(agreementData.applicant.customer)
  const agreementName = `${businessName} FPTT`
  let agreementStartDate = formatDate(
    agreementData.payment.agreementStartDate,
    'd MMMM yyyy'
  )
  let agreementEndDate = formatDate(
    agreementData.payment.agreementEndDate,
    'd MMMM yyyy'
  )

  if (isDraftAgreement || isWithdrawnAgreement) {
    businessName = 'XXXXX'
    applicantName = 'XXXXX'
    agreementStartDate = 'XXXXX'
    agreementEndDate = 'XXXXX'
  }

  return {
    agreementName,
    agreementStartDate,
    agreementEndDate,
    isDraftAgreement,
    isAgreementAccepted,
    isWithdrawnAgreement,
    businessName,
    applicantName,
    ...agreementCalcs.getAgreementCalculations(agreementData)
  }
}
