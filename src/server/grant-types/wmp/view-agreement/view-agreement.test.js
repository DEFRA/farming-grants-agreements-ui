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
          area: { quantity: 25 },
          actions: [{ code: 'PA3', appliedFor: { quantity: 55.4 } }]
        },
        {
          sheetId: 'SD4842-3020',
          parcelId: 'SD4842-3020',
          area: { quantity: 27.5 },
          actions: [{ code: 'PA3', appliedFor: { quantity: 55.4 } }]
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
          annualPaymentPence: 157500
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
      agreementNumber: 'WMP-20260507133228-24643',
      agreementHolderName: 'Example Farm Ltd',
      applicantName: 'Mr John Doe',
      businessName: 'Example Farm Ltd',
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
          quantity: 55.4
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

  test('masks draft agreement party details and maps capital item area', () => {
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
              areaHa: 12.3456,
              actions: [
                {
                  code: 'PA3',
                  appliedFor: { quantity: 12.3456 }
                }
              ]
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
    // Party/address details are no longer masked on draft agreements;
    // they fall back to empty strings when the applicant is missing.
    expect(model.agreementHolderName).toBe('')
    expect(model.applicantName).toBe('')
    expect(model.businessName).toBe('')
    expect(model.address).toBe('')
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
        quantity: 12.3456
      }
    ])
    expect(model.agreementTotalPayment).toBe('')
    expect(model.isDraftAgreement).toBe(true)
    expect(model.isAgreementAccepted).toBe(false)
  })

  test('does not derive area when a WMP capital item has no matching parcel action', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        ...agreementData,
        application: {
          parcel: [
            {
              parcelId: 'SD4841-4684',
              area: { quantity: 25.3874 },
              actions: [{ code: 'OTHER', appliedFor: { quantity: 25.3874 } }]
            }
          ]
        },
        payment: {
          ...agreementData.payment,
          agreementLevelItems: {
            1: {
              code: 'WMP1',
              description: 'Produce a woodland management plan',
              annualPaymentPence: 157500
            }
          }
        }
      }
    })

    expect(model.capitalItems).toEqual([
      expect.objectContaining({
        code: 'WMP1',
        description: 'Produce a woodland management plan',
        quantity: ''
      })
    ])
  })

  test('formats API Decimal128 parcel areas and capital item quantities from parcel actions', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        ...agreementData,
        application: {
          parcel: [
            {
              parcelId: 'SD4841-4684',
              area: { quantity: { $numberDecimal: '25.38745' } },
              actions: [
                {
                  code: 'WMP1',
                  appliedFor: { quantity: { $numberDecimal: '12.34546' } }
                },
                {
                  code: 'WMP2',
                  appliedFor: {}
                }
              ]
            }
          ]
        },
        actionApplications: [],
        payment: {
          ...agreementData.payment,
          agreementLevelItems: {
            1: {
              code: 'WMP1',
              description: 'Produce a woodland management plan',
              annualPaymentPence: 157500
            },
            2: {
              code: 'WMP2',
              description: 'Another woodland item',
              annualPaymentPence: 1000
            }
          }
        }
      }
    })

    expect(model.landParcels).toEqual([
      {
        parcelId: 'SD4841-4684',
        areaHa: 25.3875
      }
    ])
    expect(model.capitalItems).toEqual([
      expect.objectContaining({
        code: 'WMP1',
        quantity: 12.3455
      }),
      expect.objectContaining({
        code: 'WMP2',
        quantity: ''
      })
    ])
  })

  test('handles missing collections and invalid numeric fields without rendering fallback values', () => {
    const emptyModel = viewAgreement.buildModel({
      agreementData: {
        code: 'woodland',
        status: 'accepted',
        identifiers: {},
        signatureDate: undefined
      }
    })

    expect(emptyModel.agreementNumber).toBe('')
    expect(emptyModel.landParcels).toEqual([])
    expect(emptyModel.capitalItems).toEqual([])

    const model = viewAgreement.buildModel({
      agreementData: {
        ...agreementData,
        application: {
          parcel: [
            { parcelId: 'SD0000-0001', area: { quantity: null } },
            { parcelId: 'SD0000-0002', areaHa: 'not-a-number' },
            { parcelId: 'SD0000-0003', areaHa: ' ' }
          ]
        },
        payment: {
          ...agreementData.payment,
          agreementLevelItems: {
            1: {
              code: 'WMP1',
              description: 'Null area item'
            },
            2: {
              code: 'WMP2',
              description: 'Blank area item',
              annualPaymentPence: 1000
            },
            3: {
              code: 'WMP3',
              description: 'Invalid area item'
            }
          }
        },
        clientRef: undefined,
        agreementNumber: 'WMP-FALLBACK-999'
      }
    })

    expect(model.agreementNumber).toBe('WMP-FALLBACK-999')
    expect(model.landParcels).toEqual([
      { parcelId: 'SD0000-0001', areaHa: '' },
      { parcelId: 'SD0000-0002', areaHa: '' },
      { parcelId: 'SD0000-0003', areaHa: '' }
    ])
    expect(model.capitalItems).toEqual([
      expect.objectContaining({
        code: 'WMP1',
        quantity: ''
      }),
      expect.objectContaining({
        code: 'WMP2',
        quantity: ''
      }),
      expect.objectContaining({
        code: 'WMP3',
        quantity: ''
      })
    ])
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
              parcelId: 'SD9999-0001',
              areaHa: 9.8765,
              actions: [{ code: 'PA3', appliedFor: { quantity: 9.8765 } }]
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
              annualPaymentPence: 25000,
              quantity: 999
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
        parcelId: 'SD9999-0001',
        areaHa: 9.8765
      }
    ])
    expect(model.capitalItems).toEqual([
      {
        code: 'PA3',
        description: 'PA3: Woodland management plan',
        quantity: 9.8765
      }
    ])
    expect(model.agreementTotalPayment).toBe('')
    expect(model.acceptedOn).toBe('')
  })
})
