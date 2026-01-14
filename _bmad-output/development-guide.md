# Development Guide

## Prerequisites

Before starting development, ensure you have the following installed:

```bash
node: ">=16.15.1"
pnpm: ">=7.11.0"
git: ">=2.0.0"
```

### Installation Commands

```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 16.15.1
nvm use 16.15.1

# Install pnpm
npm install -g pnpm@7.11.0

# Verify installations
node --version
pnpm --version
```

## Project Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone git@github.com:ballerine-io/ballerine.git authbridge
cd authbridge

# Initialize git submodules (optional - for backend and mobile SDKs)
git submodule init
git submodule update
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# This installs dependencies for:
# - Root workspace
# - apps/backoffice
# - sdks/web-sdk
# - packages/config
# - All other workspace packages
```

### 3. Environment Setup

```bash
# Copy environment files
cp apps/backoffice/.env.example apps/backoffice/.env
cp sdks/web-sdk/.env.example sdks/web-sdk/.env

# Edit environment variables as needed
nano apps/backoffice/.env
```

## Development Commands

### Start All Services

```bash
# Start both backoffice and web SDK in development mode
pnpm dev

# This runs:
# - Backoffice at http://localhost:3001
# - Web SDK at http://localhost:3000
```

### Individual Services

```bash
# Start backoffice only
pnpm backoffice:dev

# Start web SDK only
pnpm web-sdk:dev

# Start web SDK examples
pnpm web-sdk:example
```

### Build Commands

```bash
# Build all packages
pnpm build

# Build specific packages
pnpm web-sdk:build
pnpm backoffice:build

# Build for production
NODE_ENV=production pnpm build
```

### Testing Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e

# Run specific package tests
pnpm web-sdk:test
pnpm backoffice:test
```

## Code Quality

### Linting and Formatting

```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format all code
pnpm format

# Check formatting
pnpm format:check
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks:

```bash
# Hooks are automatically installed with pnpm install
# They run on every commit to ensure code quality

# Manual hook execution
npx husky run .husky/pre-commit
```

## Git Workflow

### Branch Naming

Use the branchlint CLI for consistent branch names:

```bash
# Create a new branch with guided prompts
pnpm branchlint

# This creates branches like:
# feature/add-document-type
# fix/camera-permission-handling
# docs/update-api-documentation
```

### Commit Messages

Use commitizen for conventional commits:

```bash
# Stage your changes
git add .

# Create a formatted commit
pnpm commit

# This opens an interactive prompt for:
# - Type: feat, fix, docs, style, refactor, test, chore
# - Scope: backoffice, web-sdk, mobile-sdk, etc.
# - Description: Brief description of changes
# - Body: Detailed description (optional)
# - Breaking changes: If applicable
```

### Pull Request Process

1. **Create feature branch** using `pnpm branchlint`
2. **Make changes** following the style guide
3. **Test changes** with `pnpm test`
4. **Commit changes** using `pnpm commit`
5. **Push branch** and create pull request
6. **Wait for CI** to pass all checks
7. **Request review** from maintainers

## Development Environment

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "svelte.svelte-vscode",
    "ms-playwright.playwright"
  ]
}
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": [
    "apps/backoffice",
    "sdks/web-sdk",
    "packages/config"
  ]
}
```

## Package-Specific Development

### Backoffice Development

```bash
# Navigate to backoffice
cd apps/backoffice

# Start development server
pnpm dev

# Available at http://localhost:3001
# Hot reload enabled
# Mock data enabled by default
```

**Key Development Files:**
- `src/App.tsx` - Main application component
- `src/pages/` - Route-based pages
- `src/components/` - Reusable components
- `craco.config.cjs` - Webpack configuration
- `.env` - Environment variables

### Web SDK Development

```bash
# Navigate to web SDK
cd sdks/web-sdk

# Start development server
pnpm dev

# Available at http://localhost:3000
# Includes hot reload and HMR
```

**Key Development Files:**
- `src/main.ts` - SDK entry point
- `src/lib/components/` - Svelte components
- `src/lib/flows/` - Flow definitions
- `vite.config.ts` - Build configuration
- `examples/` - Integration examples

### Shared Packages Development

```bash
# Navigate to config package
cd packages/config

# Modify ESLint or Prettier rules
nano eslintrc.base.cjs
nano prettierrc.base.cjs

# Changes automatically apply to all packages
```

## Testing Strategy

### Unit Testing

