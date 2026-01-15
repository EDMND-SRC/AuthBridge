# Frontend Architecture - AuthBridge Backoffice

**Owner:** Winston (Architect)
**Last Updated:** 2026-01-15
**Stack:** React 19.2 + Mantine 8.3 + Vite 7.2

---

## Overview

The AuthBridge Backoffice is a case management dashboard for compliance officers to review, approve, and reject verification cases. Built with React 19.2 and Mantine 8.3 for a modern, accessible UI.

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | React | 19.2 | UI framework |
| **UI Library** | Mantine | 8.3 | Component library |
| **Build Tool** | Vite | 7.2 | Fast bundling with Rolldown |
| **State** | TanStack Query | 5.x | Server state management |
| **Routing** | React Router | 7.x | Client-side routing |
| **Forms** | React Hook Form | 7.x | Form handling |
| **Validation** | Zod | 3.x | Schema validation |
| **Testing** | Vitest + Playwright | Latest | Unit + E2E testing |
| **Styling** | Mantine + CSS Modules | - | Scoped styles |

---

## Project Structure

```
apps/backoffice/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/           # Generic components (Button, Input, etc.)
│   │   ├── layout/           # Layout components (Header, Sidebar, etc.)
│   │   └── features/         # Feature-specific components
│   │       ├── cases/        # Case management components
│   │       ├── documents/    # Document viewer components
│   │       └── auth/         # Authentication components
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts        # Authentication hook
│   │   ├── useCases.ts       # Case data hook
│   │   └── useDocuments.ts   # Document data hook
│   ├── pages/                # Page components (routes)
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CaseList.tsx
│   │   ├── CaseDetail.tsx
│   │   └── Settings.tsx
│   ├── services/             # API service layer
│   │   ├── api.ts            # Base API client
│   │   ├── auth.ts           # Auth API calls
│   │   ├── cases.ts          # Case API calls
│   │   └── documents.ts      # Document API calls
│   ├── stores/               # Global state (if needed)
│   │   └── auth.ts           # Auth state
│   ├── types/                # TypeScript types
│   │   ├── case.ts
│   │   ├── document.ts
│   │   └── user.ts
│   ├── utils/                # Utility functions
│   │   ├── format.ts         # Formatting helpers
│   │   └── validation.ts     # Validation helpers
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── theme.ts              # Mantine theme config
├── tests/
│   ├── unit/                 # Unit tests (Vitest)
│   └── e2e/                  # E2E tests (Playwright)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── playwright.config.ts
```

---

## Component Architecture

### Component Hierarchy

```
App
├── AuthProvider
│   └── QueryClientProvider
│       └── MantineProvider
│           └── Router
│               ├── PublicRoutes
│               │   └── Login
│               └── ProtectedRoutes
│                   ├── Layout
│                   │   ├── Header
│                   │   ├── Sidebar
│                   │   └── Main
│                   │       ├── Dashboard
│                   │       ├── CaseList
│                   │       ├── CaseDetail
│                   │       └── Settings
```

### Component Guidelines

1. **Functional Components**: Use function components with hooks
2. **TypeScript**: Strict typing for all props and state
3. **Composition**: Prefer composition over inheritance
4. **Single Responsibility**: Each component does one thing well
5. **Accessibility**: Follow WCAG 2.1 AA guidelines

---

## State Management

### Server State (TanStack Query)

```typescript
// hooks/useCases.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '../services/cases';

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => casesApi.list(filters),
    staleTime: 30_000, // 30 seconds
  });
}

export function useApproveCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: casesApi.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
```

### Client State (React Context)

```typescript
// stores/auth.ts
import { createContext, useContext, useState } from 'react';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // ... implementation

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

---

## Routing

### Route Structure

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<CaseList />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Protected Routes

```typescript
// components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
```

---

## Mantine Theme

### Theme Configuration

```typescript
// theme.ts
import { createTheme, MantineColorsTuple } from '@mantine/core';

// Botswana Blue - Primary brand color
const botswanaBlue: MantineColorsTuple = [
  '#e6f2fa',
  '#cce5f5',
  '#99cbeb',
  '#66b1e1',
  '#3397d7',
  '#0080cd',
  '#0066a4',
  '#004d7b',
  '#003352',
  '#001a29',
];

export const theme = createTheme({
  primaryColor: 'botswanaBlue',
  colors: {
    botswanaBlue,
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  defaultRadius: 'md',
  focusRing: 'always',
  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'md',
      },
    },
  },
});
```

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary Color | #75AADB (Botswana Blue) | Buttons, links, accents |
| Font Family | Inter | All text |
| Base Spacing | 4px | Spacing unit |
| Border Radius | 8px (md) | Default radius |
| Focus Ring | 2px solid primary | Focus indicator |

---

## API Integration

### API Client

```typescript
// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL;

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message, response.status);
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// tests/unit/CaseCard.test.tsx
import { render, screen } from '@testing-library/react';
import { CaseCard } from '../../src/components/features/cases/CaseCard';

describe('CaseCard', () => {
  it('renders case information', () => {
    const case_ = {
      id: 'case_123',
      customerName: 'John Doe',
      status: 'pending',
      createdAt: '2026-01-15T10:00:00Z',
    };

    render(<CaseCard case={case_} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/case-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Case Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    // Handle OTP...
  });

  test('can view case list', async ({ page }) => {
    await page.goto('/cases');
    await expect(page.getByRole('heading', { name: 'Cases' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('can approve a case', async ({ page }) => {
    await page.goto('/cases/case_123');
    await page.click('button:has-text("Approve")');
    await expect(page.getByText('Case approved')).toBeVisible();
  });
});
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CaseList = lazy(() => import('./pages/CaseList'));
const CaseDetail = lazy(() => import('./pages/CaseDetail'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    {/* ... */}
  </Routes>
</Suspense>
```

### Image Optimization

- Use WebP format for images
- Lazy load images below the fold
- Use responsive images with srcset

### Bundle Size

- Tree-shake unused Mantine components
- Use dynamic imports for heavy libraries
- Monitor bundle size with `vite-bundle-visualizer`

---

## Security

### Authentication

- JWT tokens stored in httpOnly cookies (not localStorage)
- Token refresh handled automatically
- CSRF protection via SameSite cookies

### XSS Prevention

- React's built-in escaping
- Content Security Policy headers
- Sanitize user-generated content

### API Security

- All API calls over HTTPS
- Rate limiting on API endpoints
- Input validation with Zod

---

## Deployment

### Build

```bash
# Production build
pnpm build

# Preview production build
pnpm preview
```

### Environment Variables

```bash
# .env.production
VITE_API_URL=https://api.authbridge.io
VITE_COGNITO_USER_POOL_ID=af-south-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
```

### Hosting

- **Platform:** Netlify
- **CDN:** CloudFront
- **Domain:** backoffice.authbridge.io

---

## References

- [React 19 Documentation](https://react.dev/)
- [Mantine 8 Documentation](https://mantine.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Playwright Documentation](https://playwright.dev/)

