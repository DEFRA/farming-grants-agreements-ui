export const viewAgreementController = {
  async handler(request, h) {
    const { pageData } = request.pre?.data

    return h.view('view-agreement/index', {
      pageTitle: pageData.agreementName,
      ...pageData
    })
  }
}
