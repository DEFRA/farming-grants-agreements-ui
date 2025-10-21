export const reviewOfferController = {
  async handler(request, h) {
    const { pageData } = request.pre?.data

    return h.view('review-offer/index', {
      pageTitle: 'Review your funding offer',
      ...pageData
    })
  }
}
