import { MatchersV2 } from '@pact-foundation/pact'

import sampleData from '../index.js'

const { like, iso8601DateTimeWithMillis } = MatchersV2

export const expectedAgreement = {
  ...sampleData.agreements[0],
  notificationMessageId: like('b6cc5590-80f6-46ce-b5a5-14c7986591f4'),
  agreement: like('6900dfdd7fca822e749bb327'),
  correlationId: like('651e2c8a-fdd0-401f-a41d-4a9ff68803e5'),
  invoice: like([
    {
      agreementNumber: 'SFI987654321',
      correlationId: like('651e2c8a-fdd0-401f-a41d-4a9ff68803e5'),
      invoiceNumber: 'FRPS2',
      paymentHubRequest: {
        agreementNumber: 'SFI987654321',
        correlationId: like('651e2c8a-fdd0-401f-a41d-4a9ff68803e5'),
        dueDate: '2025-12-05',
        frn: 'frn',
        invoiceLines: like([
          [
            {
              description:
                '2025-12-05: Parcel: 8083: CMOR1: Assess moorland and produce a written record',
              schemeCode: 'CMOR1',
              value: 1204
            }
          ]
        ]),
        invoiceNumber: 'FRPS2',
        marketingYear: 2025,
        paymentRequestNumber: 1,
        sbi: '106284736',
        schedule: null,
        sourceSystem: 'AHWR',
        value: 96018
      },
      createdAt: iso8601DateTimeWithMillis('2025-12-31T23:59:59.999Z'),
      updatedAt: iso8601DateTimeWithMillis('2025-12-31T23:59:59.999Z')
    }
  ]),
  createdAt: iso8601DateTimeWithMillis('2025-12-31T23:59:59.999Z'),
  updatedAt: iso8601DateTimeWithMillis('2025-12-31T23:59:59.999Z')
}
