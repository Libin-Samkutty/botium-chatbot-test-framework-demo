/**
 * Secrets Management Hook
 *
 * This module handles loading application secrets for Botium test execution.
 *
 * Two modes supported:
 * 1. DEVELOPMENT (current): Uses dotenv to load secrets from .env file
 * 2. PRODUCTION: Replace this entire file with AWS SSM Parameter Store client
 *
 * Called by Botium as CUSTOMHOOK_ONBUILD before test execution begins.
 */

module.exports = async (botiumContainer) => {
  // Development: Load from .env file
  require('dotenv').config();

  const fbAppSecret = process.env.FB_APP_SECRET;
  const waWebhookSecret = process.env.WA_WEBHOOK_SECRET;

  if (!fbAppSecret && !waWebhookSecret) {
    console.warn('[auth.js] ⚠️  No secrets loaded. Please ensure .env file exists and has FB_APP_SECRET/WA_WEBHOOK_SECRET');
  }

  if (fbAppSecret) {
    botiumContainer.caps.FBWEBHOOK_APPSECRET = fbAppSecret;
    console.log('[auth.js] ✓ Loaded FB_APP_SECRET from .env');
  }

  if (waWebhookSecret) {
    botiumContainer.caps.WHATSAPP_WEBHOOK_SECRET = waWebhookSecret;
    console.log('[auth.js] ✓ Loaded WA_WEBHOOK_SECRET from .env');
  }

  // ========================================================================
  // PRODUCTION SWAP: Replace with AWS SSM code below
  // ========================================================================
  // const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
  // const region = process.env.AWS_REGION || 'ap-south-1';
  // const ssm = new SSMClient({ region });
  //
  // try {
  //   const parameterPath = process.env.AWS_SSM_SECRET_PATH || '/staging/DEMO/fbAppSecret';
  //   const cmd = new GetParameterCommand({ Name: parameterPath, WithDecryption: true });
  //   const result = await ssm.send(cmd);
  //   botiumContainer.caps.FBWEBHOOK_APPSECRET = result.Parameter.Value;
  //   console.log('[auth.js] ✓ Loaded secrets from AWS SSM');
  // } catch (err) {
  //   console.error('[auth.js] ✗ Failed to load from AWS SSM:', err.message);
  //   throw err;
  // }
};
