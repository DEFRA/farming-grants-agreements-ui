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

// const noWrap = { attributes: { style: 'white-space: nowrap' } }

/**
 * Creates a summary of actions for the agreement
 * @param {object} agreementData - The agreement data object
 * @returns Object containing headings and data for the summary of actions table
 */
const getSummaryOfActions = (agreementData) => {
  const root = agreementData?.agreementData ?? agreementData
  const payment = root?.payment || {}

  console.log(
    '********** The agreementData data ' + JSON.stringify(agreementData)
  )

  const codeDescriptions = {
    ...Object.values(payment?.parcelItems || {}).reduce((prev, i) => {
      const desc = (i?.description || '').replace(`${i?.code}: `, '')
      return i?.code
        ? { ...prev, [i.code]: desc || i?.description || '' }
        : prev
    }, {}),
    ...Object.values(payment?.agreementLevelItems || {}).reduce((prev, i) => {
      const desc = (i?.description || '').replace(`${i?.code}: `, '')
      return i?.code
        ? { ...prev, [i.code]: desc || i?.description || '' }
        : prev
    }, {})
  }

  console.log(
    '********** The codeDescriptions data ' + JSON.stringify(codeDescriptions)
  )

  // Build headings – include dates only for accepted agreements
  const headings = [
    { text: 'Action' },
    { text: 'Code' },
    { text: 'Land parcel' },
    { text: 'Quantity (ha)' },
    { text: 'Duration' }
  ]

  /*const data = Object.values(agreementData.payment.parcelItems).map(
      (parcel) => {
        return [
          { text: parcel.description?.replace(`${parcel.code}: `, '') },
          { text: parcel.code },
          { text: `${parcel.sheetId} ${parcel.parcelId}`, ...noWrap },
          { text: parcel.quantity }
        ]
      }
    )*/
  console.log(
    '********** The application parcels data ' +
      JSON.stringify(agreementData.application.parcel)
  )
  const data = []
  for (const parcel of agreementData.application.parcel) {
    console.log('********** Dealing with PARCEL ' + JSON.stringify(parcel))
    for (const action of parcel.actions) {
      console.log('********** Dealing with ACTION ' + JSON.stringify(action))
      let actionDuration = action.durationYears + 'years'
      if (action.durationYears === 1) {
        actionDuration = action.durationYears + 'year'
      }
      data.push(
        { text: codeDescriptions[action.code] },
        { text: action.code },
        { text: parcel.sheetId + parcel.parcelId },
        { text: Number((action.appliedFor?.quantity ?? 0).toFixed(4)) },
        { text: actionDuration }
      )
    }
  }

  // const dataa = Object.values(agreementData.application.parcel).map(
  //   (parcel) => {
  //     return [
  //       { text: parcel.description?.replace(`${parcel.code}: `, '') },
  //       { text: parcel.code },
  //       { text: `${parcel.sheetId} ${parcel.parcelId}`, ...noWrap },
  //       { text: parcel.quantity }
  //     ]
  //   }
  // )

  const summaryOfActions = { summaryOfActions: { headings, data } }
  console.log(
    '********** Actions table data ' + JSON.stringify(summaryOfActions)
  )

  return summaryOfActions
}

export const buildReviewOfferModel = (agreementData) => {
  // The incoming payload may be either the raw agreement object or
  // wrapped under an `agreementData` property. Support both shapes.
  const root = agreementData?.agreementData ?? agreementData
  const payment = root?.payment || {}
  const application = root?.application || {}

  // Build a map of code -> description using both parcel and agreement-level items
  // Safely handle cases where items are undefined and when descriptions may include the code prefix.
  const codeDescriptions = {
    ...Object.values(payment?.parcelItems || {}).reduce((prev, i) => {
      const desc = (i?.description || '').replace(`${i?.code}: `, '')
      return i?.code
        ? { ...prev, [i.code]: desc || i?.description || '' }
        : prev
    }, {}),
    ...Object.values(payment?.agreementLevelItems || {}).reduce((prev, i) => {
      const desc = (i?.description || '').replace(`${i?.code}: `, '')
      return i?.code
        ? { ...prev, [i.code]: desc || i?.description || '' }
        : prev
    }, {})
  }

  // Calculate duration in years using date-fns (fallback to 1 if dates are missing/invalid)
  let durationInYears = 1
  try {
    if (payment?.agreementEndDate && payment?.agreementStartDate) {
      const end = parseISO(payment.agreementEndDate)
      const start = parseISO(payment.agreementStartDate)
      const diff = differenceInYears(end, start)
      console.log('***************** THE difference in years is ', diff)
      // Ensure at least 1 year duration for display purposes
      durationInYears = Number.isFinite(diff) && diff > 0 ? diff : 1
      console.log(
        '***************** THE durationInYears in years is ',
        durationInYears
      )
    }
  } catch {
    durationInYears = 1
  }

  const quarterlyPayment = payment?.payments?.[payment?.payments?.length - 1]

  const payments = [
    ...(Object.entries(payment?.parcelItems || {}).map(([key, i]) => ({
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
    })) || []),
    ...(Object.entries(payment?.agreementLevelItems || {}).map(([key, i]) => ({
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
    })) || [])
  ].sort((a, b) => (a?.code || '').localeCompare(b?.code || ''))

  return {
    pageTitle: 'Review your agreement offer',
    parcels: application?.parcel || [],
    codeDescriptions,
    payments,
    totalQuarterly: quarterlyPayment?.totalPaymentPence || 0,
    totalYearly: payment?.annualTotalPence || 0,
    totalFirstPayment: calculateTotalFirstPayment(payments),
    totalSubsequentPayment: calculateTotalSubsequentPayment(payments),
    ...getSummaryOfActions(agreementData)
  }
}
