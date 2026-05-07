import { formatDate } from 'date-fns'

export const formatApplicantName = (customer) => {
  const name = customer?.name
  if (!name) {
    return ''
  }

  return [name.title, name.first, name.middle, name.last]
    .filter((part) => part?.length)
    .map((part) => part.trim())
    .join(' ')
}

export const getAgreementStatusFlags = (agreementData = {}) => {
  const isDraftAgreement = agreementData?.status === 'offered'
  const isAgreementAccepted = agreementData?.status === 'accepted'
  const isWithdrawnAgreement = agreementData?.status === 'withdrawn'
  const isCancelledAgreement = agreementData?.status === 'cancelled'
  const isTerminatedAgreement = agreementData?.status === 'terminated'

  return {
    isDraftAgreement,
    isAgreementAccepted,
    isWithdrawnAgreement,
    isCancelledAgreement,
    isTerminatedAgreement
  }
}

export const shouldMaskAgreementPartyDetails = (statusFlags) =>
  statusFlags.isDraftAgreement ||
  statusFlags.isWithdrawnAgreement ||
  statusFlags.isCancelledAgreement

export const maskIfRequired = (value, shouldMask) =>
  shouldMask ? 'XXXXX' : (value ?? '')

export const formatAgreementDate = (value, shouldMask) => {
  if (shouldMask) {
    return 'XXXXX'
  }

  if (!value) {
    return ''
  }

  return formatDate(value, 'd MMMM yyyy')
}
