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
  const fallbackParcelArea =
    items.length === 1 ? sumLandParcelAreas(agreementData) : undefined

  return items.map((item) => ({
    code: item.code,
    description: item.description,
    quantity: formatArea(
      getCapitalItemQuantity(item, agreementData, fallbackParcelArea)
    ),
    unit: item.unit ?? 'ha',
    totalPaymentPence: item.agreementTotalPence ?? item.annualPaymentPence ?? 0,
    totalPayment: formatPenceCurrency(
      item.agreementTotalPence ?? item.annualPaymentPence ?? 0
    )
  }))
}

const getCapitalItemQuantity = (item, agreementData, fallbackParcelArea) => {
  const itemQuantity = toFiniteNumber(item.quantity)

  if (itemQuantity !== undefined) {
    return itemQuantity
  }

  const actionQuantity = sumAppliedForQuantitiesByCode(
    agreementData.actionApplications,
    item.code
  )

  return actionQuantity ?? fallbackParcelArea
}

const sumAppliedForQuantitiesByCode = (actionApplications = [], code) => {
  const matchingQuantities = actionApplications
    .filter((action) => action.code === code)
    .map((action) => toFiniteNumber(action.appliedFor?.quantity))
    .filter((quantity) => quantity !== undefined)

  if (matchingQuantities.length === 0) {
    return undefined
  }

  return matchingQuantities.reduce((total, quantity) => total + quantity, 0)
}

const sumLandParcelAreas = (agreementData = {}) => {
  const parcelAreas = (agreementData.application?.parcel ?? [])
    .map((parcel) => toFiniteNumber(parcel.area?.quantity ?? parcel.areaHa))
    .filter((quantity) => quantity !== undefined)

  if (parcelAreas.length === 0) {
    return undefined
  }

  return parcelAreas.reduce((total, quantity) => total + quantity, 0)
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
