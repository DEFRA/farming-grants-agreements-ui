import round from 'lodash/round.js'

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

const noWrap = { attributes: { style: 'white-space: nowrap' } }

/**
 * Creates a table of land data for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the land table
 */
const getAgreementLand = (agreementData) => {
  const parcels = new Map()
  Object.values(agreementData.payment.parcelItems).forEach(
    ({ sheetId, parcelId, quantity: area }) => {
      const currentArea = parcels.has(parcelId) ? parcels.get(parcelId) : 0
      parcels.set(`${sheetId} ${parcelId}`, Number(currentArea) + Number(area))
    }
  )

  const data = []
  for (const [key, value] of parcels) {
    data.push([{ text: key }, { text: round(value, 4) }])
  }

  return {
    headings: [
      { text: 'Parcel', ...noWrap },
      { text: 'Total parcel area (ha)' }
    ],
    data
  }
}

/**
 * Creates a summary of actions for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the summary of actions table
 */
const getSummaryOfActions = (agreementData) => {
  return {
    headings: [
      { text: 'Parcel' },
      { text: 'Code' },
      { text: 'Action' },
      { text: 'Total parcel area (ha)' },
      { text: 'Start date' },
      { text: 'End date' }
    ],
    data: Object.values(agreementData.payment.parcelItems).map((parcel) => [
      { text: `${parcel.sheetId} ${parcel.parcelId}`, ...noWrap },
      { text: parcel.code },
      { text: parcel.description?.replace(`${parcel.code}: `, '') },
      { text: parcel.quantity },
      {
        text: new Date(
          agreementData.payment.agreementStartDate
        ).toLocaleDateString('en-GB', dateOptions)
      },
      {
        text: new Date(
          agreementData.payment.agreementEndDate
        ).toLocaleDateString('en-GB', dateOptions)
      }
    ])
  }
}

/**
 * Creates a summary of payments for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the summary of payments table
 */
const getSummaryOfPayments = (agreementData) => {
  const firstPayment = agreementData.payment?.payments?.[0]
  const subsequentPayment = agreementData.payment?.payments?.[1]

  return {
    headings: [
      { text: 'Code' },
      { text: 'Action' },
      { text: 'Total area (ha)' },
      { text: 'Payment rate' },
      { text: 'First Payment' },
      { text: 'Subsequent payments' },
      { text: 'Total yearly payment' }
    ],
    data: [
      ...Object.entries(agreementData.payment.parcelItems).map(
        ([key, payment]) => [
          { text: payment.code },
          { text: payment.description },
          { text: round(payment.quantity, 4) },
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
          { text: formatPenceCurrency(payment.annualPaymentPence) }
        ]
      ),
      ...Object.entries(agreementData.payment.agreementLevelItems).map(
        ([key, payment]) => {
          const description = payment.description?.replace(
            `${payment.code}: `,
            ''
          )
          return [
            { text: payment.code },
            {
              text: `One-off payment per agreement per year for ${description}`
            },
            { text: '' },
            { text: '' },
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
            { text: formatPenceCurrency(payment.annualPaymentPence) }
          ]
        }
      )
    ].sort((a, b) => a[0].text.localeCompare(b[0].text))
  }
}

/**
 * Creates a table of annual payment schedule for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the annual payment schedule table
 */
const getAnnualPaymentSchedule = (agreementData) => {
  const dataByCode = new Map()
  agreementData.payment.payments.forEach((payment) => {
    const year = new Date(payment.paymentDate).getFullYear()

    payment.lineItems.forEach((line) => {
      let code
      if (line.parcelItemId) {
        code = agreementData.payment.parcelItems[line.parcelItemId]?.code
      }
      if (line.agreementLevelItemId) {
        code =
          agreementData.payment.agreementLevelItems[line.agreementLevelItemId]
            ?.code
      }

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

  // Get all unique years from the data
  const allYears = new Set()
  dataByCode.forEach((years) => {
    years.forEach((_value, year) => {
      if (year !== 'total') {
        allYears.add(year)
      }
    })
  })

  const sortedYears = Array.from(allYears).sort((a, b) => a - b)

  // Sort dataByCode by code keys
  const sortedCodes = Array.from(dataByCode.keys()).sort((a, b) =>
    a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' })
  )

  // Build table data
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
      row.push({ text: formatPenceCurrency(yearValue) })
      yearTotals[year] += yearValue
    })

    // Add total for this code
    const codeTotal = years.has('total') ? years.get('total') : 0
    row.push({ text: formatPenceCurrency(codeTotal) })
    grandTotal += codeTotal

    tableData.push(row)
  })

  // Add totals row
  const totalsRow = [{ text: 'Total' }]
  sortedYears.forEach((year) => {
    totalsRow.push({ text: formatPenceCurrency(yearTotals[year]) })
  })
  totalsRow.push({ text: formatPenceCurrency(grandTotal) })
  tableData.push(totalsRow)

  // Build headings
  const headings = [{ text: 'Code' }]
  sortedYears.forEach((year) => {
    headings.push({ text: year })
  })
  headings.push({ text: 'Total payment' })

  return {
    headings,
    data: tableData
  }
}

/**
 * Precomputed view agreement data
 * @param {object} agreement - The agreement data object
 */
export const getAgreementCalculations = (agreement) => ({
  agreementLand: getAgreementLand(agreement),
  summaryOfActions: getSummaryOfActions(agreement),
  summaryOfPayments: getSummaryOfPayments(agreement),
  annualPaymentSchedule: getAnnualPaymentSchedule(agreement)
})
