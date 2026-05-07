import { viewAgreement } from './view-agreement.js'

describe('wmp viewAgreement', () => {
  const agreementData = {
    clientRef: 'WMP-20260507133228-24643',
    code: 'woodland',
    status: 'accepted',
    updatedAt: '2026-05-07T12:53:16.167Z',
    signatureDate: '2026-05-07T12:53:16.162Z',
    identifiers: { sbi: '106284736', frn: '1234567890', crn: '1100014934' },
    applicant: {
      business: {
        name: 'Example Farm Ltd',
        address: {
          line1: 'Farm House',
          line2: 'Village Lane',
          line3: null,
          line4: null,
          line5: null,
          street: 'Village Lane',
          city: 'York',
          postalCode: 'YO1 1AA'
        }
      },
      customer: {
        name: {
          title: 'Mr',
          first: 'John',
          middle: null,
          last: 'Doe'
        }
      }
    },
    application: {
      parcel: [
        {
          sheetId: 'SD4841-4684',
          parcelId: 'SD4841-4684',
          area: { quantity: 25 }
        },
        {
          sheetId: 'SD4842-3020',
          parcelId: 'SD4842-3020',
          area: { quantity: 27.5 }
        }
      ]
    },
    actionApplications: [
      {
        code: 'WMP1',
        sheetId: 'SD4841-4684',
        parcelId: 'SD4841-4684',
        appliedFor: { quantity: 25 }
      },
      {
        code: 'WMP1',
        sheetId: 'SD4842-3020',
        parcelId: 'SD4842-3020',
        appliedFor: { quantity: 30.4 }
      }
    ],
    payment: {
      agreementStartDate: '2026-05-07',
      agreementEndDate: '2027-05-07',
      agreementTotalPence: 157500,
      agreementLevelItems: {
        1: {
          code: 'PA3',
          description: 'PA3: Woodland management plan',
          annualPaymentPence: 157500,
          quantity: 55.4
        }
      }
    }
  }

  test('exposes the WMP view-agreement template path', () => {
    expect(viewAgreement.template).toBe('grant-types/wmp/view-agreement')
  })

  test('builds the view model from the accepted WMP agreement payload', () => {
    expect(viewAgreement.buildModel({ agreementData })).toEqual({
      pageTitle: 'Woodland Management Plan PA3 agreement document',
      agreementTitle: 'Woodland Management Plan PA3 agreement document',
      agreementNumber: 'WMP-20260507133228-24643',
      agreementHolderName: 'Example Farm Ltd',
      applicantName: 'Mr John Doe',
      address: 'Farm House, Village Lane, Village Lane, York, YO1 1AA',
      sbi: '106284736',
      agreementStartDate: '7 May 2026',
      agreementEndDate: '7 May 2027',
      landParcels: [
        { parcelId: 'SD4841-4684', areaHa: 25 },
        { parcelId: 'SD4842-3020', areaHa: 27.5 }
      ],
      capitalItems: [
        {
          code: 'PA3',
          description: 'PA3: Woodland management plan',
          quantity: 55.4,
          unit: 'ha',
          totalPaymentPence: 157500,
          totalPayment: '£1,575'
        }
      ],
      agreementTotalPayment: '£1,575',
      acceptedOn: '7 May 2026',
      isDraftAgreement: false,
      isAgreementAccepted: true,
      isWithdrawnAgreement: false,
      isCancelledAgreement: false,
      isTerminatedAgreement: false
    })
  })

  test('falls back to clientRef when reference number is missing', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        ...agreementData,
        clientRef: 'WMP-ALT-123'
      }
    })

    expect(model.agreementNumber).toBe('WMP-ALT-123')
  })
})
