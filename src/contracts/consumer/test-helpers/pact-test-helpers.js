import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pact } from '@pact-foundation/pact'

const pactConsumer = 'farming-grants-agreements-ui'
const pactProvider = 'farming-grants-agreements-api'
const pactOutputDir = path.resolve('src', 'contracts', 'consumer', 'pacts')
const pactGeneratedDir = path.join(pactOutputDir, 'generated')

export const createConsumerPact = (testFileUrl) => {
  const testFilePath = fileURLToPath(testFileUrl)
  const testFileBase = path.basename(testFilePath).replace(/\.test\.js$/, '')
  const testDirBase = path.basename(path.dirname(testFilePath))
  const pactDirName = `${testDirBase}-${testFileBase}`

  return new Pact({
    consumer: pactConsumer,
    provider: pactProvider,
    port: 0,
    dir: path.join(pactGeneratedDir, pactDirName),
    pactfileWriteMode: 'update'
  })
}
