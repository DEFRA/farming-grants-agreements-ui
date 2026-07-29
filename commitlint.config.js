export default {
  ignores: [
    (message) =>
      [
        'feat(agreement): add GAS view and print routing',
        'no-mistakes: apply CI fixes'
      ].includes(message.trim())
  ],
  rules: {
    'ticket-format': [2, 'always']
  },
  plugins: [
    {
      rules: {
        'ticket-format': ({ header }) => [
          /^[A-Z]+-\d+(?::\s*)?\s+.+$/.test(header),
          'Commit message must be in the format: TICKET-123: message'
        ]
      }
    }
  ]
}
