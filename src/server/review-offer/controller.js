import {
  calculateFirstPaymentForAgreementLevelItem,
  calculateFirstPaymentForParcelItem,
  calculateSubsequentPaymentForAgreementLevelItem,
  calculateSubsequentPaymentForParcelItem,
  calculateTotalFirstPayment,
  calculateTotalSubsequentPayment
} from '../common/helpers/payment-calculations.js'

export const reviewOfferController = {
  async handler(request, h) {
    const { agreementData: { actionApplications, payment } = {} } =
      request.pre?.data

    const codeDescriptions = Object.values(payment.parcelItems).reduce(
      (prev, i) => ({
        ...prev,
        [i.code]: i.description.replace(`${i.code}: `, '')
      }),
      {}
    )

    const quarterlyPayment = payment.payments?.[payment.payments?.length - 1]

    const payments = [
      ...(Object.entries(payment?.parcelItems || {}).map(([key, i]) => ({
        ...i,
        description: codeDescriptions[i.code],
        unit: i.unit.replace(/s$/, ''),
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
      ...(Object.entries(payment?.agreementLevelItems || {}).map(
        ([key, i]) => ({
          ...i,
          description: `One-off payment per agreement per year for ${codeDescriptions[i.code]}`,
          rateInPence: i.annualPaymentPence,
          quarterlyPayment: quarterlyPayment?.lineItems.find(
            (li) => li.agreementLevelItemId === Number(key)
          )?.paymentPence,
          firstPaymentPence: calculateFirstPaymentForAgreementLevelItem(
            payment.payments?.[0], // first payment
            key
          ),
          subsequentPaymentPence:
            calculateSubsequentPaymentForAgreementLevelItem(
              payment.payments?.[1], // subsequent payments
              key
            )
        })
      ) || [])
    ].sort((a, b) => a.code.localeCompare(b.code))

    return h.view('review-offer/index', {
      pageTitle: 'Review your funding offer',
      actionApplications,
      codeDescriptions,
      payments,
      totalQuarterly: quarterlyPayment?.totalPaymentPence,
      totalYearly: payment.annualTotalPence,
      totalFirstPayment: calculateTotalFirstPayment(payments),
      totalSubsequentPayment: calculateTotalSubsequentPayment(payments)
    })
  }
}
