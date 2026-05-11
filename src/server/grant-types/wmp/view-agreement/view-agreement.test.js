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
              annualPaymentPence: 157500,
              quantity: 12.3456
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
        quantity: 12.3456,
        unit: 'ha',
        totalPaymentPence: 157500,
        totalPayment: '£1,575'
      }
    ])
    expect(model.agreementTotalPayment).toBe('')
    expect(model.isDraftAgreement).toBe(true)
    expect(model.isAgreementAccepted).toBe(false)
  })

  test('does not derive area when a WMP capital item has no quantity', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        ...agreementData,
        actionApplications: [
          {
            code: 'WMP1',
            parcelId: 'SD4841-4684',
            appliedFor: { quantity: 25.3874 }
          },
          {
            code: 'WMP1',
            parcelId: 'SD4842-3020',
            appliedFor: { quantity: 30.0123 }
          }
        ],
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

  test('formats API Decimal128 parcel areas and leaves missing capital item area blank', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        ...agreementData,
        application: {
          parcel: [
            {
              parcelId: 'SD4841-4684',
              area: { quantity: { $numberDecimal: '25.38745' } }
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
        quantity: ''
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
              description: 'Null area item',
              agreementTotalPence: 12345,
              quantity: null,
              unit: 'each'
            },
            2: {
              code: 'WMP2',
              description: 'Blank area item',
              annualPaymentPence: 1000,
              quantity: ' '
            },
            3: {
              code: 'WMP3',
              description: 'Invalid area item',
              quantity: 'not-a-number'
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
        quantity: '',
        unit: 'each',
        totalPaymentPence: 12345,
        totalPayment: '£123.45'
      }),
      expect.objectContaining({
        code: 'WMP2',
        quantity: '',
        unit: 'ha',
        totalPaymentPence: 1000,
        totalPayment: '£10'
      }),
      expect.objectContaining({
        code: 'WMP3',
        quantity: '',
        unit: 'ha',
        totalPaymentPence: 0,
        totalPayment: '£0'
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
              annualPaymentPence: 25000,
              quantity: 9.8765
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
        quantity: 9.8765,
        unit: 'ha',
        totalPaymentPence: 25000,
        totalPayment: '£250'
      }
    ])
    expect(model.agreementTotalPayment).toBe('')
    expect(model.acceptedOn).toBe('')
  })
})
