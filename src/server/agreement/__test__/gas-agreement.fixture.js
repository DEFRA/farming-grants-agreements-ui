export const gasBackendUrl = 'http://localhost:3102'
export const gasGrantCode = 'pigs-might-fly'
const gasAgreementNumber = 'PMF823153883'

export const gasPublicAgreementPaths = {
  view: `/${gasAgreementNumber}`,
  print: `/${gasAgreementNumber}/print`
}

export const gasAgreementDocumentApiUrls = {
  view: `${gasBackendUrl}/agreements/${gasAgreementNumber}/document`,
  print: `${gasBackendUrl}/agreements/${gasAgreementNumber}/document`
}

export const gasViewPageModel = {
  page: { title: 'GAS managed agreement', layout: 'document' },
  agreement: {
    agreementNumber: gasAgreementNumber,
    code: 'GAS-ONLY',
    status: 'terminated'
  },
  components: [
    {
      component: 'heading',
      level: 1,
      text: 'Pigs Might Fly agreement'
    },
    {
      component: 'paragraph',
      text: 'This content came from the complete GAS page model.'
    },
    {
      component: 'summary-list',
      title: 'Agreement details',
      rows: [
        { label: 'Agreement number', text: gasAgreementNumber },
        { label: 'Status supplied by GAS', text: 'Terminated' }
      ]
    }
  ],
  actions: [
    {
      href: `/agreements/${gasAgreementNumber}/actions/accept-offer`,
      text: 'GAS provided action'
    }
  ],
  availableActions: ['gas-only-action'],
  grant: { code: 'gas-owned-grant' },
  lifecycle: { current: 'gas-owned-state' },
  template: { name: 'gas-owned-template' },
  readOnly: false
}
