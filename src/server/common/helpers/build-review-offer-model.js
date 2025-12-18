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

export const buildReviewOfferModel = (agreementData) => {
  const { payment } = agreementData
  const { application } = agreementData

  // Safely handle cases where parcelItems may be undefined
  const codeDescriptions = Object.values(payment?.parcelItems || {}).reduce(
    (prev, i) => ({
      ...prev,
      [i.code]: i.description.replace(`${i.code}: `, '')
    }),
    {}
  )

  // Calculate duration in years using date-fns
  const durationInYears = differenceInYears(
    parseISO(payment.agreementEndDate),
    parseISO(payment.agreementStartDate)
  )

  const quarterlyPayment = payment.payments?.[payment.payments?.length - 1]

  const payments = [
    ...(Object.entries(payment?.parcelItems || {}).map(([key, i]) => ({
      ...i,
      description: codeDescriptions[i.code],
      rateInPence: formatPenceCurrency(i.rateInPence),
      unit: i.unit.replace(/s$/, ''),
      duration: durationInYears,
      hasOneOffPayment: false,
      quarterlyPayment: quarterlyPayment?.lineItems.find(
        (li) => li.parcelItemId === Number(key)
      )?.paymentPence,
      firstPaymentPence: calculateFirstPaymentForParcelItem(
        payment.payments?.[0], // first payment
        key
      ),
      subsequentPaymentPence: calculateSubsequentPaymentForParcelItem(
        payment.payments?.[1], // subsequent payments
        key
      )
    })) || []),
    ...(Object.entries(payment?.agreementLevelItems || {}).map(([key, i]) => ({
      ...i,
      description: codeDescriptions[i.code],
      rateInPence: `${formatPenceCurrency(i.annualPaymentPence)} per agreement`,
      hasOneOffPayment: true,
      duration: durationInYears,
      quarterlyPayment: quarterlyPayment?.lineItems.find(
        (li) => li.agreementLevelItemId === Number(key)
      )?.paymentPence,
      firstPaymentPence: calculateFirstPaymentForAgreementLevelItem(
        payment.payments?.[0], // first payment
        key
      ),
      subsequentPaymentPence: calculateSubsequentPaymentForAgreementLevelItem(
        payment.payments?.[1], // subsequent payments
        key
      )
    })) || [])
  ].sort((a, b) => a.code.localeCompare(b.code))

  return {
    pageTitle: 'Review your agreement offer',
    parcels: application.parcel,
    codeDescriptions,
    payments,
    totalQuarterly: quarterlyPayment?.totalPaymentPence,
    totalYearly: payment.annualTotalPence,
    totalFirstPayment: calculateTotalFirstPayment(payments),
    totalSubsequentPayment: calculateTotalSubsequentPayment(payments)
  }
}
