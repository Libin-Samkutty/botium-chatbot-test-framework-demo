# Docker Setup

## Docker Compose

```bash
cp .env.example .env
nano .env

docker-compose --profile dev up
```

In another terminal:
```bash
docker-compose --profile dev exec botium-dev npm test
```

## Profiles

**dev**: Hot reload, all dependencies, mounted source code
```bash
docker-compose --profile dev up
```

**prod**: Optimized image, production dependencies only
```bash
docker-compose --profile prod build
docker-compose --profile prod up
```

## Commands

```bash
# Build production image
docker-compose --profile prod build

# Run tests
docker-compose --profile dev exec botium-dev NODE_ENV=demo-stage-wa npx botium-cli run --convos ./spec/convo/health_check/demo-stage-wa

# View logs
docker-compose logs -f botium-dev
docker-compose logs -f redis

# Stop
docker-compose down
```

## Services

**redis:7-alpine**
- Port: 6379
- Health check enabled
- Data persistence to redis_data volume

**botium-dev**
- Port: 3000
- Source code mounted (hot reload)
- DEBUG=botium:* enabled

**botium-prod**
- Port: 3000
- Self-contained image
- Production ready

## GitHub Actions

`.github/workflows/botium-tests.yml` runs on:
- Push to main/develop
- Pull requests to main/develop
<!-- - Schedule every 4 hours -->

Required secrets:
- BOT_WEBHOOK_URL_STAGING
- FB_PAGE_ID
- FB_APP_SECRET
- WA_RECIPIENT_NUMBER
- WA_WEBHOOK_SECRET

## Jenkins

```groovy
pipeline {
    agent {
        docker {
            image 'botium-chatbot-demo:latest'
            args '-p 3000:3000 --network jenkins'
        }
    }

    environment {
        NODE_ENV = 'demo-stage-wa'
        REDIS_URL = 'redis://redis:6379'
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npx botium-cli run mochawesome --convos ./spec/convo/health_check/demo-stage-wa'
            }
        }

        stage('Report') {
            steps {
                publishHTML([
                    reportDir: 'demo-stage-wa',
                    reportFiles: 'mochawesome.html',
                    reportName: 'Botium Tests'
                ])
            }
        }
    }

    post {
        always {
            junit 'demo-stage-wa/mochawesome.json'
        }
    }
}
```

## GitLab CI

```yaml
stages:
  - test

services:
  - redis:7-alpine

variables:
  REDIS_URL: "redis://redis:6379"

test:
  stage: test
  image: node:20
  before_script:
    - npm install
  script:
    - NODE_ENV=demo-stage-wa npx botium-cli run mochawesome --convos ./spec/convo/health_check/demo-stage-wa
  artifacts:
    reports:
      junit: "**/mochawesome.json"
    paths:
      - "*/mochawesome.html"
```

## AWS CodePipeline

buildspec.yml:
```yaml
version: 0.2

phases:
  pre_build:
    commands:
      - npm install
      - pip3 install -r requirements.txt

  build:
    commands:
      - NODE_ENV=demo-stage-wa npx botium-cli run mochawesome --convos ./spec/convo/health_check/demo-stage-wa
      - python3 python_send.py --Config demo-stage-wa

artifacts:
  files:
    - '**/mochawesome.html'
    - '**/mochawesome.json'

cache:
  paths:
    - 'node_modules/**/*'
```

## Environment Variables

```env
BOT_WEBHOOK_URL=https://your-bot-api.example.com/facebook/staging/receive
WA_WEBHOOK_URL=https://your-bot-api.example.com/wa-receive
FB_PAGE_ID=your_facebook_page_id
FB_APP_SECRET=your_fb_app_secret
WA_RECIPIENT_NUMBER=+1234567890
WA_WEBHOOK_SECRET=your_wa_webhook_secret
REDIS_URL=redis://redis:6379
```

## Troubleshooting

**Cannot connect to Redis**
```bash
docker-compose ps
docker-compose logs redis
docker-compose exec redis redis-cli ping
```

**Port 3000 already in use**
```bash
docker-compose run -p 3001:3000 botium npm run inbound
```

**Tests timeout**
- Increase timeout in botium config
- Verify bot webhook URL is accessible from Docker network
- Check bot logs

**Environment variables not loaded**
```bash
ls -la .env
docker-compose exec botium-dev env | grep FB_
```

## Production Deployment

1. Build production image
   ```bash
   docker-compose --profile prod build
   ```

2. Tag for registry
   ```bash
   docker tag botium-prod:latest myregistry/botium:1.0.0
   ```

3. Push
   ```bash
   docker push myregistry/botium:1.0.0
   ```

4. Deploy
   ```bash
   docker pull myregistry/botium:1.0.0
   docker run --env-file .env myregistry/botium:1.0.0
   ```

5. Verify health
   ```bash
   docker ps
   ```
