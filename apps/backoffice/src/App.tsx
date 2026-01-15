import { Refine } from '@refinedev/core';
import routerProvider, { DocumentTitleHandler, UnsavedChangesNotifier } from '@refinedev/react-router-v6';
import dataProvider from '@refinedev/simple-rest';
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconCheckbox, IconBuilding, IconReceipt2, IconUserCheck } from '@tabler/icons-react';
import { newEnforcer } from 'casbin';
import { notifications } from '@mantine/notifications';

import { QueryProvider, AppMantineProvider } from './providers';
import { adapter, model } from './access-control';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { UsersList, UsersCreate, UsersEdit } from './pages/users';
import { CommingSoon } from './pages/common';
import { CaseListPage } from './features/cases';
import { CaseDetailPage } from './features/cases/pages/CaseDetailPage';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Notification provider for Refine using Mantine notifications
const notificationProvider = {
  open: ({ message, description, type }: { message: string; description?: string; type: 'success' | 'error' | 'progress' }) => {
    notifications.show({
      title: message,
      message: description,
      color: type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue',
    });
  },
  close: (key: string) => {
    notifications.hide(key);
  },
};

function App() {
  const { t, i18n } = useTranslation();

  const i18nProvider = {
    translate: (key: string, params?: Record<string, string>) => t(key, params),
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  };

  return (
    <BrowserRouter>
      <QueryProvider>
        <AppMantineProvider>
          <RefineKbarProvider>
            <Refine
              accessControlProvider={{
                can: async ({ resource, params, action }) => {
                  const enforcer = await newEnforcer(model, adapter);

                  if (action === 'field') {
                    const field = typeof params?.field === 'string' ? `/${params?.field}` : '';
                    const can = await enforcer.enforce('admin', `${resource}${field}`, action);
                    return { can };
                  }

                  const can = await enforcer.enforce('admin', resource, action);
                  return { can };
                },
              }}
              notificationProvider={notificationProvider}
              routerProvider={routerProvider}
              dataProvider={dataProvider(API_URL)}
              i18nProvider={i18nProvider}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                disableTelemetry: true,
              }}
              resources={[
                {
                  name: 'case-management',
                  meta: { label: 'Case Management', icon: <IconCheckbox size={20} strokeWidth={1.5} /> },
                },
                {
                  name: 'cases',
                  list: '/cases',
                  show: '/cases/:id',
                  meta: {
                    label: 'Cases',
                    parent: 'case-management',
                    icon: <IconUserCheck size={18} />,
                  },
                },
                {
                  name: 'users',
                  list: '/users',
                  create: '/users/create',
                  edit: '/users/:id/edit',
                  show: '/users/:id',
                  meta: {
                    label: 'Users',
                    parent: 'case-management',
                    icon: <IconUserCheck size={18} />,
                  },
                },
                {
                  name: 'companies',
                  list: '/companies',
                  meta: {
                    label: 'Companies - Soon',
                    parent: 'case-management',
                    icon: <IconBuilding size={18} />,
                  },
                },
                {
                  name: 'transactions',
                  list: '/transactions',
                  meta: {
                    label: 'Transactions - Soon',
                    parent: 'case-management',
                    icon: <IconReceipt2 size={18} />,
                  },
                },
              ]}
            >
              <Routes>
                <Route
                  element={
                    <AppLayout>
                      <Outlet />
                    </AppLayout>
                  }
                >
                  {/* Cases routes */}
                  <Route path="/cases" element={<CaseListPage />} />
                  <Route path="/cases/:id" element={<CaseDetailPage />} />

                  {/* Users routes */}
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/users/create" element={<UsersCreate />} />
                  <Route path="/users/:id/edit" element={<UsersEdit />} />

                  {/* Placeholder routes */}
                  <Route path="/companies" element={<CommingSoon />} />
                  <Route path="/transactions" element={<CommingSoon />} />

                  {/* Default redirect */}
                  <Route index element={<UsersList />} />
                </Route>
              </Routes>
              <RefineKbar />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
          </RefineKbarProvider>
        </AppMantineProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App;
