# Personalized Yoga Plan SaaS Platform

A comprehensive multi-tenant SaaS platform that generates AI-powered personalized yoga plans and integrates seamlessly with Wix sites as an embeddable widget.

## 🌟 Features

- **AI-Powered Plan Generation**: Uses Claude, GPT-4, and Gemini APIs to create personalized yoga sequences
- **Multi-Tenant Architecture**: Single application serving multiple yoga businesses
- **Wix Integration**: Embeddable widget for Wix sites with seamless user experience
- **Instructor Approval Workflow**: Plans require instructor review before delivery to users
- **Progress Tracking**: Comprehensive analytics and progress monitoring
- **Real-time Updates**: WebSocket connections for live updates
- **Mobile Responsive**: Works perfectly on all devices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Dashboard│    │   Wix Widget    │    │   Admin Portal  │
│   (Port 3000)   │    │   (Embedded)    │    │   (Port 3001)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │     Node.js API        │
                    │     (Port 8000)        │
                    └─────────┬───────────────┘
                              │
                    ┌─────────┴───────────┐
                    │    MongoDB +       │
                    │    Redis Cache     │
                    └─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 6.0+
- Redis (optional but recommended)
- Git

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/yoga-saas-platform.git
cd yoga-saas-platform

# Run automated setup
node scripts/setup-dev.js
```

### 2. Configure Environment

Update `backend/api/.env` with your API keys:

```env
# AI Service Keys (get from respective providers)
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Wix Integration (from Wix Developer Center)
WIX_APP_ID=your-wix-app-id
WIX_APP_SECRET=your-wix-app-secret

# Database
MONGODB_URI=mongodb://localhost:27017/yoga_saas_dev
```

### 3. Start Development

```bash
# Start all services
npm run dev

# Or start individually
npm run dev:dashboard  # React dashboard (localhost:3000)
npm run dev:api       # Node.js API (localhost:8000)
npm run dev:widget    # Widget development (localhost:3001)
```

### 4. Access Applications

- **Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/health
- **Widget Development**: http://localhost:3001

## 📁 Project Structure

```
yoga-saas-platform/
├── apps/
│   ├── yoga-dashboard/          # Main React dashboard
│   ├── wix-widget/             # Embeddable Wix widget
│   └── admin-portal/           # Super admin interface
├── backend/
│   ├── api/                    # Express.js API server
│   ├── database/               # MongoDB models & schemas
│   └── services/               # AI & external integrations
├── packages/
│   ├── shared-types/           # TypeScript definitions
│   ├── ui-components/          # Shared React components
│   └── api-client/             # API SDK
├── infrastructure/
│   ├── docker/                 # Container configurations
│   └── kubernetes/             # K8s manifests
└── scripts/                    # Build & deployment scripts
```

## 🔧 API Integration

### Authentication

The platform supports two authentication methods:

#### 1. Wix User Authentication
```javascript
// Automatic authentication when embedded in Wix
const response = await fetch('/api/auth/wix-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wixUserId: 'user-123',
    wixInstanceId: 'instance-456',
    siteId: 'site-789'
  })
});
```

#### 2. Standard Email/Password
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    tenantId: 'yoga-studio-123'
  })
});
```

### Generate Yoga Plan

```javascript
const response = await fetch('/api/yoga-plans/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'yoga-studio-123'
  },
  body: JSON.stringify({
    userId: 'user-123',
    assessment: {
      experience_level: 'intermediate',
      primary_goals: ['flexibility', 'stress_relief'],
      injuries_limitations: [],
      preferred_styles: ['vinyasa', 'yin'],
      session_duration: 45,
      sessions_per_week: 3
    }
  })
});
```

## 🎨 Wix Widget Integration

### 1. Build Widget
```bash
npm run build:widget
```

### 2. Deploy to CDN
```bash
# Upload to your CDN
aws s3 cp apps/wix-widget/dist/widget.js s3://your-bucket/widget.js
```

### 3. Embed in Wix Site
```html
<!-- Add to Wix site -->
<script src="https://your-cdn.com/widget.js"></script>
<div id="yoga-widget"></div>
<script>
  window.initYogaWidget(document.getElementById('yoga-widget'), {
    userId: '{{user.id}}',
    tenantId: '{{site.id}}',
    apiEndpoint: 'https://your-api.com'
  });
</script>
```

### 4. Register Wix App

