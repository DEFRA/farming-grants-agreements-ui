import {
  getAnnualPaymentsData,
  getSummaryOfPaymentsData
} from './get-agreement-calculations.js'

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

export const buildReviewOfferModel = (agreementData) => {
  return {
    pageTitle: 'Review your agreement offer',
    ...getSummaryOfActions(agreementData),
    ...getSummaryOfPaymentsData(agreementData),
    ...getAnnualPaymentsData(agreementData)
  }
}
