# Cloudflare Deployment Setup Guide

This project is configured to deploy to Cloudflare Pages automatically when you push to the `main` branch.

## Prerequisites

1. A Cloudflare account
2. A GitHub repository for this project

## Setup Instructions

### 1. Get Your Cloudflare Credentials

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use the **Custom token** template with these permissions:
   - **Account** - Cloudflare Pages:Edit
   - **Zone** - Zone:Read (if you're using a custom domain)
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

### 4. First-Time Setup

Before the GitHub Action can deploy, you need to create the Pages project:

```bash
# Build the project locally
npm run build

# Create the Pages project (run this once)
npx wrangler pages project create astro-app
```

## Deployment

### Automatic Deployment

Every push to the `main` branch will automatically deploy to production.

### Manual Deployment

You can also deploy manually:

```bash
# Deploy to production
npm run deploy

# Deploy to a preview branch
npm run deploy:preview
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

## Customization

### Project Name

To change the project name from `astro-app`:

1. Update `name` in `wrangler.toml`
2. Update `projectName` in `.github/workflows/deploy.yml`
3. Update the deployment scripts in `package.json` if needed

### Custom Domain

To add a custom domain:

1. Go to your Cloudflare Pages project
2. Navigate to **Custom domains**
3. Add your domain and follow the DNS configuration instructions

## Troubleshooting

### Build Failures

- Check the GitHub Actions logs for detailed error messages
- Ensure all dependencies are listed in `package.json`
- Verify that `npm ci` can run successfully locally

### Deployment Failures

- Verify your Cloudflare credentials are correct
- Check that the Pages project exists in your Cloudflare account
- Ensure the `dist/` directory is created during build

### Local Testing

Test the Cloudflare Pages functions locally:

```bash
npx wrangler pages dev ./dist
```

## Additional Resources

- [Astro Cloudflare Adapter Documentation](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)