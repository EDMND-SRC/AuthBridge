# Backoffice Architecture

**Part:** `apps/backoffice/` | **Type:** Web App | **Framework:** React 18

---

## Overview

The Backoffice is a case management dashboard for compliance officers to review, approve, or reject identity verification cases. Built with React and the Refine admin framework.

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | React | 18.2.0 | UI framework |
| **Admin Framework** | Refine | 3.18.0 | CRUD operations, data providers |
| **UI Library** | Mantine | 5.7.2 | Component library |
| **Build Tool** | CRACO | 7.0.0 | CRA customization |
| **Routing** | React Router | 6.4.3 | Navigation |
| **i18n** | i18next | 20.1.0 | Internationalization |
| **Access Control** | Casbin | 5.19.2 | RBAC authorization |
| **OCR** | Tesseract.js | 3.0.3 | Document OCR |
| **Face Detection** | face-api.js | 0.22.2 | Biometric matching |
| **Mocking** | MSW | 0.48.3 | API mocking for development |

## Architecture Pattern

**Feature-based** with Atomic Design components:

```
src/
├── atoms/               # Basic SVG icons
├── molecules/           # Composite components (DetailsGrid)
├── components/
│   ├── atoms/           # UI atoms (BallerineImage, StateStatusIcons)
│   ├── molecules/       # UI molecules (DataField)
│   ├── organisms/       # Complex components (ImageViewer)
│   ├── layout/          # Layout components (Header, Sider, Title)
│   ├── table/           # Table utilities (columnFilter, columnSorter)
│   └── subjects/        # Subject-related components
├── pages/
│   ├── users/           # User management (list, show, create, edit)
│   └── companies/       # Company management (scaffold)
├── hooks/               # Custom hooks (useFilter, usePagination, useSearch, useSort)
├── utils/               # Utility functions
├── interfaces/          # TypeScript interfaces
├── mock-service-worker/ # MSW handlers for development
├── App.tsx              # Main application component
├── index.tsx            # Entry point
├── authProvider.ts      # Authentication provider
├── access-control.ts    # Casbin RBAC configuration
└── i18n.ts              # i18next configuration
```

## Entry Point

**`src/index.tsx`** initializes MSW and renders the React app:

```typescript
import { worker } from './mock-service-worker/browser';

void (async () => {
  await worker.start();
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
```

## Key Components

### Refine Configuration

The app uses Refine for admin functionality:

```typescript
<Refine
  accessControlProvider={casbinProvider}
  notificationProvider={notificationProvider}
  routerProvider={routerProvider}
  dataProvider={dataProvider(window.location.origin)}
  resources={[
    { name: 'case-management', ... },
    { name: 'users', parentName: 'case-management', ... },
    { name: 'companies', parentName: 'case-management', ... },
    { name: 'transactions', parentName: 'case-management', ... },
  ]}
/>
```

### Resources

| Resource | Status | Features |
|----------|--------|----------|
| **Users** | Active | List, Create, Edit, Show |
| **Companies** | Scaffold | Coming Soon |
| **Transactions** | Scaffold | Coming Soon |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useFilter` | Filter data by criteria |
| `usePagination` | Paginate data sets |
| `useSearch` | Search across fields |
| `useSort` | Sort by columns |

### User Management Flow

```
UsersList
├── SubjectList (left panel)
│   ├── Search input
│   ├── Filter controls
│   ├── Sort controls
│   └── Paginated user list
└── SubjectContent (right panel)
    ├── User details
    ├── Document images
    ├── OCR results
    └── Approve/Reject actions
```

## Access Control (Casbin)

RBAC configuration using Casbin:

```typescript
accessControlProvider={{
  async can({ resource, params, action }) {
    const enforcer = await newEnforcer(model, adapter);
    const can = await enforcer.enforce('admin', resource, action);
    return Promise.resolve({ can });
  },
}}
```

## Mock Service Worker

Development API mocking:

```typescript
// users.handler.ts
const getUsers = rest.get('/users', async (req, res, ctx) => {
  return res(ctx.json(data.users));
});

const updateUserState = rest.patch('/users/:id', async (req, res, ctx) => {
  const { state } = await req.json();
  // Update user state (approve/reject)
  return res(ctx.json(data.users));
});
```

## Theming

Custom Mantine theme with AuthBridge brand colors:

```typescript
LightTheme.colors!.primary = [
  '#e9f5f9', '#d3eaf2', '#bee0ec', '#a8d5e5', '#92cbdf',
  '#7cc0d8', '#66b6d2', '#51abcb', '#3ba1c5', '#2596be',
];
```

## Build Configuration

CRACO config for webpack customization:

```javascript
module.exports = {
  webpack: {
    configure: config => {
      config.resolve.fallback = {
        fs: false,
        path: require.resolve('path-browserify'),
        crypto: require.resolve('crypto-browserify'),
        // ... other polyfills
      };
      return config;
    },
  },
};
```

## Development

```bash
# Start development server
pnpm backoffice:dev

# Build for production
pnpm --filter @ballerine/backoffice build

# Run tests
pnpm --filter @ballerine/backoffice test
```

## API Endpoints (MSW)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/users` | List all users |
| GET | `/users/:id` | Get single user |
| PATCH | `/users/:id` | Update user state (approve/reject) |
| GET | `/users/media` | Get user media |
| GET | `/users/media/:id` | Get specific media item |
