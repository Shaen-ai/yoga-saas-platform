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

# scripts/setup-dev.js
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function execCommand(command) {
  console.log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function createEnvFile() {
  const envContent = `# Backend API Configuration
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/yoga_saas_dev
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# AI Service API Keys
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key

# Wix Integration
WIX_APP_ID=your-wix-app-id
WIX_APP_SECRET=your-wix-app-secret
WIX_WEBHOOK_PUBLIC_KEY=your-wix-webhook-public-key

# Redis Configuration
REDIS_URL=redis://localhost:6379

# AWS/CDN Configuration (Optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-bucket-name
CDN_DOMAIN=your-cdn-domain.com

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
`;

  const envPath = path.join(__dirname, '..', 'backend', 'api', '.env');
  
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file at backend/api/.env');
    console.log('⚠️  Please update the .env file with your actual API keys');
  } else {
    console.log('ℹ️  .env file already exists');
  }
}

function setupDevelopment() {
  console.log('🏗️  Setting up development environment...');

  // 1. Install root dependencies
  console.log('📦 Installing root dependencies...');
  execCommand('npm install');

  // 2. Install dependencies for all workspaces
  console.log('📦 Installing workspace dependencies...');
  execCommand('npm run install:all');

  // 3. Create environment file
  console.log('🔧 Setting up environment configuration...');
  createEnvFile();

  // 4. Build shared packages
  console.log('🔨 Building shared packages...');
  execCommand('npm run build:types');
  execCommand('npm run build:components');

  // 5. Set up database
  console.log('🗄️  Setting up database...');
  console.log('Make sure MongoDB is running on localhost:27017');
  
  // 6. Set up Git hooks (optional)
  if (fs.existsSync('.git')) {
    console.log('🪝 Setting up Git hooks...');
    const preCommitHook = `#!/bin/sh
npm run lint
npm run type-check
npm run test
`;
    const hooksDir = '.git/hooks';
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }
    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook);
    execCommand('chmod +x .git/hooks/pre-commit');
  }

  console.log('✅ Development environment setup complete!');
  console.log('');
  console.log('🚀 Quick start commands:');
  console.log('  npm run dev          - Start all services');
  console.log('  npm run dev:dashboard - Start React dashboard only');
  console.log('  npm run dev:api      - Start API server only');
  console.log('  npm run dev:widget   - Start widget development');
  console.log('');
  console.log('📚 Documentation:');
  console.log('  Dashboard: http://localhost:3000');
  console.log('  API: http://localhost:8000');
  console.log('  Widget dev: http://localhost:3001');
  console.log('');
  console.log('⚠️  Don\'t forget to:');
  console.log('  1. Update API keys in backend/api/.env');
  console.log('  2. Start MongoDB service');
  console.log('  3. Start Redis service (optional)');
}

// Run setup
setupDevelopment();