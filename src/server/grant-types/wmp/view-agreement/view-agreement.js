import { formatPenceCurrency } from '#~/config/nunjucks/filters/format-currency.js'
import {
  formatAgreementDate,
  formatApplicantName,
  getAgreementStatusFlags,
  maskIfRequired,
  shouldMaskAgreementPartyDetails
} from '#~/server/grant-types/shared/view-agreement.js'

const WMP_AGREEMENT_TITLE = 'Woodland Management Plan PA3 agreement document'

export const viewAgreement = {
  template: 'grant-types/wmp/view-agreement/view-agreement',
  buildModel: ({ agreementData }) => {
    const statusFlags = getAgreementStatusFlags(agreementData)
    const shouldMask = shouldMaskAgreementPartyDetails(statusFlags)
    const applicant = agreementData.applicant ?? {}
    const business = applicant.business ?? {}
    const customer = applicant.customer ?? {}
    const address = business.address ?? {}
    const capitalItems = mapWmpCapitalItems(agreementData)
    const payment = agreementData.payment ?? {}

    return {
      pageTitle: WMP_AGREEMENT_TITLE,
      agreementTitle: WMP_AGREEMENT_TITLE,
      agreementNumber: getAgreementNumber(agreementData),
      agreementHolderName: maskIfRequired(business.name, shouldMask),
      applicantName: maskIfRequired(formatApplicantName(customer), shouldMask),
      address: maskIfRequired(buildAddress(address), shouldMask),
      sbi: agreementData.identifiers?.sbi ?? '',
      agreementStartDate: formatAgreementDate(
        payment.agreementStartDate,
        shouldMask
      ),
      agreementEndDate: formatAgreementDate(
        payment.agreementEndDate,
        shouldMask
      ),
      landParcels: mapWmpLandParcels(agreementData),
      capitalItems,
      agreementTotalPayment: formatPenceCurrency(
        agreementData.payment?.agreementTotalPence
      ),
      acceptedOn: statusFlags.isAgreementAccepted
        ? formatAgreementDate(agreementData.signatureDate, false)
        : '',
      ...statusFlags
    }
  }
}

const buildAddress = (address = {}) =>
  [
    address.line1,
    address.line2,
    address.line3,
    address.line4,
    address.line5,
    address.street,
    address.city,
    address.postalCode
  ]
    .filter(Boolean)
    .join(', ')

const mapWmpCapitalItems = (agreementData = {}) => {
  const items = Object.values(agreementData.payment?.agreementLevelItems ?? {})

  return items.map((item) => ({
    code: item.code,
    description: item.description,
    quantity: formatArea(item.quantity)
  }))
}

const toFiniteNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined
  }

  const decimalValue = value.$numberDecimal ?? value
  const numberValue = Number(decimalValue)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const formatArea = (value) => {
  const numberValue = toFiniteNumber(value)
  return numberValue === undefined ? '' : Number(numberValue.toFixed(4))
}

const mapWmpLandParcels = (agreementData = {}) => {
  const applicationParcels = agreementData.application?.parcel ?? []
  return applicationParcels.map((parcel) => ({
    parcelId: parcel.parcelId,
    areaHa: formatArea(parcel.area?.quantity ?? parcel.areaHa)
  }))
}

const getAgreementNumber = (agreementData = {}) =>
  agreementData.clientRef || agreementData.agreementNumber || ''
