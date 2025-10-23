export const offerWithdrawnController = {
  async handler(request, h) {
    return h.view('offer-withdrawn/index', {
      pageTitle: 'You have requested an update to your offer'
    })
  }
}
