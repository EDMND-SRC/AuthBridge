# CI Secrets Checklist

Required secrets and environment variables for the CI/CD pipeline.

## GitHub Actions Secrets

Configure in: **Settings → Secrets and variables → Actions**

### Required (Auto-Provided)

| Secret | Purpose | Notes |
|--------|---------|-------|
| `GITHUB_TOKEN` | Artifact upload, PR comments | Automatically provided |

### Optional

| Secret | Purpose | How to Get |
|--------|---------|------------|
| `SLACK_WEBHOOK` | Failure notifications | Slack App → Incoming Webhooks |
| `STAGING_URL` | Staging environment URL | Your staging deployment |
| `PRODUCTION_URL` | Production environment URL | Your production deployment |

## Environment Variables

Set in workflow files or repository variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_VERSION` | 22 | Node.js version |
| `PNPM_VERSION` | 8 | pnpm version |
| `TEST_ENV` | local | Test environment |

## Setting Up Secrets

### GitHub

1. Go to repository **Settings**
2. Click **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter name and value
5. Click **Add secret**

### Slack Webhook (Optional)

1. Go to [Slack API](https://api.slack.com/apps)
2. Create new app or select existing
3. Enable **Incoming Webhooks**
4. Add webhook to channel
5. Copy webhook URL
6. Add as `SLACK_WEBHOOK` secret

## Security Best Practices

- ✅ Never commit secrets to code
- ✅ Use repository secrets, not workflow env vars
- ✅ Rotate secrets periodically
- ✅ Use least-privilege access
- ✅ Audit secret access in Settings → Security

## Verification

After setting secrets, verify with a test run:

```bash
gh workflow run quality-pipeline.yml
```

Or push a commit to trigger the pipeline.
