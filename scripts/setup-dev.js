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
WIX_APP_ID=74a1061c-62ad-4926-94d7-ef7a94bc1330
WIX_APP_SECRET=74a1061c-62ad-4926-94d7-ef7a94bc1330
WIX_WEBHOOK_PUBLIC_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjiCUU/i0lULcoX3ulRfS
RPBh/NVOTRoST/4y04qkPT9LuuOPs0ptmdWUgY2n0jMdqoNOv/6WwLifKJ4xU5UD
vrBu8xWEBUJO4Z4BSKyaQ2H9WJ003R0kfOZBH6bKyEwAFRGw/1tZqkiy9KnRzC5L
7cmMS8pytJcx4ot7WP0mNPMz9q3sldzP5WnA1MF08p+pQoyQ9MgRJcCuFIDWd1cI
lPxeUVW2hQUq+a8l+ZfG9HYSAr3+3zeL0zJFOQai9kdzxe4VcIctSrlnO39lbar+
7mC6AgjyNNasfPN7Jl7vBj+JdFy7ORXe1fOvgcT/x9+M/8IMLj1+UjlW0uwk+voa
8QIDAQAB

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