import {
  calculateFirstPaymentForAgreementLevelItem,
  calculateFirstPaymentForParcelItem,
  calculateSubsequentPaymentForAgreementLevelItem,
  calculateSubsequentPaymentForParcelItem
} from './payment-calculations.js'
import { formatPenceCurrency } from '../../../config/nunjucks/filters/format-currency.js'

const dateOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric'
}

const GOV_UK_FONT_WEIGHT_BOLD = 'govuk-!-font-weight-bold'

const noWrap = { attributes: { style: 'white-space: nowrap' } }

/**
 * Creates a summary of actions for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the summary of actions table
 */
const getSummaryOfActions = (agreementData) => {
  const isAccepted = agreementData.status === 'accepted'

  // Build headings – include dates only for accepted agreements
  const headings = [
    { text: 'Parcel' },
    { text: 'Code' },
    { text: 'Action' },
    { text: 'Total parcel area (ha)' },
    { text: 'Start date' },
    { text: 'End date' }
  ]

  // Format dates (or default to empty strings for non-accepted)
  const startDateText = isAccepted
    ? new Date(agreementData.payment.agreementStartDate).toLocaleDateString(
        'en-GB',
        dateOptions
      )
    : 'XXXXX'
  const endDateText = isAccepted
    ? new Date(agreementData.payment.agreementEndDate).toLocaleDateString(
        'en-GB',
        dateOptions
      )
    : 'XXXXX'

  // Build rows – include date cells only when accepted, mirroring headings
  const data = Object.values(agreementData.payment.parcelItems).map(
    (parcel) => {
      return [
        { text: `${parcel.sheetId} ${parcel.parcelId}`, ...noWrap },
        { text: parcel.code },
        { text: parcel.description?.replace(`${parcel.code}: `, '') },
        { text: parcel.quantity },
        { text: startDateText },
        { text: endDateText }
      ]
    }
  )

  return { headings, data }
}

const buildParcelRows = (firstPayment, subsequentPayment, parcelItems = {}) =>
  Object.entries(parcelItems).map(([key, payment]) => [
    { text: payment.description },
    { text: payment.code },
    {
      text: `${formatPenceCurrency(payment.rateInPence)} per ${payment.unit.replace(/s$/, '')}`
    },
    {
      text: formatPenceCurrency(
        calculateFirstPaymentForParcelItem(firstPayment, key)
      )
    },
    {
      text: formatPenceCurrency(
        calculateSubsequentPaymentForParcelItem(subsequentPayment, key)
      )
    },
    {
      text: formatPenceCurrency(payment.annualPaymentPence)
    }
  ])

const buildAgreementLevelRows = (
  firstPayment,
  subsequentPayment,
  agreementLevelItems = {}
) =>
  Object.entries(agreementLevelItems).map(([key, payment]) => {
    const description = payment.description?.replace(`${payment.code}: `, '')
    return [
      { text: description },
      { text: payment.code },
      {
        text: `${formatPenceCurrency(payment.annualPaymentPence)} per agreement`
      },
      {
        text: formatPenceCurrency(
          calculateFirstPaymentForAgreementLevelItem(firstPayment, key)
        )
      },
      {
        text: formatPenceCurrency(
          calculateSubsequentPaymentForAgreementLevelItem(
            subsequentPayment,
            key
          )
        )
      },
      {
        text: formatPenceCurrency(payment.annualPaymentPence)
      }
    ]
  })

const sumPaymentValues = (calculator, payment, items = {}) =>
  Object.keys(items).reduce((sum, key) => sum + calculator(payment, key), 0)

const sumAnnualPayments = (items = {}) =>
  Object.values(items).reduce(
    (sum, p) => sum + (Number(p.annualPaymentPence) || 0),
    0
  )

