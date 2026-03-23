# Botium Test Framework - Demo

[![CI](https://github.com/Libin-Samkutty/botium-chatbot-test-framework-demo/actions/workflows/botium-tests.yml/badge.svg)](https://github.com/Libin-Samkutty/botium-chatbot-test-framework-demo/actions/workflows/botium-tests.yml)

Demonstrates production-grade Botium-based testing for a healthcare chatbot. Tests conversational flows on Facebook Messenger and WhatsApp across staging and production environments.

**Note**: Credentials, IP addresses, webhook URLs, and organization-specific content replaced with placeholders.

## Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Documentation](#documentation)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Adding Tests](#adding-tests)
- [CI/Reporting](#cireporting)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with credentials

# Local
redis-server &
npm run inbound &
NODE_ENV=demo-stage-wa npx botium-cli run mochawesome --convos ./spec/convo/health_check/demo-stage-wa

# Docker
docker-compose --profile dev up
```

[Full guide](docs/QUICK_START.md)

## Documentation

| Document | Purpose |
|----------|---------|
| [Quick Start](docs/QUICK_START.md) | Setup and basic usage |
| [Advanced Patterns](docs/ADVANCED_PATTERNS.md) | Multi-turn, error handling, assertions |
| [Docker Setup](docs/DOCKER_SETUP.md) | Docker, CI/CD, deployment, Dockerfile optimization |

## Features

- Multi-channel testing (Facebook Messenger, WhatsApp)
- Staging and production configurations
- Reusable partial conversations (pconvo)
- Webhook-based testing with Redis inbound proxy
- Custom WhatsApp connector with HMAC signing
- Error handling and recovery patterns
- Multi-turn conversations
- Custom assertions library
- Docker and docker-compose setup
- CI/CD ready (GitHub Actions, Jenkins, GitLab CI, AWS CodePipeline)
- Mochawesome HTML reports
- Health checks and logging

## Prerequisites

- Node.js v14+
- npm v6+
- Python 3.6+ (CI script)
- Redis (webhook testing)
- AWS Credentials (optional - S3, SES, notifications)

### Check versions

```bash
node --version
npm --version
python3 --version
redis-cli ping
```

## Installation

```bash
git clone <repo> botium-chatbot-test-framework-demo
cd botium-chatbot-test-framework-demo
npm install
```

Applies patches via patch-package for compatibility fixes.

## Configuration

### Environment

```bash
cp .env.example .env
nano .env
```

Required:
- BOT_WEBHOOK_URL: Bot API endpoint
- FB_PAGE_ID: Facebook page ID
- FB_APP_SECRET: Facebook app secret
- WA_RECIPIENT_NUMBER: WhatsApp number
- WA_WEBHOOK_SECRET: WhatsApp webhook secret
- REDIS_URL: Redis connection

### Botium Configs

| File | Channel | Environment |
|------|---------|-------------|
| botium.demo-stage.json | Facebook Messenger | Staging |
| botium.demo-stage-wa.json | WhatsApp | Staging |
| botium.demo-prod.json | Facebook Messenger | Production |
| botium.demo-prod-wa.json | WhatsApp | Production |

Each specifies:
- Container mode (fbwebhook, whatsapp)
- Webhook URLs and credentials
- Timeout settings
- Logic hooks (delays, user ID generation)
- Custom build hooks (auth.js for secrets)

### Secrets

Development: Load from .env via auth.js and dotenv

Production: Replace auth.js with AWS SSM Parameter Store client
```javascript
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const ssm = new SSMClient({ region: 'ap-south-1' });
const cmd = new GetParameterCommand({
  Name: '/prod/fbAppSecret',
  WithDecryption: true
});
const result = await ssm.send(cmd);
botiumContainer.caps.FBWEBHOOK_APPSECRET = result.Parameter.Value;
```

## Running Tests

### Start Services

Terminal 1:
```bash
redis-server
```

Terminal 2:
```bash
npm run inbound
```

Listens on http://localhost:3000/inbound for webhook responses.

### Run Tests

Terminal 3:
```bash
# WhatsApp staging health check
NODE_ENV=demo-stage-wa npx botium-cli run mochawesome --convos ./spec/convo/health_check/demo-stage-wa

# Facebook staging smoke tests
NODE_ENV=demo-stage npx botium-cli run mochawesome --convos ./spec/convo/smoke/demo

# Advanced tests
NODE_ENV=demo-stage npx botium-cli run mochawesome --convos ./spec/convo/advanced
```

### Reports

```bash
open demo-stage-wa/mochawesome.html
```

Mochawesome generates HTML and JSON reports.

## Project Structure

```
.
├── Dockerfile                    # Multi-stage build
├── docker-compose.yml            # Services: Redis, Botium
├── .dockerignore                 # Build optimization
├── .env.example                  # Template
├── auth.js                       # Secrets loader
├── botium.*.json                 # Configurations (4 files)
├── botium.config.template.json   # Template
├── package.json                  # Dependencies
├── requirements.txt              # Python deps
├── python_send.py                # CI orchestration
│
├── connectors/
│   └── whatsapp-webhook-connector.js  # Custom WhatsApp connector
│
├── patches/
│   └── botium-core+1.15.9.patch
│
├── docs/
│   ├── QUICK_START.md
│   ├── ADVANCED_PATTERNS.md
│   └── DOCKER_SETUP.md
│
├── .github/workflows/
│   └── botium-tests.yml
│
└── spec/
    ├── botium.spec.js
    ├── convo/
    │   ├── smoke/demo/
    │   │   └── VerifyOnboarding.convo.txt
    │   ├── health_check/
    │   │   └── demo-stage/heartbeat.convo.txt
    │   ├── advanced/
    │   │   ├── ErrorHandling.convo.txt
    │   │   ├── MultiTurnConversation.convo.txt
    │   │   └── ResponseValidation.convo.txt
    │   └── performance_counts_stage/
    ├── stages/
    │   ├── patterns/
    │   │   ├── error_recovery.pconvo.txt
    │   │   └── faq_flow.pconvo.txt
    │   └── additional_content/user_onboarding/demo/
    └── helpers/
        └── custom-assertions.js
```

File naming:
- `.convo.txt`: Complete test conversation
- `.pconvo.txt`: Partial conversation (reusable fragment)

## Adding Tests

### New Smoke Test

`spec/convo/smoke/demo/VerifyAppointmentBooking.convo.txt`:
```
VerifyAppointmentBooking

#begin
UPDATE_CUSTOM FBUSER_ID|BOTIUM-FB-$random(10)

#me
I want to book an appointment

#include PCONVO_HEALTHCAREMENU_DEMO_ENG

#me
1

#bot
Specialty selection:
- Cardiology
- Neurology
- Dermatology
- General Practice
```

### New Partial Conversation

`spec/stages/additional_content/confirmation/appointment_confirm.pconvo.txt`:
```
PCONVO_APPOINTMENT_CONFIRM

#bot
Appointment confirmed.
Date: March 28, 2026 at 10:00 AM
Provider: Dr. Smith
Specialty: Cardiology

#me
Thank you

#bot
You will receive a reminder 24 hours before your appointment.
```

Include in conversations:
```
BookAppointmentTest

#me
Book appointment

#include PCONVO_APPOINTMENT_CONFIRM

#bot
Is there anything else I can help?
```

### Conversation Syntax

| Keyword | Purpose |
|---------|---------|
| #bot | Expected bot message (validation) |
| #me | User message to send |
| #begin | Setup/initialization |
| #include PCONVO_NAME | Include partial conversation |
| UPDATE_CUSTOM KEY\|VALUE | Set custom variable |
| ${{VARIABLE}} | Reference variable |
| $random(10) | Random 10-char string |

## CI/Reporting

`python_send.py` automates:
- Test execution
- Mochawesome HTML/JSON report generation
- S3 report uploads
- Email summaries via AWS SES
- Slack alerts on failures

### Usage

```bash
python3 python_send.py --Config demo-stage-wa
python3 python_send.py --Config demo-prod
```

### Configuration

Edit python_send.py:
- Line ~75: S3 bucket name
- Line ~85: S3 report URL
- Lines ~90-91: Email settings (sender, recipients)
- Lines ~129-130: Slack webhook URLs (prod/staging)

### AWS Credentials

```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=your-region

# Option 2: AWS credentials file
cat ~/.aws/credentials

# Option 3: IAM role (EC2)
# Attach role with S3, SES, CloudWatch permissions
```

### Jenkins Pipeline

```groovy
stage('Run Integration Tests') {
  steps {
    sh '''
      cd /home/jenkins/botium-chatbot-test-framework-demo
      python3 python_send.py --Config demo-stage-wa
    '''
  }
}
```

## Troubleshooting

### ECONNREFUSED 127.0.0.1:6379

Redis not running.

```bash
# Terminal 1
redis-server

# Terminal 2
npm run inbound

# Terminal 3
NODE_ENV=demo-stage-wa npx botium-cli run ...
```

### CUSTOMHOOK_ONBUILD Failed

Secrets not loaded.

```bash
cat .env
node -e "require('dotenv').config(); console.log('FB_APP_SECRET:', process.env.FB_APP_SECRET)"
```

### Tests timeout (120s)

Bot not responding.

```bash
# Test webhook URL
curl -X POST https://your-api.example.com/facebook/staging/receive -d '{}'

# Check bot logs
# Verify Redis: redis-cli ping
# Increase timeout: "WAITFORBOTTIMEOUT": "180000"
```

### FBWEBHOOK_PAGEID not found

.env not loaded or value missing.

```bash
ls -la .env
grep FB_PAGE_ID .env
NODE_ENV=demo-stage npx botium-cli run ...
```

### patch-package: no patches found

Patches not applied.

```bash
rm -rf node_modules package-lock.json
npm install
grep "PATCH:" node_modules/botium-core/src/containers/plugins/SimpleRestContainer.js
```

## Production Checklist

- [ ] Replace placeholders in botium.*.json
- [ ] Configure AWS SSM or secure secret management
- [ ] Update python_send.py with real S3, SES, Slack settings
- [ ] Set up AWS IAM role with S3, SES, SSM permissions
- [ ] Configure Redis for inbound webhook responses
- [ ] Add real test conversations
- [ ] Test with staging environment first
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring/alerting for test failures
- [ ] Document custom bot responses

## Resources

- [Botium Documentation](https://botium.atlassian.net/wiki)
- [WhatsApp API](https://www.whatsapp.com/business/api)
- [Facebook Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [Mochawesome Reports](https://adamgruber.github.io/mochawesome/)

## Production Use

1. Customize test conversations to match bot flows
2. Set up proper secret management (AWS SSM, Vault, etc.)
3. Integrate with CI/CD pipeline
4. Configure monitoring and alerting
5. Document test strategy and maintenance procedures

See [Botium documentation](https://botium.atlassian.net/wiki) for framework details.

License: Reference and educational purposes.
