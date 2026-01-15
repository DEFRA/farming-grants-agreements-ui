import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pact } from '@pact-foundation/pact'

export const pactConsumer = 'farming-grants-agreements-ui'
export const pactProvider = 'farming-grants-agreements-api'
export const pactOutputDir = path.resolve(
  'src',
  'contracts',
  'consumer',
  'pacts'
)
export const pactGeneratedDir = path.join(pactOutputDir, 'generated')
export const pactOutputFile = `${pactConsumer}-${pactProvider}.json`

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