const calculatePaymentTotals = (payment, firstPayment, subsequentPayment) => {
  const parcelItems = payment?.parcelItems
  const agreementLevelItems = payment?.agreementLevelItems

  const firstTotal =
    sumPaymentValues(
      calculateFirstPaymentForParcelItem,
      firstPayment,
      parcelItems
    ) +
    sumPaymentValues(
      calculateFirstPaymentForAgreementLevelItem,
      firstPayment,
      agreementLevelItems
    )

  const subsequentTotal =
    sumPaymentValues(
      calculateSubsequentPaymentForParcelItem,
      subsequentPayment,
      parcelItems
    ) +
    sumPaymentValues(
      calculateSubsequentPaymentForAgreementLevelItem,
      subsequentPayment,
      agreementLevelItems
    )

  const annualTotal =
    sumAnnualPayments(parcelItems) + sumAnnualPayments(agreementLevelItems)

  return { firstTotal, subsequentTotal, annualTotal }
}

const buildTotalsRow = ({ firstTotal, subsequentTotal, annualTotal }) => [
  { text: '' },
  { text: '' },
  { text: '' },
  {
    text: formatPenceCurrency(firstTotal),
    attributes: { class: GOV_UK_FONT_WEIGHT_BOLD }
  },
  {
    text: formatPenceCurrency(subsequentTotal),
    attributes: { class: GOV_UK_FONT_WEIGHT_BOLD }
  },
  {
    text: formatPenceCurrency(annualTotal),
    attributes: { class: GOV_UK_FONT_WEIGHT_BOLD }
  }
]

const sortRowsByCode = (rows) =>
  rows.sort((a, b) => a[1].text.localeCompare(b[1].text))

/**
 * Creates a summary of payments for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the summary of payments tables
 */
const getSummaryOfPayments = (agreementData) => {
  const firstPayment = agreementData.payment?.payments?.[0]
  const subsequentPayment = agreementData.payment?.payments?.[1]

  const parcelRows = buildParcelRows(
    firstPayment,
    subsequentPayment,
    agreementData.payment?.parcelItems
  )
  const agreementLevelRows = buildAgreementLevelRows(
    firstPayment,
    subsequentPayment,
    agreementData.payment?.agreementLevelItems
  )
  const totalsRow = buildTotalsRow(
    calculatePaymentTotals(
      agreementData.payment,
      firstPayment,
      subsequentPayment
    )
  )

  const dataRows = sortRowsByCode([...parcelRows, ...agreementLevelRows])

  return {
    headings: [
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Annual payment rate' },
      { text: 'First payment' },
      { text: 'Subsequent payments' },
      { text: 'Annual payment value' }
    ],
    data: [...dataRows, totalsRow]
  }
}

