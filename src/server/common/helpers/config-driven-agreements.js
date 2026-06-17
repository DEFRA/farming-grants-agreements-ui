const configDrivenAgreementNumberPrefixes = ['PMF']
const configDrivenGrantCodes = ['pigs-might-fly']

export const isConfigDrivenAgreementId = (agreementId = '') =>
  configDrivenAgreementNumberPrefixes.some((prefix) =>
    agreementId.toUpperCase().startsWith(prefix)
  )

export const isConfigDrivenGrantCode = (grantCode = '') =>
  configDrivenGrantCodes.includes(grantCode)