```bash
# Run unit tests for all packages
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

**Test Structure:**
```
src/
├── components/
│   ├── Button/
│   │   ├── Button.svelte
│   │   └── Button.test.ts
│   └── DocumentUpload/
│       ├── DocumentUpload.svelte
│       └── DocumentUpload.test.ts
```

### E2E Testing

```bash
# Run Playwright E2E tests
pnpm test:e2e

# Run E2E tests in headed mode
pnpm test:e2e:headed

# Debug E2E tests
pnpm test:e2e:debug
```

**E2E Test Structure:**
```
e2e/
├── flows/
│   ├── kyc-flow.spec.ts
│   └── document-upload.spec.ts
├── fixtures/
│   ├── test-passport.jpg
│   └── test-id-card.jpg
└── utils/
    └── test-helpers.ts
```

## Debugging

### Browser Debugging

1. **Chrome DevTools** - Standard web debugging
2. **React DevTools** - For backoffice React components
3. **Svelte DevTools** - For web SDK Svelte components

### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backoffice",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/backoffice/node_modules/.bin/craco",
      "args": ["start"],
      "cwd": "${workspaceFolder}/apps/backoffice"
    }
  ]
}
```

### Network Debugging

```bash
# Enable debug logging
DEBUG=* pnpm dev

# Monitor API calls
DEBUG=api:* pnpm dev
```

## Common Development Tasks

### Adding a New Document Type

1. **Update types** in `sdks/web-sdk/src/lib/contexts/app-state/types.ts`
```typescript
export enum DocumentType {
  // ... existing types
  NEW_DOCUMENT = 'new_document',
}
```

2. **Add validation** in `sdks/web-sdk/src/lib/utils/validators/`
3. **Update UI** in `sdks/web-sdk/src/lib/components/DocumentOptions/`
4. **Add tests** for new functionality
5. **Update documentation**

### Adding a New Flow Step

1. **Create component** in `sdks/web-sdk/src/lib/components/organisms/`
2. **Define step** in flow configuration
3. **Add validation rules**
4. **Update flow state management**
5. **Add E2E tests**

### Customizing UI Theme

1. **Update theme config** in SDK configuration
2. **Modify CSS variables** for colors and fonts
3. **Test across all components**
4. **Update Storybook stories**

## Performance Optimization

### Bundle Analysis

```bash
# Analyze web SDK bundle
cd sdks/web-sdk
pnpm build
npx vite-bundle-analyzer dist

# Analyze backoffice bundle
cd apps/backoffice
pnpm build
npx webpack-bundle-analyzer build/static/js/*.js
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9

   # Kill process on port 3001
   lsof -ti:3001 | xargs kill -9
   ```

2. **Node modules issues**
   ```bash
   # Clear all node_modules
   rm -rf node_modules
   rm -rf apps/*/node_modules
   rm -rf sdks/*/node_modules

   # Reinstall dependencies
   pnpm install
   ```

3. **Git submodule issues**
   ```bash
   # Update submodules
   git submodule update --remote

   # Reset submodules
   git submodule foreach --recursive git clean -xfd
   git submodule foreach --recursive git reset --hard
   ```

4. **Build failures**
   ```bash
   # Clear build cache
   rm -rf apps/backoffice/build
   rm -rf sdks/web-sdk/dist

   # Rebuild from scratch
   pnpm install && pnpm build
   ```

### Debug Commands

```bash
# Verbose logging
DEBUG=* pnpm dev

# Check dependency tree
pnpm list --depth=0

# Check for outdated packages
pnpm outdated

# Check for security vulnerabilities
pnpm audit
```

## Contributing Guidelines

### Code Style

- Follow the [Style Guide](../STYLE_GUIDE.md)
- Use TypeScript for all new code
- Write tests for new functionality
- Update documentation for API changes

### Review Process

1. **Self-review** your changes
2. **Run all tests** locally
3. **Check CI status** after pushing
4. **Address review feedback** promptly
5. **Squash commits** before merging

### Documentation

- Update README files for significant changes
- Add JSDoc comments for public APIs
- Update Storybook stories for UI components
- Include examples for new features

## Resources

- **Main Documentation:** [README.md](../README.md)
- **Style Guide:** [STYLE_GUIDE.md](../STYLE_GUIDE.md)
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Quick Start:** [QUICK_START.md](../QUICK_START.md)
- **Setup Guide:** [BOTSWANA_SETUP_GUIDE.md](../BOTSWANA_SETUP_GUIDE.md)
- **GitHub Issues:** https://github.com/ballerine-io/ballerine/issues