export const getAdditionalAnnualPayments = (agreementData) => {
  const items = agreementData?.payment?.agreementLevelItems || {}

  return Object.entries(items)
    .map(([_key, item]) => {
      const description = item.description?.replace(`${item.code}: `, '')
      return {
        code: item.code,
        description,
        payment: `${formatPenceCurrency(item.annualPaymentPence)} per agreement`
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
}

/**
 * Gets the code for a line item from either parcel or agreement level items
 * @param {object} line - The line item
 * @param {object} agreementData - The agreement data object
 * @returns {string|undefined} The code for the line item
 */
const getCodeForLineItem = (line, agreementData) => {
  if (line.parcelItemId) {
    return agreementData.payment.parcelItems[line.parcelItemId]?.code
  }
  if (line.agreementLevelItemId) {
    return agreementData.payment.agreementLevelItems[line.agreementLevelItemId]
      ?.code
  }
  return undefined
}

/**
 * Builds a map of payment data organized by code
 * @param {object} agreementData - The agreement data object
 * @returns {Map} Map of code to years map
 */
const buildPaymentDataByCode = (agreementData) => {
  const dataByCode = new Map()
  agreementData.payment.payments.forEach((payment) => {
    const year = new Date(payment.paymentDate).getFullYear()

    payment.lineItems.forEach((line) => {
      const code = getCodeForLineItem(line, agreementData)

      if (code) {
        const years = dataByCode.has(code) ? dataByCode.get(code) : new Map()
        const currentValue = years.has(year) ? years.get(year) : 0
        years.set(year, Number(currentValue) + Number(line.paymentPence))

        // Update total for this code
        const currentTotal = years.has('total') ? years.get('total') : 0
        years.set('total', Number(currentTotal) + Number(line.paymentPence))

        dataByCode.set(code, years)
      }
    })
  })
  return dataByCode
}

/**
 * Gets all unique years from the payment data and sorts them
 * @param {Map} dataByCode - Map of code to years map
 * @returns {Array<number>} Sorted array of years
 */
const getSortedYears = (dataByCode) => {
  const allYears = new Set()
  dataByCode.forEach((years) => {
    years.forEach((_value, year) => {
      if (year !== 'total') {
        allYears.add(year)
      }
    })
  })
  return Array.from(allYears).sort((a, b) => a - b)
}

/**
 * Gets sorted codes from the payment data
 * @param {Map} dataByCode - Map of code to years map
 * @returns {Array<string>} Sorted array of codes
 */
const getSortedCodes = (dataByCode) => {
  return Array.from(dataByCode.keys()).sort((a, b) =>
    a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' })
  )
}

/**
 * Builds the data rows for the annual payment schedule table
 * @param {Map} dataByCode - Map of code to years map
 * @param {Array<string>} sortedCodes - Sorted array of codes
 * @param {Array<number>} sortedYears - Sorted array of years
 * @returns {Array} Array containing table data rows and year totals
 */
const buildScheduleRows = (dataByCode, sortedCodes, sortedYears) => {
  const tableData = []
  const yearTotals = {}
  let grandTotal = 0

  // Initialize year totals
  sortedYears.forEach((year) => {
    yearTotals[year] = 0
  })

  // Add rows for each code in sorted order
  sortedCodes.forEach((code) => {
    const years = dataByCode.get(code)
    const row = [{ text: code }]

    // Add data for each year
    sortedYears.forEach((year) => {
      const yearValue = years.has(year) ? years.get(year) : 0
      row.push({
        text: formatPenceCurrency(yearValue)
      })
      yearTotals[year] += yearValue
    })

    // Add total for this code
    const codeTotal = years.has('total') ? years.get('total') : 0
    row.push({
      text: formatPenceCurrency(codeTotal)
    })
    grandTotal += codeTotal

    tableData.push(row)
  })

  return { tableData, yearTotals, grandTotal }
}

/**
 * Builds the totals row for the annual payment schedule table
 * @param {Array<number>} sortedYears - Sorted array of years
 * @param {object} yearTotals - Object mapping years to totals
 * @param {number} grandTotal - Grand total across all codes
 * @returns {Array} Totals row array
 */
const buildScheduleTotalsRow = (sortedYears, yearTotals, grandTotal) => {
  const totalsRow = [{ text: 'Total' }]
  sortedYears.forEach((year) => {
    totalsRow.push({
      text: formatPenceCurrency(yearTotals[year])
    })
  })
  totalsRow.push({
    text: formatPenceCurrency(grandTotal)
  })
  return totalsRow
}

/**
 * Builds the headings for the annual payment schedule table
 * @param {Array<number>} sortedYears - Sorted array of years
 * @returns {Array} Headings array
 */
const buildScheduleHeadings = (sortedYears) => {
  const headings = [{ text: 'Code' }]
  sortedYears.forEach((year) => {
    headings.push({ text: year })
  })
  headings.push({ text: 'Total payment' })
  return headings
}

/**
 * Creates a table of annual payment schedule for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the annual payment schedule table
 */
const getAnnualPaymentSchedule = (agreementData) => {
  const dataByCode = buildPaymentDataByCode(agreementData)
  const sortedYears = getSortedYears(dataByCode)
  const sortedCodes = getSortedCodes(dataByCode)
  const { tableData, yearTotals, grandTotal } = buildScheduleRows(
    dataByCode,
    sortedCodes,
    sortedYears
  )
  const totalsRow = buildScheduleTotalsRow(sortedYears, yearTotals, grandTotal)
  const headings = buildScheduleHeadings(sortedYears)

  return {
    headings,
    data: [...tableData, totalsRow]
  }
}

/**
 * Precomputed view agreement data
 * @param {object} agreement - The agreement data object
 */
export const getAgreementCalculations = (agreement) => ({
  summaryOfActions: getSummaryOfActions(agreement),
  summaryOfPayments: getSummaryOfPayments(agreement),
  annualPaymentSchedule: getAnnualPaymentSchedule(agreement),
  annualPayments: getAdditionalAnnualPayments(agreement)
})
