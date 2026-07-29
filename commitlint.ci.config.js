import config from './commitlint.config.js'

export default {
  ...config,
  ignores: [
    (message) =>
      /^no-mistakes\((?:ci|document|review)\):\s+\S/.test(
        message.split('\n')[0]
      )
  ]
}
