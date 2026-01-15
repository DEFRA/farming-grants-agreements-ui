import { MatchersV2 } from '@pact-foundation/pact'

const { eachLike, iso8601DateTimeWithMillis, like } = MatchersV2

const baseAgreement = {
  agreementNumber: 'SFI987654321',
  status: 'offered',
  identifiers: {
    sbi: '106284736'
  },
  applicant: {
    business: {
      name: 'J&S Hartley',
      address: {
        line1: 'Mason House Farm Clitheroe Rd',
        line2: 'Bashall Eaves',
        street: 'Bartindale Road',
        city: 'Clitheroe',
        postalCode: 'BB7 3DD'
      }
    },
    customer: {
      name: {
        title: 'Mr.',
        first: 'Edward',
        middle: 'Paul',
        last: 'Jones'
      }
    }
  },
  application: {
    parcel: [
      {
        sheetId: 'SD6743',
        parcelId: '8083',
        area: {
          unit: 'ha',
          quantity: 5.2182
        },
        actions: [
          {
            code: 'CMOR1',
            durationYears: 3,
            appliedFor: {
              unit: 'ha',
              quantity: 4.53411078
            }
          }
        ]
      }
    ],
    agreement: []
  },
  payment: {
    agreementStartDate: '2025-09-01',
    agreementEndDate: '2028-09-01',
    parcelItems: {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        unit: 'ha',
        quantity: 4.53411078,
        rateInPence: 1060,
        annualPaymentPence: 4806,
        sheetId: 'SD6743',
        parcelId: '8083'
      }
    },
    agreementLevelItems: {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        annualPaymentPence: 27200
      }
    },
    payments: [
      {
        paymentDate: '2025-12-05',
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 1204
          },
          {
            agreementLevelItemId: 1,
            paymentPence: 6803
          }
        ]
      },
      {
        paymentDate: '2026-03-05',
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 1201
          },
          {
            agreementLevelItemId: 1,
            paymentPence: 6800
          }
        ]
      }
    ]
  },
  updatedAt: '2025-10-23T16:03:28.548Z'
}

const buildLineItemMatcher = (lineItem) => ({
  ...(lineItem?.parcelItemId && {
    parcelItemId: like(lineItem.parcelItemId)
  }),
  ...(lineItem?.agreementLevelItemId && {
    agreementLevelItemId: like(lineItem.agreementLevelItemId)
  }),
  paymentPence: like(lineItem?.paymentPence ?? 0)
})

const buildPaymentMatcher = (payment) => ({
  paymentDate: like(payment?.paymentDate ?? ''),
  totalPaymentPence: like(payment?.totalPaymentPence ?? 0),
  lineItems: payment?.lineItems?.length
    ? payment.lineItems.map(buildLineItemMatcher)
    : like([])
})

const buildParcelMatcher = (parcel) => ({
  sheetId: like(parcel?.sheetId ?? ''),
  parcelId: like(parcel?.parcelId ?? ''),
  area: {
    unit: like(parcel?.area?.unit ?? ''),
    quantity: like(parcel?.area?.quantity ?? 0)
  },
  actions: parcel?.actions?.length
    ? eachLike(
        {
          code: like(parcel.actions[0].code),
          durationYears: like(parcel.actions[0].durationYears),
          appliedFor: {
            unit: like(parcel.actions[0].appliedFor.unit),
            quantity: like(parcel.actions[0].appliedFor.quantity)
          }
        },
        { min: parcel.actions.length }
      )
    : like([])
})

const buildApplicantMatcher = (applicant) => ({
  business: {
    name: like(applicant?.business?.name ?? ''),
    address: {
      line1: like(applicant?.business?.address?.line1 ?? ''),
      line2: like(applicant?.business?.address?.line2 ?? ''),
      street: like(applicant?.business?.address?.street ?? ''),
      city: like(applicant?.business?.address?.city ?? ''),
      postalCode: like(applicant?.business?.address?.postalCode ?? '')
    }
  },
  customer: {
    name: {
      title: like(applicant?.customer?.name?.title ?? ''),
      first: like(applicant?.customer?.name?.first ?? ''),
      middle: like(applicant?.customer?.name?.middle ?? ''),
      last: like(applicant?.customer?.name?.last ?? '')
    }
  }
})

const buildPaymentSectionMatcher = (payment) => {
  if (!payment) {
    return payment
  }

  const payments = payment.payments ?? []

  return {
    agreementStartDate: like(payment.agreementStartDate),
    agreementEndDate: like(payment.agreementEndDate),
    parcelItems: like(payment.parcelItems ?? {}),
    agreementLevelItems: like(payment.agreementLevelItems ?? {}),
    payments: payments.length
      ? eachLike(buildPaymentMatcher(payments[0]), { min: payments.length })
      : like([])
  }
}

const buildApplicationMatcher = (application) => {
  const parcels = application?.parcel ?? []

  return {
    parcel: parcels.length
      ? eachLike(buildParcelMatcher(parcels[0]), { min: parcels.length })
      : like([]),
    agreement: like(application?.agreement ?? [])
  }
}

const buildAgreementWithMatchers = (agreement) => ({
  agreementNumber: like(agreement.agreementNumber),
  status: agreement.status,
  identifiers: {
    ...agreement.identifiers,
    sbi: like(agreement.identifiers.sbi)
  },
  applicant: buildApplicantMatcher(agreement.applicant),
  application: buildApplicationMatcher(agreement.application),
  payment: buildPaymentSectionMatcher(agreement.payment),
  actionApplications: like(agreement.actionApplications ?? []),
  updatedAt: iso8601DateTimeWithMillis(agreement.updatedAt)
})

export const buildPactAgreement = (
  { status = 'offered' } = {},
  { useMatchers = false } = {}
) => {
  const agreement = {
    ...baseAgreement,
    status
  }

  return useMatchers ? buildAgreementWithMatchers(agreement) : agreement
}
