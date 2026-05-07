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
    const answers = agreementData.answers ?? {}
    const applicant = answers.applicant ?? {}
    const business = applicant.business ?? {}
    const customer = applicant.customer ?? {}
    const address = business.address ?? {}
    const capitalItems = mapWmpCapitalItems(answers)
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
      landParcels: mapWmpLandParcels(answers),
      capitalItems,
      agreementTotalPayment: formatPenceCurrency(
        getAgreementTotalPaymentPence(answers, capitalItems)
      ),
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

const mapWmpCapitalItem = (item) => ({
  code: item.code,
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  totalPaymentPence: item.agreementTotalPence
})

const mapWmpCapitalItems = (answers = {}) =>
  (answers.payments?.agreement ?? []).map((item) => ({
    ...mapWmpCapitalItem(item),
    totalPayment: formatPenceCurrency(item.agreementTotalPence)
  }))

const mapWmpLandParcels = (answers = {}) =>
  (answers.landParcels ?? []).map((parcel) => ({
    parcelId: parcel.parcelId,
    areaHa: parcel.areaHa
  }))

const getAgreementTotalPaymentPence = (answers = {}, capitalItems = []) =>
  answers.totalAgreementPaymentPence ??
  capitalItems.reduce(
    (sum, item) => sum + (Number(item.totalPaymentPence) || 0),
    0
  )

const getAgreementNumber = (agreementData = {}) =>
  agreementData.answers?.referenceNumber ||
  agreementData.clientRef ||
  agreementData.agreementNumber ||
  ''
