#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  production: {
    server: process.env.PRODUCTION_SERVER || 'your-server.com',
    user: process.env.DEPLOY_USER || 'deploy',
    path: '/opt/yoga-platform',
    branch: 'main'
  },
  staging: {
    server: process.env.STAGING_SERVER || 'staging.your-server.com',
    user: process.env.DEPLOY_USER || 'deploy',
    path: '/opt/yoga-platform-staging',
    branch: 'develop'
  }
};

function execCommand(command, options = {}) {
  console.log(`Executing: ${command}`);
  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function deployToEnvironment(env) {
  const envConfig = config[env];
  
  if (!envConfig) {
    console.error(`Unknown environment: ${env}`);
    process.exit(1);
  }

  console.log(`🚀 Deploying to ${env} environment...`);

  // 1. Build applications
  console.log('📦 Building applications...');
  execCommand('npm run build:dashboard');
  execCommand('npm run build:widget');

  // 2. Run tests
  console.log('🧪 Running tests...');
  execCommand('npm run test:dashboard');
  execCommand('npm run test:api');

  // 3. Build Docker images
  console.log('🐳 Building Docker images...');
  execCommand('docker build -f infrastructure/docker/Dockerfile.frontend -t yoga-dashboard:latest .');
  execCommand('docker build -f infrastructure/docker/Dockerfile.backend -t yoga-api:latest .');

  // 4. Upload widget to CDN
  console.log('☁️ Uploading widget to CDN...');
  if (process.env.AWS_S3_BUCKET) {
    execCommand(`aws s3 cp apps/wix-widget/dist/widget.js s3://${process.env.AWS_S3_BUCKET}/widget.js --cache-control "max-age=3600"`);
    console.log(`✅ Widget uploaded to: https://${process.env.CDN_DOMAIN}/widget.js`);
  }

  // 5. Deploy to server
  console.log('🌐 Deploying to server...');
  const deployScript = `
    cd ${envConfig.path} &&
    git pull origin ${envConfig.branch} &&
    docker-compose pull &&
    docker-compose up -d &&
    docker system prune -f
  `;

  execCommand(`ssh ${envConfig.user}@${envConfig.server} "${deployScript}"`);

  console.log(`✅ Deployment to ${env} completed successfully!`);
  
  if (env === 'production') {
    console.log('🎉 Production deployment complete!');
    console.log('📊 Dashboard: https://your-domain.com/dashboard');
    console.log('🔧 Widget: https://your-cdn.com/widget.js');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'staging';

// Validate environment
if (!['staging', 'production'].includes(environment)) {
  console.error('Usage: node deploy.js [staging|production]');
  process.exit(1);
}

// Run deployment
deployToEnvironment(environment);