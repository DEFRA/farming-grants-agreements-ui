export const offerAcceptedController = {
  async handler(request, h) {
    const { pageData } = request.pre?.data

    return h.view('offer-accepted/index', {
      pageTitle: 'Offer accepted',
      ...pageData
    })
  }
}
