import {
  formatAgreementDate,
  formatApplicantName,
  getAgreementStatusFlags,
  maskIfRequired,
  shouldMaskAgreementPartyDetails
} from './view-agreement.js'

describe('shared view-agreement helpers', () => {
  test('formats applicant names with all populated parts', () => {
    expect(
      formatApplicantName({
        name: {
          title: 'Mrs',
          first: 'Jane',
          middle: ' Q ',
          last: 'Public'
        }
      })
    ).toBe('Mrs Jane Q Public')
  })

  test('returns empty string when applicant name is missing', () => {
    expect(formatApplicantName({})).toBe('')
    expect(formatApplicantName()).toBe('')
  })

  test('returns status flags for accepted agreements', () => {
    expect(getAgreementStatusFlags({ status: 'accepted' })).toEqual({
      isDraftAgreement: false,
      isAgreementAccepted: true,
      isWithdrawnAgreement: false,
      isCancelledAgreement: false,
      isTerminatedAgreement: false
    })
  })

  test('returns status flags for terminated agreements', () => {
    expect(getAgreementStatusFlags({ status: 'terminated' })).toEqual({
      isDraftAgreement: false,
      isAgreementAccepted: false,
      isWithdrawnAgreement: false,
      isCancelledAgreement: false,
      isTerminatedAgreement: true
    })
  })

  test('masks party details for draft, withdrawn and cancelled statuses only', () => {
    expect(
      shouldMaskAgreementPartyDetails({
        isDraftAgreement: true,
        isWithdrawnAgreement: false,
        isCancelledAgreement: false
      })
    ).toBe(true)
    expect(
      shouldMaskAgreementPartyDetails({
        isDraftAgreement: false,
        isWithdrawnAgreement: true,
        isCancelledAgreement: false
      })
    ).toBe(true)
    expect(
      shouldMaskAgreementPartyDetails({
        isDraftAgreement: false,
        isWithdrawnAgreement: false,
        isCancelledAgreement: true
      })
    ).toBe(true)
    expect(
      shouldMaskAgreementPartyDetails({
        isDraftAgreement: false,
        isWithdrawnAgreement: false,
        isCancelledAgreement: false,
        isTerminatedAgreement: true
      })
    ).toBe(false)
  })

  test('masks values only when required', () => {
    expect(maskIfRequired('Example Farm Ltd', true)).toBe('XXXXX')
    expect(maskIfRequired('Example Farm Ltd', false)).toBe('Example Farm Ltd')
    expect(maskIfRequired(undefined, false)).toBe('')
  })

  test('formats dates unless masked or missing', () => {
    expect(formatAgreementDate('2026-05-07', false)).toBe('7 May 2026')
    expect(formatAgreementDate('2026-05-07', true)).toBe('XXXXX')
    expect(formatAgreementDate(undefined, false)).toBe('')
  })
})
