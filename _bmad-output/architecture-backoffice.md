# Backoffice Architecture

## Executive Summary

The AuthBridge Backoffice is a React-based case management dashboard that enables operators to review, approve, or reject KYC/KYB submissions. Built with modern React patterns and the Refine framework, it provides a comprehensive admin interface for identity verification workflows.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 18.2.0 | UI framework |
| **Language** | TypeScript | 4.7.4 | Type safety |
| **Admin Framework** | Refine | 3.18.0 | Admin dashboard framework |
| **UI Library** | Mantine | 5.7.2 | Component library |
| **Build Tool** | Craco | 7.0.0 | Webpack configuration |
| **State Management** | React Context | Built-in | Application state |
| **Routing** | React Router | 6.4.3 | Client-side routing |
| **Internationalization** | i18next | 20.1.0 | Multi-language support |
| **Testing** | React Testing Library | 11.2.6 | Component testing |

## Architecture Pattern

**Pattern:** Component-based architecture with Refine framework
- **Presentation Layer:** React components with Mantine UI
- **Business Logic:** Refine data providers and hooks
- **Data Layer:** REST API integration through Refine
- **State Management:** React Context with Refine state

## Project Structure

```
apps/backoffice/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Route-based page components
│   ├── providers/        # Data providers for Refine
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── i18n/             # Internationalization files
│   └── App.tsx           # Main application component
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── craco.config.cjs      # Webpack configuration overrides
└── .env                  # Environment variables
```

## Key Components

### 1. Data Management
- **Refine Core:** Provides CRUD operations and data fetching
- **Simple REST Provider:** Handles API communication
- **React Table Integration:** Advanced table functionality for case lists

### 2. UI Components
- **Mantine Components:** Pre-built UI elements (buttons, forms, tables)
- **Custom Components:** Business-specific components for KYC workflows
- **Rich Text Editor:** Mantine RTE for case notes and comments

### 3. Authentication & Authorization
- **Casbin Integration:** Role-based access control
- **Session Management:** User authentication state
- **Permission Guards:** Route and component-level permissions

### 4. Internationalization
- **i18next:** Multi-language support
- **Language Detection:** Browser language detection
- **Dynamic Loading:** Lazy-loaded translation files

## Data Flow

```
User Interaction → React Component → Refine Hook → Data Provider → REST API
                                                                      ↓
User Interface ← React State ← Refine State ← API Response ← Backend Service
```

## API Integration

### Endpoints
- **Cases:** CRUD operations for KYC/KYB cases
- **Users:** User management and profiles
- **Documents:** Document review and approval
- **Workflows:** Workflow configuration and status

### Data Providers
```typescript
// Refine data provider configuration
const dataProvider = simpleRestProvider(API_URL);

// Custom hooks for business logic
const { data: cases } = useList({
  resource: "cases",
  filters: [{ field: "status", operator: "eq", value: "pending" }]
});
```

## State Management

### Refine State
- **Resource State:** Automatic CRUD state management
- **Form State:** Form validation and submission
- **Table State:** Pagination, filtering, sorting

### Application State
- **User Context:** Current user and permissions
- **Theme Context:** UI theme and preferences
- **Notification Context:** Toast notifications and alerts

## Security Features

### Access Control
- **Role-based permissions** using Casbin
- **Route guards** for protected pages
- **Component-level** permission checks

### Data Security
- **Input validation** on all forms
- **XSS protection** through React's built-in escaping
- **CSRF protection** via API tokens

## Development Workflow

### Local Development
```bash
# Start development server
pnpm backoffice:dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Code Quality
- **ESLint:** Code linting with TypeScript rules
- **Prettier:** Code formatting
- **TypeScript:** Static type checking
- **Husky:** Pre-commit hooks

## Testing Strategy

### Unit Testing
- **React Testing Library:** Component testing
- **Jest:** Test runner and assertions
- **MSW:** API mocking for tests

### Integration Testing
- **User workflow testing** with React Testing Library
- **API integration testing** with mock service worker
- **Form validation testing**

## Deployment Architecture

### Build Process
1. **TypeScript compilation** with type checking
2. **Webpack bundling** via Craco configuration
3. **Asset optimization** and minification
4. **Source map generation** for debugging

### Environment Configuration
- **Development:** Local API endpoints, debug mode
- **Staging:** Staging API, error tracking
- **Production:** Production API, optimized builds

## Performance Considerations

### Optimization Strategies
- **Code splitting** with React.lazy()
- **Memoization** with React.memo and useMemo
- **Virtual scrolling** for large data tables
- **Image optimization** for document previews

### Bundle Analysis
- **Webpack Bundle Analyzer** for size optimization
- **Tree shaking** to eliminate unused code
- **Lazy loading** for non-critical components

## Customization Points

### Theming
- **Mantine theme** customization
- **CSS variables** for brand colors
- **Component styling** overrides

### Workflow Configuration
- **Custom fields** for different verification types
- **Configurable approval flows**
- **Custom validation rules**

## Integration with Other Components

### Web SDK Integration
- **Shared types** for case data structures
- **Common validation** rules
- **Consistent UI patterns**

### Backend Services
- **REST API** communication
- **WebSocket** connections for real-time updates (if implemented)
- **File upload** handling for documents

## Known Issues

### Webpack Configuration
- **Issue:** `Cannot resolve 'process/browser'`
- **Fix Applied:** Updated `craco.config.cjs` to add `.js` extension and set `fullySpecified: false`

## Troubleshooting

### Common Issues
1. **Build errors:** Check Craco configuration and dependencies
2. **API connection:** Verify environment variables and CORS settings
3. **Permission errors:** Check Casbin policies and user roles
4. **Performance:** Monitor bundle size and component re-renders

### Debug Tools
- **React Developer Tools** for component inspection
- **Network tab** for API request monitoring
- **Console logging** for debugging
