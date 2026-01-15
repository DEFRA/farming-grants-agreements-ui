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

export const buildPactAgreement = ({ status = 'offered' } = {}) => ({
  ...baseAgreement,
  status
})
