/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 */
export const viewOfferController = {
  handler(_request, h) {
    return h.view('view-offer/index', {
      pageTitle: 'Review your funding offer',
      heading: 'Review your funding offer'
    })
  }
}
