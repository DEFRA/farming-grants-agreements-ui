import { viewAgreement } from './view-agreement.js'

describe('wmp viewAgreement', () => {
  const agreementData = {
    clientRef: 'wmp-926-wlw',
    code: 'woodland',
    status: 'accepted',
    updatedAt: '2026-04-20T09:15:33.583Z',
    identifiers: { sbi: '107593059', frn: '1076543210', crn: '1100957269' },
    answers: {
      landParcels: [
        { parcelId: 'SD7560-9193', areaHa: 25.3874 },
        { parcelId: 'SD5848-9205', areaHa: 169.8586 }
      ],
      totalAgreementPaymentPence: 166200,
      payments: {
        agreement: [
          {
            code: 'PA3',
            description: 'Woodland management plan',
            quantity: 55.4,
            agreementTotalPence: 166200,
            unit: 'ha'
          }
        ]
      },
      referenceNumber: 'WMP-926-WLW',
      applicant: {
        business: {
          name: 'Taylor Equestrian Yards',
          address: {
            line1: 'Taylor Equestrian Yards',
            line2: 'Riding Lane',
            line3: null,
            line4: null,
            line5: null,
            street: 'Riding Lane',
            city: 'Cambridge',
            postalCode: 'CB1 2AB'
          }
        },
        customer: {
          name: {
            title: 'Mr',
            first: 'Oliver',
            middle: 'J',
            last: 'Taylor'
          }
        }
      }
    },
    payment: {
      agreementStartDate: '2026-07-01',
      agreementEndDate: '2029-06-30'
    }
  }

  test('exposes the WMP view-agreement template path', () => {
    expect(viewAgreement.template).toBe('grant-types/wmp/view-agreement')
  })

  test('builds the view model from nested WMP answers data', () => {
    expect(viewAgreement.buildModel({ agreementData })).toEqual({
      pageTitle: 'Woodland Management Plan PA3 agreement document',
      agreementTitle: 'Woodland Management Plan PA3 agreement document',
      agreementNumber: 'WMP-926-WLW',
      agreementHolderName: 'Taylor Equestrian Yards',
      applicantName: 'Mr Oliver J Taylor',
      address:
        'Taylor Equestrian Yards, Riding Lane, Riding Lane, Cambridge, CB1 2AB',
      sbi: '107593059',
      agreementStartDate: '1 July 2026',
      agreementEndDate: '30 June 2029',
      landParcels: agreementData.answers.landParcels,
      capitalItems: [
        {
          code: 'PA3',
          description: 'Woodland management plan',
          quantity: 55.4,
          unit: 'ha',
          totalPaymentPence: 166200,
          totalPayment: '£1,662'
        }
      ],
      agreementTotalPayment: '£1,662',
      acceptedOn: '20 April 2026',
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
        answers: {
          ...agreementData.answers,
          referenceNumber: undefined
        }
      }
    })

    expect(model.agreementNumber).toBe('wmp-926-wlw')
  })

  test('falls back to top-level applicant, parcels, payment items and payment total', () => {
    const model = viewAgreement.buildModel({
      agreementData: {
        code: 'woodland',
        status: 'accepted',
        agreementNumber: 'WMP-20260507110750-27061',
        updatedAt: '2026-05-07T10:00:00.000Z',
        identifiers: { sbi: '106284736' },
        applicant: {
          business: {
            name: 'Example Farm Ltd',
            address: {
              line1: 'Farm House',
              city: 'York',
              postalCode: 'YO1 1AA'
            }
          },
          customer: {
            name: {
              first: 'John',
              last: 'Doe'
            }
          }
        },
        application: {
          parcel: [
            {
              sheetId: 'SD7560',
              parcelId: '9193',
              area: {
                quantity: 25.3874
              }
            }
          ]
        },
        payment: {
          agreementStartDate: '2026-05-07',
          agreementEndDate: '2027-05-07',
          agreementTotalPence: 166200,
          agreementLevelItems: {
            1: {
              code: 'PA3',
              description: 'PA3: Woodland management plan',
              annualPaymentPence: 166200
            }
          }
        }
      }
    })

    expect(model.agreementNumber).toBe('WMP-20260507110750-27061')
    expect(model.agreementHolderName).toBe('Example Farm Ltd')
    expect(model.applicantName).toBe('John Doe')
    expect(model.address).toBe('Farm House, York, YO1 1AA')
    expect(model.landParcels).toEqual([
      {
        parcelId: 'SD7560 9193',
        areaHa: 25.3874
      }
    ])
    expect(model.capitalItems).toEqual([
      {
        code: 'PA3',
        description: 'Woodland management plan',
        quantity: '',
        unit: 'ha',
        totalPaymentPence: 166200,
        totalPayment: '£1,662'
      }
    ])
    expect(model.agreementTotalPayment).toBe('£1,662')
  })
})