1. Go to [Wix Developer Center](https://dev.wix.com/)
2. Create new app with these URLs:
   - **Dashboard**: `https://your-domain.com/dashboard`
   - **Widget**: `https://your-cdn.com/widget.js`
   - **Settings**: `https://your-domain.com/settings`

## 🤖 AI Integration

The platform uses a multi-tier AI strategy:

### Tier 1: Claude Haiku (80% of requests)
- **Cost**: $0.80 input / $4.00 output per million tokens
- **Use case**: Basic yoga sequences, standard personalization
- **Response time**: 800-1500ms

### Tier 2: GPT-4o (15% of requests)  
- **Cost**: $2.50 input / $10.00 output per million tokens
- **Use case**: Complex therapeutic sequences, injury modifications
- **Context**: 128K tokens

### Tier 3: Gemini 2.0 Flash (5% of requests)
- **Cost**: $0.075 input / $0.30 output per million tokens  
- **Use case**: High-volume basic sequences, A/B testing
- **Context**: 1M tokens

### Safety Features

- **Contraindication checking**: AI validates poses against user injuries
- **Instructor review**: All AI-generated plans require approval
- **Progressive difficulty**: Plans gradually increase in complexity
- **Modification suggestions**: Alternative poses for limitations

## 🚢 Deployment

### Development
```bash
# Build all applications
npm run build

# Deploy to staging
node scripts/deploy.js staging
```

### Production with Docker
```bash
# Build and deploy
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/yoga_saas
REDIS_URL=redis://redis-cluster:6379
JWT_SECRET=super-secure-production-secret
ANTHROPIC_API_KEY=your-production-api-key
```

## 💰 Business Model

### Pricing Tiers

| Feature | Free | Professional | Studio | Enterprise |
|---------|------|-------------|--------|------------|
| Members | 25 | 100 | 300 | Unlimited |
| AI Plans | 3 templates | Unlimited | Unlimited | Unlimited |
| Instructors | 1 | 2 | 5 | Unlimited |
| Analytics | Basic | Advanced | Advanced | Advanced |
| **Price** | **$0** | **$49/mo** | **$99/mo** | **$199/mo** |

### Revenue Projections

- **Year 1**: 500 studios × $75 average = $450K ARR
- **Year 2**: 2,000 studios × $90 average = $1.8M ARR
- **Gross Margin**: 85% (after hosting & AI costs)

## 🧪 Testing

```bash
# Run all tests
npm run test

# Individual test suites
npm run test:dashboard  # React component tests
npm run test:api       # API endpoint tests
npm run test:e2e       # End-to-end tests

# Test coverage
npm run test:coverage
```

## 📊 Monitoring

### Health Checks
- **API Health**: `GET /health`
- **Database**: Connection status monitoring
- **AI Services**: Response time tracking
- **Redis**: Cache hit rates

### Performance Metrics
- **API Response Time**: < 500ms average
- **Widget Load Time**: < 2 seconds
- **Plan Generation**: < 30 seconds
- **Database Queries**: < 100ms average

## 🔒 Security

### Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **GDPR Compliance**: User data anonymization and deletion
- **HIPAA Considerations**: Health data handling protocols
- **Rate Limiting**: API protection against abuse

### Authentication Security
- **JWT Tokens**: Short-lived with refresh rotation
- **Password Hashing**: bcrypt with salt rounds
- **Wix Integration**: Signed instance validation
- **CORS**: Restricted to approved domains

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for type safety
- Follow ESLint configuration
- Write tests for new features
- Update documentation

## 📖 API Documentation

### Core Endpoints

#### Authentication
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/wix-login` - Wix user authentication
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token

#### Yoga Plans
- `POST /api/yoga-plans/generate` - Generate new AI plan
- `GET /api/yoga-plans/user/:userId` - Get user's current plan
- `GET /api/yoga-plans/:planId` - Get specific plan details
- `PATCH /api/yoga-plans/:planId/approval` - Update plan approval status
- `GET /api/yoga-plans/review/pending` - Get plans pending review
- `POST /api/yoga-plans/:planId/session-complete` - Mark session complete

#### Users
- `GET /api/users/:userId` - Get user profile
- `PATCH /api/users/:userId` - Update user profile
- `GET /api/users/:userId/progress` - Get user progress stats
- `POST /api/users/:userId/achievements` - Award achievement

#### Wix Integration
- `GET /api/wix/members` - Get Wix site members
- `POST /api/wix/sync-user` - Sync user data with Wix
- `POST /api/wix/webhooks/member-created` - Handle new member webhook
- `POST /api/wix/webhooks/booking-confirmed` - Handle booking webhook

## 🎯 Roadmap

### Phase 1: MVP (Months 1-3)
- [x] Core React dashboard
- [x] Wix widget integration
- [x] AI plan generation (Claude)
- [x] Multi-tenant database
- [x] Basic instructor workflow
- [ ] User assessment form
- [ ] Plan approval system
- [ ] Wix App Market submission

### Phase 2: Enhanced Features (Months 4-6)
- [ ] Multi-AI integration (GPT-4 + Gemini)
- [ ] Advanced analytics dashboard
- [ ] Payment integration (Stripe)
- [ ] Email notifications
- [ ] Progress tracking improvements
- [ ] Mobile app companion
- [ ] API rate limiting & caching

### Phase 3: Scale & Growth (Months 7-12)
- [ ] Enterprise features
- [ ] White-label solutions
- [ ] International expansion
- [ ] Advanced AI with pose recognition
- [ ] Integration marketplace
- [ ] Advanced reporting & insights

## 🆘 Troubleshooting

### Common Issues

#### Widget Not Loading
```bash
# Check widget build
npm run build:widget

# Verify CDN upload
curl -I https://your-cdn.com/widget.js

# Check browser console for errors
```

#### API Connection Issues
```bash
# Check API health
curl http://localhost:8000/health

# Verify database connection
mongo mongodb://localhost:27017/yoga_saas_dev

# Check logs
docker logs yoga-api
```

#### Authentication Problems
```bash
# Verify JWT secret
echo $JWT_SECRET

# Check Wix instance decoding
node -e "console.log(require('./backend/utils/wixAuth').decodeWixInstance('instance-id'))"
```

#### AI Generation Failures
```bash
# Test API keys
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages

# Check quota limits
# Monitor token usage in dashboard
```

### Performance Issues

#### Slow API Responses
1. Enable Redis caching
2. Add database indexes
3. Optimize queries with aggregation
4. Implement connection pooling

#### Widget Load Time
1. Minimize bundle size
2. Use CDN for static assets
3. Enable gzip compression
4. Lazy load non-critical components

## 🔍 Monitoring & Analytics

### Application Metrics
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: await redis.ping() === 'PONG' ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  res.json(health);
});
```

### Business Metrics Dashboard
- Active users per tenant
- Plan generation success rate
- Instructor approval times
- Session completion rates
- Revenue per tenant
- Churn analysis

### Error Tracking
- Sentry.io integration for error monitoring
- Custom error boundaries in React
- API error logging with Winston
- User feedback collection

## 🌐 Internationalization

### Supported Languages (Planned)
- English (default)
- Spanish
- French  
- German
- Portuguese

### Implementation
```javascript
// i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: require('./locales/en.json') },
    es: { translation: require('./locales/es.json') }
  },
  lng: 'en',
  fallbackLng: 'en'
});
```

## 📱 Mobile Strategy

### Progressive Web App (PWA)
- Offline capability for saved plans
- Push notifications for session reminders
- App-like experience on mobile devices
- Home screen installation

### Future Native Apps
- React Native for iOS/Android
- Shared business logic with web platform
- Enhanced features like video demonstrations
- Wearable device integration

## 🤖 AI Safety & Ethics

### Safety Measures
- Medical contraindication database
- Human instructor oversight required
- Progressive difficulty validation
- User injury tracking and alerts

### Ethical Considerations
- Transparent AI decision making
- User data privacy protection
- Bias testing in AI recommendations
- Accessibility compliance (WCAG 2.1)

## 📄 Legal Considerations

### Terms of Service
- Liability limitations for yoga practice
- Medical disclaimer requirements
- Data processing agreements
- Intellectual property protection

### Compliance Requirements
- GDPR for EU users
- CCPA for California users
- HIPAA considerations for health data
- Accessibility standards (ADA compliance)

## 💡 Advanced Features (Future)

### AI Enhancements
- Computer vision for pose correction
- Voice-guided instruction generation
- Emotional state recognition
- Biometric integration (heart rate, stress)

### Social Features
- Community challenges
- Progress sharing
- Instructor-student messaging
- Group practice sessions

### Integration Ecosystem
- Fitness tracker synchronization
- Calendar app integration
- Payment processor options
- Third-party yoga content

## 📞 Support & Resources

### Documentation
- [API Reference](./docs/api/README.md)
- [Widget Integration Guide](./docs/wix-integration/README.md)
- [Deployment Guide](./docs/deployment/README.md)
- [Troubleshooting Guide](./docs/troubleshooting/README.md)

### Community
- [Discord Server](https://discord.gg/yoga-saas)
- [GitHub Discussions](https://github.com/your-username/yoga-saas-platform/discussions)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/yoga-saas)

### Professional Support
- Email: support@yoga-saas.com
- Documentation: https://docs.yoga-saas.com
- Status Page: https://status.yoga-saas.com

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for Claude AI capabilities
- **OpenAI** for GPT integration
- **Google** for Gemini AI services
- **Wix** for platform integration support
- **MongoDB** for database technology
- **React** community for excellent tooling

---

## Quick Commands Reference

```bash
# Development
npm run dev                # Start all services
npm run dev:dashboard     # React dashboard only
npm run dev:api          # API server only
npm run dev:widget       # Widget development

# Building
npm run build            # Build all applications
npm run build:dashboard  # Build React app
npm run build:widget     # Build Wix widget
npm run build:api        # Build API server

# Testing
npm run test            # Run all tests
npm run test:dashboard  # React tests
npm run test:api       # API tests
npm run test:e2e       # End-to-end tests

# Deployment
npm run deploy:staging     # Deploy to staging
npm run deploy:production  # Deploy to production
node scripts/deploy.js staging
```

**Ready to revolutionize yoga instruction with AI? Let's build the future of personalized wellness together! 🧘‍♀️✨**