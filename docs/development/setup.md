# Development Setup

## Prerequisites

### Required Software
- **Node.js 18+**: JavaScript runtime
- **Rust 1.70+**: Systems programming language
- **Python 3.8+**: Service development
- **Git**: Version control

### Optional Tools
- **VS Code**: Recommended IDE
- **Docker**: Container development
- **Postman**: API testing

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd ESpice
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Install Rust dependencies
cargo build
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
# Add your API keys and configuration
```

### 4. Database Setup
```bash
# Initialize database
npx prisma generate
npx prisma db push
```

## Development Workflow

### Starting Development
```bash
# Start desktop app
npm run dev

# Start services (in separate terminals)
cd services/pdf-service && python main.py
cd services/curve-extraction-service && python main.py
cd services/spice-service && python main.py
```

### Building for Production
```bash
# Build desktop app
npm run build

# Build services
cd services && docker-compose build
```

## Development Guidelines

### Code Standards
- **TypeScript**: Use strict mode
- **ESLint**: Follow linting rules
- **Prettier**: Consistent formatting
- **Testing**: Write unit tests

### Component Development
- Use component library for UI components
- Follow naming conventions
- Document complex logic
- Add TypeScript types

### Service Development
- Follow REST API conventions
- Add proper error handling
- Include logging
- Write API documentation

### Database Changes
- Use Prisma migrations
- Update schema documentation
- Test data integrity
- Backup before changes

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "component"
```

### Integration Tests
```bash
# Test services
cd services && python -m pytest

# Test API endpoints
npm run test:api
```

### E2E Tests
```bash
# Run end-to-end tests
npm run test:e2e
```

## Debugging

### Desktop App
- Use Chrome DevTools
- Check console logs
- Monitor network requests
- Use React DevTools

### Services
- Check service logs
- Use debugger breakpoints
- Monitor API responses
- Check database queries

### Common Issues
- **Port conflicts**: Change service ports
- **Database locks**: Restart database
- **Memory issues**: Increase Node.js memory
- **Build errors**: Clear cache and rebuild

## Performance

### Optimization Tips
- Use React.memo for expensive components
- Implement lazy loading
- Optimize bundle size
- Cache API responses

### Monitoring
- Monitor memory usage
- Track API response times
- Check build performance
- Profile critical paths

## Deployment

### Local Testing
```bash
# Test production build
npm run build
npm run preview
```

### Service Deployment
```bash
# Deploy services
cd services && docker-compose up -d
```

### Desktop Distribution
```bash
# Build installer
npm run tauri build
```

## Troubleshooting

### Common Problems
1. **Node modules issues**: Delete node_modules and reinstall
2. **Python dependencies**: Update pip and reinstall
3. **Rust compilation**: Update Rust toolchain
4. **Database issues**: Reset database and migrate

### Getting Help
- Check documentation
- Search existing issues
- Create detailed bug reports
- Ask in development channels 