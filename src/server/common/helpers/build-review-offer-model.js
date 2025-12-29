import { differenceInYears, parseISO } from 'date-fns'
import {
  calculateFirstPaymentForAgreementLevelItem,
  calculateFirstPaymentForParcelItem,
  calculateSubsequentPaymentForAgreementLevelItem,
  calculateSubsequentPaymentForParcelItem,
  calculateTotalFirstPayment,
  calculateTotalSubsequentPayment
} from './payment-calculations.js'
import { formatPenceCurrency } from '../../../config/nunjucks/filters/format-currency.js'

/**
 * Creates a summary of actions for the agreement
 * Split into small helpers to keep cognitive complexity low while preserving behaviour
 * @param {object} agreementData - The agreement data object (or wrapped under agreementData)
 * @returns Object containing headings and data for the summary of actions table
 */
const getSummaryOfActions = (agreementData) => {
  // Support both shapes: raw agreement or { agreementData: { ... } }
  const root = agreementData?.agreementData ?? agreementData
  const payment = root?.payment || {}
  const application = root?.application || {}

  const headings = buildSummaryHeadings()
  const codeDescriptions = buildCodeDescriptions(payment)

  const data = buildSummaryRows(normalizeParcels(application), codeDescriptions)

  return { summaryOfActions: { headings, data } }
}

// Static headings for the summary table
const buildSummaryHeadings = () => [
  { text: 'Action' },
  { text: 'Code' },
  { text: 'Land parcel' },
  { text: 'Quantity (ha)' },
  { text: 'Duration' }
]

// Ensure we always work with an array of parcels
const normalizeParcels = (application) =>
  Array.isArray(application?.parcel) ? application.parcel : []

// Human readable years label
const formatDuration = (yearsRaw) => {
  const years = Number(yearsRaw) || 0
  const label = years === 1 ? 'year' : 'years'
  return `${years} ${label}`.trim()
}

// Build a single row for a parcel action
const buildActionRow = (parcel, action, codeDescriptions) => [
  { text: codeDescriptions[action?.code] || '' },
  { text: action?.code || '' },
  { text: `${parcel?.sheetId ?? ''} ${parcel?.parcelId ?? ''}` },
  { text: Number((action?.appliedFor?.quantity ?? 0).toFixed(4)) },
  { text: formatDuration(action?.durationYears) }
]

// Build all rows using a single pass and small helpers
const buildSummaryRows = (parcels, codeDescriptions) =>
  parcels.flatMap((parcel) => {
    const actions = Array.isArray(parcel?.actions) ? parcel.actions : []
    return actions.map((action) =>
      buildActionRow(parcel, action, codeDescriptions)
    )
  })

// Build a map of code -> description using both parcel and agreement-level items
const buildCodeDescriptions = (payment) => ({
  ...Object.values(payment?.parcelItems || {}).reduce((prev, i) => {
    const desc = (i?.description || '').replace(`${i?.code}: `, '')
    return i?.code ? { ...prev, [i.code]: desc || i?.description || '' } : prev
  }, {}),
  ...Object.values(payment?.agreementLevelItems || {}).reduce((prev, i) => {
    const desc = (i?.description || '').replace(`${i?.code}: `, '')
    return i?.code ? { ...prev, [i.code]: desc || i?.description || '' } : prev
  }, {})
})

// Calculate duration in years using date-fns (fallback to 1 if dates are missing/invalid)
const calculateDurationInYears = (payment) => {
  let durationInYears = 1
  try {
    if (payment?.agreementEndDate && payment?.agreementStartDate) {
      const end = parseISO(payment.agreementEndDate)
      const start = parseISO(payment.agreementStartDate)
      const diff = differenceInYears(end, start)
      durationInYears = Number.isFinite(diff) && diff > 0 ? diff : 1
    }
  } catch {
    durationInYears = 1
  }
  return durationInYears
}

// Safely pick the last quarterly payment (undefined if none)
const getQuarterlyPayment = (payment) =>
  payment?.payments?.[payment?.payments?.length - 1]

// Build the flattened payments rows for parcel and agreement level items
const buildPayments = (
  payment,
  codeDescriptions,
  durationInYears,
  quarterlyPayment
) => {
  const parcelRows = Object.entries(payment?.parcelItems || {}).map(
    ([key, i]) => ({
      ...i,
      description: codeDescriptions[i?.code] || i?.description || '',
      rateInPence: formatPenceCurrency(i?.rateInPence || 0),
      unit: (i?.unit || '').replace(/s$/, ''),
      duration: durationInYears,
      hasOneOffPayment: false,
      quarterlyPayment: quarterlyPayment?.lineItems?.find(
        (li) => li.parcelItemId === Number(key)
      )?.paymentPence,
      firstPaymentPence: calculateFirstPaymentForParcelItem(
        payment?.payments?.[0], // first payment
        key
      ),
      subsequentPaymentPence: calculateSubsequentPaymentForParcelItem(
        payment?.payments?.[1], // subsequent payments
        key
      )
    })
  )

  const agreementRows = Object.entries(payment?.agreementLevelItems || {}).map(
    ([key, i]) => ({
      ...i,
      description: codeDescriptions[i?.code] || i?.description || '',
      rateInPence: `${formatPenceCurrency(i?.annualPaymentPence || 0)} per agreement`,
      hasOneOffPayment: true,
      duration: durationInYears,
      quarterlyPayment: quarterlyPayment?.lineItems?.find(
        (li) => li.agreementLevelItemId === Number(key)
      )?.paymentPence,
      firstPaymentPence: calculateFirstPaymentForAgreementLevelItem(
        payment?.payments?.[0], // first payment
        key
      ),
      subsequentPaymentPence: calculateSubsequentPaymentForAgreementLevelItem(
        payment?.payments?.[1], // subsequent payments
        key
      )
    })
  )

  return [...parcelRows, ...agreementRows].sort((a, b) =>
    (a?.code || '').localeCompare(b?.code || '')
  )
}

export const buildReviewOfferModel = (agreementData) => {
  // The incoming payload may be either the raw agreement object or
  // wrapped under an `agreementData` property. Support both shapes.
  const root = agreementData?.agreementData ?? agreementData
  const payment = root?.payment || {}
  const application = root?.application || {}

  const codeDescriptions = buildCodeDescriptions(payment)
  const durationInYears = calculateDurationInYears(payment)
  const quarterlyPayment = getQuarterlyPayment(payment)
  const payments = buildPayments(
    payment,
    codeDescriptions,
    durationInYears,
    quarterlyPayment
  )

  return {
    pageTitle: 'Review your agreement offer',
    parcels: application?.parcel || [],
    codeDescriptions,
    payments,
    totalQuarterly: quarterlyPayment?.totalPaymentPence,
    totalYearly: payment?.annualTotalPence,
    totalFirstPayment: calculateTotalFirstPayment(payments),
    totalSubsequentPayment: calculateTotalSubsequentPayment(payments),
    ...getSummaryOfActions(agreementData)
  }
}
