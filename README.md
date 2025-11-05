# farming-grants-agreements-ui

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_farming-grants-agreements-ui&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_farming-grants-agreements-ui)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_farming-grants-agreements-ui&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_farming-grants-agreements-ui)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_farming-grants-agreements-ui&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_farming-grants-agreements-ui)

Core delivery platform Node.js Frontend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Server-side Caching](#server-side-caching)
- [Redis](#redis)
- [Local Development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Viewing messages in LocalStack SQS](#viewing-messages-in-localstack-sqs)
  - [The Google Analytics trackingId secret configuration GA_TRACKING_ID(googleAnalytics.trackingId)](#the-google-analytics-trackingid-secret-configuration-ga_tracking_idgoogleanalyticstrackingid)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd farming-grants-agreements-ui
nvm use
```

## Server-side Caching

We use Catbox for server-side caching. By default the service will use CatboxRedis when deployed and CatboxMemory for
local development.
You can override the default behaviour by setting the `SESSION_CACHE_ENGINE` environment variable to either `redis` or
`memory`.

Please note: CatboxMemory (`memory`) is _not_ suitable for production use! The cache will not be shared between each
instance of the service and it will not persist between restarts.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to the same Redis key-value store similar
to how services might have a database (or MongoDB). All frontend services are given access to a namespaced prefixed that
matches the service name. e.g. `my-service` will have access to everything in Redis that is prefixed with `my-service`.

If your service does not require a session cache to be shared between instances or if you don't require Redis, you can
disable setting `SESSION_CACHE_ENGINE=false` or changing the default value in `src/config/index.js`.

## Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then
because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the
proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local Development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the `docker run` command to ensure
> compatibility fEx: `docker build --platform=linux/arm64 --no-cache --tag farming-grants-agreements-ui`

Build:

```bash
docker build --target development --no-cache --tag farming-grants-agreements-ui:development .
```

Run:

```bash
docker run -p 3000:3000 farming-grants-agreements-ui:development
```

### Production image

Build:

```bash
docker build --no-cache --tag farming-grants-agreements-ui .
```

Run:

```bash
docker run -p 3000:3000 farming-grants-agreements-ui
```

### Running the agreements-api service with JWT authentication enabled

1. Ensure JWT is enabled in your .env file:

- `JWT_ENABLED=true`

2. Start the stack (MongoDB, LocalStack and this service):

   ```bash
   docker compose up -d --build
   ```

3. Verify containers are healthy (example output):

```
   NAME                                                           COMMAND                  STATE     PORTS
farming-grants-agreements-ui-farming-grants-agreements-api-1   "/sbin/tini -- node ."   running   3000/tcp, 0.0.0.0:3555->3555/tcp, [::]:3555->3555/tcp
farming-grants-agreements-ui-farming-grants-agreements-ui-1    "/sbin/tini -- node …"   running   127.0.0.1:3000->3000/tcp
farming-grants-agreements-ui-localstack-1                      "docker-entrypoint.sh"   running   0.0.0.0:4510-4559->4510-4559/tcp, [::]:4510-4559->4510-4559/tcp, 0.0.0.0:4566->4566/tcp, [::]:4566->4566/tcp, 5678/tcp
farming-grants-agreements-ui-mongodb-1                         "docker-entrypoint.s…"   running   0.0.0.0:27017->27017/tcp, [::]:27017->27017/tcp
farming-grants-agreements-ui-redis-1                           "docker-entrypoint.s…"   running   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
```

## API endpoints

| Endpoint              | Description                                                   |
| :-------------------- | :------------------------------------------------------------ |
| `GET: /health`        | Health                                                        |
| `GET: /{agreementId}` | Get an agreement in HTML format based on agreementId          |
| `GET: /`              | Get an agreement in HTML format based on the sbi in the token |

Pass the JWT token in the header as `x-encrypted-auth`.

### Generating a JWT for API calls (scripts/gen-auth-header.js)

Use the helper script to generate a valid token that this API will accept.

Requirements:

- Use the same JWT secret as the service (AGREEMENTS_JWT_SECRET). When running with Docker Compose, it defaults to `a-string-secret-at-least-256-bits-long` unless you override it in your environment.
- The `source` claim must be one of `defra` (farmer) or `entra` (case worker).
- When `source=defra`, you can include an `sbi` claim to test farmer-scoped endpoints.

Run examples:

- With the secret provided as an argument:

  ```bash
  node ./scripts/gen-auth-header.js --source defra --sbi 106284777 \
    --secret "a-string-secret-at-least-256-bits-long"
  ```

- Or using an environment variable for the secret (recommended):

  ```bash
  AGREEMENTS_JWT_SECRET="a-string-secret-at-least-256-bits-long" \
  node ./scripts/gen-auth-header.js --source entra
  ```

Expected output (example):

```
UI/API header { 'x-encrypted-auth': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....' }
```

Copy the token value and use it in your requests. For example:

```bash
curl -sS http://localhost:3555/ \
  -H "x-encrypted-auth: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
```

Notes:

- On Windows PowerShell, use double quotes around arguments and escape as needed, for example:
  ```powershell
  $env:AGREEMENTS_JWT_SECRET="a-string-secret-at-least-256-bits-long"; `
  node ./scripts/gen-auth-header.js --source defra --sbi 106284777
  ```
- The script validates `--source` and will exit with an error if the value is not `defra` or `entra` or if the secret is missing.

Sample token for farmer's (`source=defra`) data:

`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwic2JpIjoxMDYyODQ3NzcsInNvdXJjZSI6ImRlZnJhIn0.6QYSh1udNQcOF53kBST-4koc8Dp7jQ2hkMEKvCfmO9U`

Example decoded payload:

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true,
  "iat": 1516239022,
  "sbi": 106284777,
  "source": "defra"
}
```

Sample token for case worker's (`source=entra`) data:

`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gQm9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwic291cmNlIjoiZW50cmEifQ.aKtZl5K7iTQ-XI0V1Uga4eR_zjPxX41MTJmzR9lBV7I`

Example decoded payload:

```json
{
  "sub": "1234567890",
  "name": "John Boe",
  "admin": true,
  "iat": 1516239022,
  "source": "entra"
}
```

### Docker Compose

A local environment with:

- Localstack for AWS services (S3, SQS)
- Redis
- MongoDB
- This service.
- A commented out backend example.

```bash
docker compose up --build -d
```

### Viewing messages in LocalStack SQS

By default, our LocalStack monitor only shows message counts (`ApproximateNumberOfMessages`, `ApproximateNumberOfMessagesNotVisible`) for each queue. This is intentional, so we don’t interfere with the application’s consumers — pulling messages removes them from visibility until they are deleted or the visibility timeout expires.

If you want to peek at the actual messages (for debugging or development only), you can run:

```bash
docker compose exec localstack sh -lc '
  QURL=$(awslocal sqs get-queue-url \
    --queue-name record_agreement_status_update \
    --query QueueUrl --output text)

  awslocal sqs receive-message \
    --queue-url "$QURL" \
    --max-number-of-messages 10 \
    --wait-time-seconds 1 \
    --message-attribute-names All \
    --attribute-names All
'
```

### The Google Analytics trackingId secret configuration GA_TRACKING_ID(googleAnalytics.trackingId)

- Development (Dev): GTM-WJ5C78H
- Production (Prod): GTM-KRJXHHT

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
