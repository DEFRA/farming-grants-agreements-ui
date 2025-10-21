export const offerWithdrawnController = {
  async handler(request, h) {
    const { agreement } = request.pre?.data

    return h.view('offer-withdrawn/index', {
      pageTitle: 'Do do',
      ...agreement
    })
  }
}
