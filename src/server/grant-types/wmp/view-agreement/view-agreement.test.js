import { viewAgreement } from './view-agreement.js'

describe('wmp viewAgreement', () => {
  const agreementData = {
    clientRef: 'WMP-EXAMPLE-001',
    code: 'woodland',
    status: 'accepted',
    updatedAt: '2026-05-07T12:53:16.167Z',
    signatureDate: '2026-05-07T12:53:16.162Z',
    identifiers: { sbi: '900000005', frn: '1234567890', crn: '9000000006' },
    applicant: {
      business: {
        name: 'Example Farm Ltd',
        address: {
          line1: '5 Example Lane',
          line2: 'Example Lane',
          line3: null,
          line4: null,
          line5: null,
          street: 'Example Lane',
          city: 'Exampleton',
          postalCode: 'ZZ99 5ZZ'
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
          sheetId: 'AA0100-0110',
          parcelId: 'AA0100-0110',
          area: { quantity: 25 }
        },
        {
          sheetId: 'AA0101-0104',
          parcelId: 'AA0101-0104',
          area: { quantity: 27.5 }
        }
      ]
    },
    actionApplications: [
      {
        code: 'WMP1',
        sheetId: 'AA0100-0110',
        parcelId: 'AA0100-0110',
        appliedFor: { quantity: 25 }
      },
      {
        code: 'WMP1',
        sheetId: 'AA0101-0104',
        parcelId: 'AA0101-0104',
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
    expect(viewAgreement.template).toBe(
      'grant-types/wmp/view-agreement/view-agreement'
    )
  })

  test('builds the view model from the accepted WMP agreement payload', () => {
    expect(viewAgreement.buildModel({ agreementData })).toEqual({
      pageTitle: 'Woodland Management Plan PA3 agreement document',
      agreementTitle: 'Woodland Management Plan PA3 agreement document',
      agreementNumber: 'WMP-EXAMPLE-001',
      agreementHolderName: 'Example Farm Ltd',
      applicantName: 'Mr John Doe',
      address: '5 Example Lane, Example Lane, Example Lane, Exampleton, ZZ99 5ZZ',
      sbi: '900000005',
      agreementStartDate: '7 May 2026',
      agreementEndDate: '7 May 2027',
      landParcels: [
        { parcelId: 'AA0100-0110', areaHa: 25 },
        { parcelId: 'AA0101-0104', areaHa: 27.5 }
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

  test('masks draft agreement party details and uses fallback payment item values', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        ...agreementData,
        status: 'offered',
        signatureDate: undefined,
        agreementNumber: 'WMP-FALLBACK-456',
        clientRef: undefined,
        applicant: {},
        application: {
          parcel: [
            {
              parcelId: 'SD0000-0001',
              areaHa: 12.3456
            }
          ]
        },
        payment: {
          agreementStartDate: '2026-05-07',
          agreementEndDate: '2027-05-07',
          agreementTotalPence: undefined,
          agreementLevelItems: {
            1: {
              code: 'PA3',
              description: 'PA3: Woodland management plan',
              annualPaymentPence: 157500
            }
          }
        }
      }
    })

    expect(model.agreementNumber).toBe('WMP-FALLBACK-456')
    expect(model.agreementHolderName).toBe('XXXXX')
    expect(model.applicantName).toBe('XXXXX')
    expect(model.address).toBe('XXXXX')
    expect(model.agreementStartDate).toBe('XXXXX')
    expect(model.agreementEndDate).toBe('XXXXX')
    expect(model.acceptedOn).toBe('')
    expect(model.landParcels).toEqual([
      {
        parcelId: 'SD0000-0001',
        areaHa: 12.3456
      }
    ])
    expect(model.capitalItems).toEqual([
      {
        code: 'PA3',
        description: 'PA3: Woodland management plan',
        quantity: undefined,
        unit: 'ha',
        totalPaymentPence: 157500,
        totalPayment: '£1,575'
      }
    ])
    expect(model.agreementTotalPayment).toBe('')
    expect(model.isDraftAgreement).toBe(true)
    expect(model.isAgreementAccepted).toBe(false)
  })

  test('covers WMP fallback branches for missing ids, payment data and parcel area shape', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        code: 'woodland',
        status: 'accepted',
        identifiers: {},
        applicant: {
          business: {
            address: {}
          },
          customer: {}
        },
        application: {
          parcel: [
            {
              parcelId: 'AA0114-0001',
              areaHa: 9.8765
            }
          ]
        },
        payment: {
          agreementStartDate: '2026-05-07',
          agreementEndDate: '2027-05-07',
          agreementTotalPence: undefined,
          agreementLevelItems: {
            1: {
              code: 'PA3',
              description: 'PA3: Woodland management plan',
              unit: undefined,
              agreementTotalPence: undefined,
              annualPaymentPence: 25000
            }
          }
        },
        signatureDate: undefined,
        agreementNumber: 'WMP-FALLBACK-789'
      }
    })

    expect(model.agreementNumber).toBe('WMP-FALLBACK-789')
    expect(model.agreementHolderName).toBe('')
    expect(model.applicantName).toBe('')
    expect(model.address).toBe('')
    expect(model.sbi).toBe('')
    expect(model.landParcels).toEqual([
      {
        parcelId: 'AA0114-0001',
        areaHa: 9.8765
      }
    ])
    expect(model.capitalItems).toEqual([
      {
        code: 'PA3',
        description: 'PA3: Woodland management plan',
        quantity: undefined,
        unit: 'ha',
        totalPaymentPence: 25000,
        totalPayment: '£250'
      }
    ])
    expect(model.agreementTotalPayment).toBe('')
    expect(model.acceptedOn).toBe('')
  })
})
