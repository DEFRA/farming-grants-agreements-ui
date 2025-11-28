import { MatchersV3 } from '@pact-foundation/pact'

const { like } = MatchersV3

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
    notificationMessageId: 'b6cc5590-80f6-46ce-b5a5-14c7986591f4',
    agreementName: 'Example agreement 2',
    correlationId: 'c3ef6a9d-1785-4653-894f-d681caef4c4b',
    clientRef: 'client-ref-002',
    code: 'frps-private-beta',
    identifiers: {
      sbi: '106284736',
      frn: 'frn',
      crn: 'crn',
      defraId: 'defraId'
    },
    status: 'offered',
    agreement: '68fa51d0206fcc31cb4b450d',
    scheme: 'SFI',
    actionApplications: [],
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
          sheetId: 'SD6743',
          parcelId: '8083'
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
        name: 'J&S Hartley',
        email: {
          address: 'cliffspencetasabbeyfarmf@mrafyebbasatecnepsffilcm.com.test'
        },
        phone: { mobile: '01234031670' },
        address: {
          line1: 'Mason House Farm Clitheroe Rd',
          line2: 'Bashall Eaves',
          line3: null,
          line4: null,
          line5: null,
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
      parcel: like([
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
              version: 1,
              durationYears: 3,
              appliedFor: {
                unit: 'ha',
                quantity: 4.53411078
              }
            }
          ]
        }
      ]),
      agreement: []
    },
    createdAt: '2025-10-23T16:03:28.545Z',
    updatedAt: '2025-10-23T16:03:28.548Z',
    agreementNumber: 'SFI987654321',
    invoice: [],
    version: 1
  }
]
