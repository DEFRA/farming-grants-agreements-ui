const lineItems = [
  {
    parcelItemId: 1,
    paymentPence: 1201
  },
  {
    agreementLevelItemId: 1,
    paymentPence: 6800
  }
]

export default [
  {
    notificationMessageId: '00000000-0000-4000-8000-000000000300',
    agreementName: 'Example agreement 2',
    correlationId: '00000000-0000-4000-8000-000000000301',
    clientRef: 'client-ref-002',
    code: 'frps-private-beta',
    identifiers: {
      sbi: '900000005',
      frn: 'frn',
      crn: 'crn',
      defraId: 'defraId'
    },
    status: 'offered',
    agreement: 'f0000000000000000000012c',
    scheme: 'SFI',
    actionApplications: [
      {
        code: 'CMOR1',
        sheetId: 'AA0006',
        parcelId: '0006',
        appliedFor: {
          unit: 'ha',
          quantity: 4.53411078
        }
      }
    ],
    payment: {
      agreementStartDate: '2025-09-01',
      agreementEndDate: '2028-09-01',
      frequency: 'Quarterly',
      agreementTotalPence: 96018,
      annualTotalPence: 32006,
      parcelItems: {
        1: {
          code: 'CMOR1',
          description: 'CMOR1: Assess moorland and produce a written record',
          version: 1,
          unit: 'ha',
          quantity: 4.53411078,
          rateInPence: 1060,
          annualPaymentPence: 4806,
          sheetId: 'AA0006',
          parcelId: '0006'
        }
      },
      agreementLevelItems: {
        1: {
          code: 'CMOR1',
          description: 'CMOR1: Assess moorland and produce a written record',
          version: 1,
          annualPaymentPence: 27200
        }
      },
      payments: [
        {
          totalPaymentPence: 8007,
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
          totalPaymentPence: 8001,
          paymentDate: '2026-03-05',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2026-06-05',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2026-09-07',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2026-12-07',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2027-03-05',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2027-06-07',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2027-09-06',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2027-12-06',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2028-03-06',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2028-06-05',
          lineItems
        },
        {
          totalPaymentPence: 8001,
          paymentDate: '2028-09-05',
          lineItems
        }
      ]
    },
    applicant: {
      business: {
        name: 'Example Ridge Farm Ltd',
        email: {
          address: 'meadow@example.test'
        },
        phone: { mobile: '02079460901' },
        address: {
          line1: '3 Example Lane',
          line2: 'Example Village',
          line3: null,
          line4: null,
          line5: null,
          street: 'Example Lane',
          city: 'Exampleton',
          postalCode: 'ZZ99 3ZZ'
        }
      },
      customer: {
        name: {
          title: 'Mr.',
          first: 'Jamie',
          middle: 'Test',
          last: 'Sample'
        }
      }
    },
    createdAt: '2025-10-23T16:03:28.545Z',
    updatedAt: '2025-10-23T16:03:28.548Z',
    agreementNumber: 'SFI987654321',
    invoice: [],
    version: 1
  }
]
