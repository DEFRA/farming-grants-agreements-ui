import { globalIgnores } from 'eslint/config'
import neostandard from 'neostandard'
import importX from 'eslint-plugin-import-x'

const config = [
  globalIgnores(neostandard.resolveIgnoresFromGitignore()),
  ...neostandard({
    env: ['node', 'vitest'],
    noJsx: true,
    noStyle: true
  })
]

config.push({
  files: ['**/*.js'],
  plugins: {
    'import-x': importX
  },
  rules: {
    'import-x/no-unused-modules': [
      'error',
      {
        unusedExports: true,
        src: ['src/**/!(*.test).js']
      }
    ]
  }
})

config.push({
  files: ['**/*.test.{cjs,js}', '**/__test__/**', '**/test-helpers/**'],
  plugins: {
    'import-x': importX
  },
  rules: {
    'import-x/no-unused-modules': [
      'error',
      {
        unusedExports: true,
        src: [
          'src/**/*.test.js',
          'src/**/__test__/**/*.js',
          'src/**/test-helpers/**/*.js'
        ]
      }
    ]
  }
})

export default config
