import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { buildNavigation } from './build-navigation.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import { getBaseUrl } from '../../../server/common/helpers/base-url.js'
import { getContentSecurityPolicyNonce } from '../../../server/common/helpers/content-security-policy-nonce.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

export function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  return {
    baseUrl: getBaseUrl(request),
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceTitle: config.get('serviceTitle'),
    serviceVersion: config.get('serviceVersion'),
    serviceUrl: '/',
    breadcrumbs: [],
    navigation: buildNavigation(request),
    getAssetPath(baseUrl, asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return path.join(baseUrl, assetPath, webpackAssetPath ?? asset)
    },
    agreement: request.pre?.data?.agreementData,
    isProduction: config.get('isProduction'),
    cspNonce: getContentSecurityPolicyNonce(request)
  }
}
