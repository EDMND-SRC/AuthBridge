import { MantineProvider, createTheme, MantineColorsTuple } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ReactNode } from 'react';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

// AuthBridge primary color palette (teal/cyan)
const primaryColor: MantineColorsTuple = [
  '#e9f5f9',
  '#d3eaf2',
  '#bee0ec',
  '#a8d5e5',
  '#92cbdf',
  '#7cc0d8',
  '#66b6d2',
  '#51abcb',
  '#3ba1c5',
  '#2596be',
];

const theme = createTheme({
  primaryColor: 'primary',
  colors: {
    primary: primaryColor,
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
  },
});

interface AppMantineProviderProps {
  children: ReactNode;
  defaultColorScheme?: 'light' | 'dark' | 'auto';
}

export function AppMantineProvider({
  children,
  defaultColorScheme = 'light'
}: AppMantineProviderProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}>
      <Notifications position="top-center" />
      {children}
    </MantineProvider>
  );
}
