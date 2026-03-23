# Quick Start

## Local Setup

```bash
npm install
cp .env.example .env
# Edit .env with credentials

# Terminal 1
redis-server

# Terminal 2
npm run inbound

# Terminal 3
NODE_ENV=demo-stage-wa npx botium-cli run mochawesome --convos ./spec/convo/health_check/demo-stage-wa
```

Results: `demo-stage-wa/mochawesome.html`

## Docker Setup

```bash
cp .env.example .env
# Edit .env with credentials

docker-compose --profile dev up
```

In another terminal:
```bash
docker-compose --profile dev exec botium-dev NODE_ENV=demo-stage-wa npx botium-cli run mochawesome --convos ./spec/convo/health_check/demo-stage-wa
```

Production:
```bash
docker-compose --profile prod build
docker-compose --profile prod up
```

## Test Suites

```bash
# Facebook smoke tests
NODE_ENV=demo-stage npx botium-cli run mochawesome --convos ./spec/convo/smoke/demo

# WhatsApp advanced tests
NODE_ENV=demo-stage-wa npx botium-cli run mochawesome --convos ./spec/convo/advanced

# Health checks
NODE_ENV=demo-stage npx botium-cli run mochawesome --convos ./spec/convo/health_check
```

## Create Test

```bash
cat > spec/convo/smoke/demo/MyFirstTest.convo.txt << 'EOF'
PatientGreetingTest

#me
Hello

#bot
Welcome to HealthCare Assistant. How can I help with your medical needs?

#me
I need an appointment

#bot
Which specialty would you like to schedule with?
EOF
```

Run:
```bash
NODE_ENV=demo-stage npx botium-cli run mochawesome --convos ./spec/convo/smoke/demo
```

## Common Commands

```bash
# Single test file
NODE_ENV=demo-stage npx botium-cli run ./spec/convo/smoke/demo/VerifyOnboarding.convo.txt

# Extended timeout
NODE_ENV=demo-stage npx botium-cli run --timeout 180000 --convos ./spec/convo/smoke/demo

# JSON output
NODE_ENV=demo-stage npx botium-cli run --reporter json --convos ./spec/convo/smoke/demo

# Debug logging
NODE_ENV=demo-stage DEBUG=botium:* npx botium-cli run --convos ./spec/convo/smoke/demo
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Bot credentials and URLs |
| `botium.demo-stage.json` | Staging configuration |
| `spec/convo/` | Test scripts |
| `spec/stages/` | Reusable conversation fragments |
| `Dockerfile` | Container image |
| `docker-compose.yml` | Service orchestration |

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| ECONNREFUSED 127.0.0.1:6379 | Redis not running | `redis-server` |
| Webhook URL unreachable | Incorrect URL in .env | Verify BOT_WEBHOOK_URL |
| Tests timeout | Bot not responding | Increase timeout: `--timeout 180000` |
| .env not loaded | File missing | `cp .env.example .env` |

## References

- [Advanced Patterns](./ADVANCED_PATTERNS.md)
- [Docker Setup](./DOCKER_SETUP.md)
- [Botium Documentation](https://botium.atlassian.net/wiki)
- [README](../README.md)
