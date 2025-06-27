# Cloudflare Workers Deployment Setup Guide

This project is configured to deploy to Cloudflare Workers with static assets support. It automatically deploys when you push to the `main` branch.

## Prerequisites

1. A Cloudflare account
2. A GitHub repository for this project

## Setup Instructions

### 1. Get Your Cloudflare Credentials

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use the **Custom token** template with these permissions:
   - **Account** - Cloudflare Workers Scripts:Edit
   - **Zone** - Workers Routes:Edit (if using custom domain)
5. Copy the generated API token

### 2. Get Your Cloudflare Account ID

1. In the Cloudflare Dashboard, select your account
2. On the right sidebar, find and copy your **Account ID**

### 3. Configure GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these repository secrets:
   - `CLOUDFLARE_API_TOKEN`: Your API token from step 1
   - `CLOUDFLARE_ACCOUNT_ID`: Your account ID from step 2

## Deployment

### Automatic Deployment

Every push to the `main` branch will automatically deploy to production via GitHub Actions.

### Manual Deployment

You can also deploy manually from your local machine:

```bash
# Deploy to production
npm run deploy

# Deploy to a preview environment
npm run deploy:preview
```

### First-Time Setup

Before deploying, ensure you have Wrangler authenticated locally:

```bash
npx wrangler login
```

## Local Development

```bash
# Start the development server
npm run dev

# Build locally
npm run build

# Preview the production build
npm run preview
```

## Configuration

The project configuration is in `wrangler.toml`:

- `name`: The name of your Worker
- `compatibility_date`: The compatibility date for the Worker runtime
- `main`: Entry point for the Worker (Astro generates this)
- `assets.directory`: Directory containing static assets

## workers.dev Subdomain

Your Worker will be available at:
- `https://astro-app.<your-subdomain>.workers.dev`

To set up your subdomain:
1. Go to **Workers & Pages** in the Cloudflare Dashboard
2. Click on **Manage workers.dev**
3. Choose your subdomain

## Custom Domain

To add a custom domain:

1. Ensure your domain is active on Cloudflare
2. Go to your Worker in the Cloudflare Dashboard
3. Navigate to **Settings** → **Triggers**
4. Click **Add Custom Domain**
5. Enter your domain and configure the route

Or use Wrangler:

```bash
npx wrangler domains add your-domain.com
```

## Environment Variables and Secrets

### Development

Create a `.dev.vars` file for local development:

```
MY_SECRET=development-value
```

### Production

Add secrets via Wrangler:

```bash
npx wrangler secret put MY_SECRET
```

Or add them in the Cloudflare Dashboard under your Worker's **Settings** → **Variables**.

## Features Available with Workers

- **Preview URLs**: Each deployment gets a unique preview URL
- **Gradual Deployments**: Roll out changes gradually
- **Workers KV**: Key-value storage
- **R2**: Object storage
- **D1**: SQL database
- **Durable Objects**: Stateful serverless
- **Queues**: Message queuing
- **Cron Triggers**: Scheduled tasks
- **Service Bindings**: Connect Workers together

## Troubleshooting

### Build Failures

- Check the GitHub Actions logs for errors
- Ensure all dependencies are in `package.json`
- Verify `npm ci` runs successfully locally

### Deployment Failures

- Verify your Cloudflare credentials are correct
- Check that your account has the necessary permissions
- Ensure the Worker name is valid (lowercase, hyphens allowed)

### Local Development Issues

Test the Worker locally:

```bash
npx wrangler dev
```

## Migration Notes

This project has been migrated from Cloudflare Pages to Workers to access additional features like:
- Better observability with Workers Logs
- Cron Triggers for scheduled tasks
- Queue consumers for background processing
- More comprehensive deployment options

## Additional Resources

- [Astro Cloudflare Adapter Documentation](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers with Assets Documentation](https://developers.cloudflare.com/workers/static-assets/)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)