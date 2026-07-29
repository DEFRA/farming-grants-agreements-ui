import config from './commitlint.config.js'

export default {
  ...config,
  ignores: [
    (message) =>
      /^(?:no-mistakes\((?:ci|document|review)\):\s+\S|no-mistakes: apply CI fixes$)/.test(
        message.split('\n')[0]
      )
  ]
}
