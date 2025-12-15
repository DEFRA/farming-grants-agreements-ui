import { getAgreementCalculations } from './get-agreement-calculations.js'
import { formatDate } from 'date-fns'

/**
 * Checks whether any parcel item attached to an agreement matches the given code.
 * Safely handles agreements that lack payment data by returning false.
 *
 * @param {object} agreementData - Agreement data payload that may include parcel items
 * @param {string} parcelCode - Code to look for within the parcel items
 * @returns {boolean} True when at least one parcel item has the provided code
 */
export const hasLeastOneGivenParcelCode = (agreementData, parcelCode) => {
  const parcelItems = agreementData?.payment?.parcelItems
  if (!parcelItems) {
    return false
  }

  return Object.values(parcelItems).some(
    (parcelItem) => parcelItem?.code === parcelCode
  )
}

const formatApplicantName = (customer) => {
  const name = customer?.name
  if (!name) {
    return ''
  }

  if (typeof name === 'string') {
    return name
  }

  const parts = [name.title, name.first, name.middle, name.last]
    .map((part) => (typeof part === 'string' ? part.trim() : part))
    .filter((part) => part?.length)

  return parts.join(' ')
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
    isCMOR1ActionUsed: hasLeastOneGivenParcelCode(agreementData, 'CMOR1'),
    businessName,
    applicantName,
    ...getAgreementCalculations(agreementData)
  }
}
