import { MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '#~/server/server.js'
import { buildPactAgreement } from '#~/server/common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createConsumerPact } from '#~/contracts/consumer/pact-test-helpers.js'

const { like } = MatchersV2
const heferLink =
  '/farm-payments/fptt-information#sec-5-check-if-your-land-is-eligible-for-FPTT-actions'
const sssiLink =
  '/farm-payments/fptt-information#sec-10-get-all-necessary-regulatory-consents-permissions-and-licences-in-place'
const heferListItem = `a <a href="${heferLink}" class="govuk-link">Historic Environment Farm Environment Record (HEFER)</a> from Historic England`
const heferOnlyHeading =
  'You must get an SFI Historic Environment Farm Environment Record (SFI HEFER) from Historic England'
const heferOnlyBody =
  'This is because you are applying for actions on land with historic or archaeological features. You must do this before you do your selected SFI actions on this land.'
const heferOnlyGuidance = `href="${heferLink}" class="govuk-link" rel="noopener noreferrer" target="_blank">Read the guidance on land with historic or archaeological features (opens in new tab)</a> to find out what a HEFER is and how to request one.`
const sssiOnlyHeading = 'You must have SSSI consent'
const sssiOnlyBody =
  "You are applying for actions on land that's a site of special scientific interest (SSSI). You must get SSSI consent from Natural England."
const sssiOnlyGuidance = `href="${sssiLink}" class="govuk-link" rel="noopener noreferrer" target="_blank">Read the guidance on SSSI consent (opens in new tab).</a>`

describe('#offerAcceptedController', () => {
  let server

  const provider = createConsumerPact(import.meta.url)

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
  })

  test('displays the offer accepted page', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an accepted agreement offer')
      .uponReceiving(
        'a request from the customer to view the offer accepted page'
      )
      .withRequest('GET', '/', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: buildPactAgreement(
            { status: like('accepted') },
            { useMatchers: true }
          )
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: '/',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain('Offer accepted')
        expect(result).toContain('Agreement offer accepted')
        expect(result).toContain('The start date for this agreement is')
        expect(result).toContain('1 September 2025')
        expect(result).toContain('FPTT987654321')
      })
  })

  test('displays both consent links when the API returns both consent types', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an accepted agreement offer')
      .uponReceiving(
        'a request from the customer to view the offer accepted page with both consent requirements'
      )
      .withRequest('GET', '/', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: buildPactAgreement(
            { status: like('accepted'), consentVariant: 'both' },
            { useMatchers: true }
          )
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: '/',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain('You must get consent to do your actions')
        expect(result).toContain(
          "You are applying for actions on land that's a site of special scientific interest (SSSI) and land with historic or archaeological features."
        )
        expect(result).toContain(`href="${heferLink}"`)
        expect(result).toContain(`href="${sssiLink}"`)
        expect(result).toContain(heferListItem)
        expect(result).not.toContain(heferOnlyHeading)
        expect(result).not.toContain(sssiOnlyHeading)
      })
  })

  test('displays only the HEFER link when the API returns Historic England consent only', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an accepted agreement offer')
      .uponReceiving(
        'a request from the customer to view the offer accepted page with Historic England consent only'
      )
      .withRequest('GET', '/', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: buildPactAgreement(
            { status: like('accepted'), consentVariant: 'hefer' },
            { useMatchers: true }
          )
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: '/',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain(heferOnlyHeading)
        expect(result).toContain(heferOnlyBody)
        expect(result).toContain(heferOnlyGuidance)
        expect(result).toContain(`href="${heferLink}"`)
        expect(result).not.toContain('You must get consent to do your actions')
        expect(result).not.toContain(heferListItem)
        expect(result).not.toContain(`href="${sssiLink}"`)
      })
  })

  test('displays only the SSSI link when the API returns Natural England consent only', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an accepted agreement offer')
      .uponReceiving(
        'a request from the customer to view the offer accepted page with Natural England consent only'
      )
      .withRequest('GET', '/', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: buildPactAgreement(
            { status: like('accepted'), consentVariant: 'sssi' },
            { useMatchers: true }
          )
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: '/',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain(
          "You are applying for actions on land that's a site of special scientific interest (SSSI)."
        )
        expect(result).toContain(`href="${sssiLink}"`)
        expect(result).not.toContain(`href="${heferLink}"`)
        expect(result).toContain(sssiOnlyHeading)
        expect(result).toContain(sssiOnlyBody)
        expect(result).toContain(sssiOnlyGuidance)
        expect(result).not.toContain('You must get consent to do your actions')
        expect(result).not.toContain(heferOnlyHeading)
        expect(result).not.toContain(heferListItem)
      })
  })

  test('does not display consent guidance when the API returns no consent objects', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an accepted agreement offer')
      .uponReceiving(
        'a request from the customer to view the offer accepted page without consent requirements'
      )
      .withRequest('GET', '/', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: buildPactAgreement(
            { status: like('accepted'), consentVariant: 'none' },
            { useMatchers: true }
          )
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: '/',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).not.toContain('You must get consent to do your actions')
        expect(result).not.toContain(`href="${sssiLink}"`)
        expect(result).not.toContain(`href="${heferLink}"`)
      })
  })
})
