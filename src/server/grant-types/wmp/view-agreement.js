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
  template: 'grant-types/wmp/view-agreement',
  buildModel: ({ agreementData }) => {
    const statusFlags = getAgreementStatusFlags(agreementData)
    const shouldMask = shouldMaskAgreementPartyDetails(statusFlags)
    const applicant =
      agreementData.answers?.applicant ?? agreementData.applicant ?? {}
    const business = applicant.business ?? {}
    const customer = applicant.customer ?? {}
    const address = business.address ?? {}
    const payment = agreementData.payment ?? {}
    const landParcels = buildLandParcels(agreementData)
    const capitalItems = buildCapitalItems(agreementData)
    const agreementTotalPaymentPence = getAgreementTotalPaymentPence(
      agreementData,
      capitalItems
    )

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
      landParcels,
      capitalItems,
      agreementTotalPayment: formatPenceCurrency(agreementTotalPaymentPence),
      acceptedOn: statusFlags.isAgreementAccepted
        ? formatAgreementDate(agreementData.updatedAt, false)
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

const mapAnswerCapitalItem = (item) => ({
  code: item.code,
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  totalPaymentPence: item.agreementTotalPence
})

const mapPaymentCapitalItem = (item, agreementData) => ({
  code: item.code,
  description:
    item.description?.replace(`${item.code}: `, '') ?? item.description,
  quantity:
    firstDefined(
      item.quantity,
      getNested(agreementData, ['answers', 'totalHectaresAppliedFor'])
    ) ?? '',
  unit: item.unit ?? 'ha',
  totalPaymentPence:
    firstDefined(item.agreementTotalPence, item.annualPaymentPence) ?? 0
})

const buildCapitalItems = (agreementData = {}) => {
  const answerItems = firstNonEmptyArray(
    agreementData.answers?.payments?.agreement,
    agreementData.answers?.payments?.items
  )

  const items = answerItems.length
    ? answerItems.map(mapAnswerCapitalItem)
    : Object.values(agreementData.payment?.agreementLevelItems ?? {}).map(
        (item) => mapPaymentCapitalItem(item, agreementData)
      )

  return items.map((item) => ({
    ...item,
    totalPayment: formatPenceCurrency(item.totalPaymentPence)
  }))
}

const buildLandParcels = (agreementData = {}) => {
  const answerParcels = firstNonEmptyArray(
    agreementData.answers?.landParcels,
    agreementData.answers?.parcels
  )

  if (answerParcels.length) {
    return answerParcels.map((parcel) => ({
      parcelId: parcel.parcelId,
      areaHa: firstDefined(parcel.areaHa, parcel.area?.quantity) ?? ''
    }))
  }

  return (agreementData.application?.parcel ?? []).map((parcel) => ({
    parcelId:
      firstDefined(
        parcel.parcelId && parcel.sheetId
          ? `${parcel.sheetId} ${parcel.parcelId}`
          : undefined,
        parcel.parcelId
      ) ?? '',
    areaHa: firstDefined(parcel.areaHa, parcel.area?.quantity) ?? ''
  }))
}

const getAgreementTotalPaymentPence = (agreementData = {}, capitalItems = []) =>
  firstDefined(
    agreementData.answers?.totalAgreementPaymentPence,
    agreementData.payment?.agreementTotalPence,
    capitalItems.reduce(
      (sum, item) => sum + (Number(item.totalPaymentPence) || 0),
      0
    )
  ) ?? 0

const getAgreementNumber = (agreementData = {}) =>
  agreementData.answers?.referenceNumber ||
  agreementData.clientRef ||
  agreementData.agreementNumber ||
  ''
const getNested = (obj, path) => path.reduce((value, key) => value?.[key], obj)

const firstDefined = (...values) => values.find((value) => value !== undefined)

const firstNonEmptyArray = (...values) =>
  values.find((value) => Array.isArray(value) && value.length > 0) ?? []
