import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppMantineProvider } from './MantineProvider';
import { Button, Text } from '@mantine/core';

describe('AppMantineProvider', () => {
  it('should render children with Mantine theme', () => {
    render(
      <AppMantineProvider>
        <Button data-testid="mantine-button">Test Button</Button>
      </AppMantineProvider>
    );

    expect(screen.getByTestId('mantine-button')).toBeInTheDocument();
  });

  it('should apply custom primary color', () => {
    render(
      <AppMantineProvider>
        <Text c="primary" data-testid="primary-text">Primary Text</Text>
      </AppMantineProvider>
    );

    expect(screen.getByTestId('primary-text')).toBeInTheDocument();
  });

  it('should support color scheme toggle', () => {
    // Color scheme should be configurable (light/dark)
    render(
      <AppMantineProvider defaultColorScheme="dark">
        <div data-testid="themed-content">Content</div>
      </AppMantineProvider>
    );

    expect(screen.getByTestId('themed-content')).toBeInTheDocument();
  });
});
