import { AppShell, Burger, Group, NavLink, Text, useMantineColorScheme, ActionIcon, Box, Image } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSun, IconMoon, IconCheckbox, IconUserCheck, IconBuilding, IconReceipt2 } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    label: 'Case Management',
    icon: IconCheckbox,
    children: [
      { label: 'Cases', href: '/cases', icon: IconUserCheck },
      { label: 'Users', href: '/users', icon: IconUserCheck },
      { label: 'Companies', href: '/companies', icon: IconBuilding, disabled: true },
      { label: 'Transactions', href: '/transactions', icon: IconReceipt2, disabled: true },
    ],
  },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Image src="/ballerine.svg" alt="AuthBridge" h={30} w="auto" fallbackSrc="https://placehold.co/120x30?text=AuthBridge" />
          </Group>
          <Group>
            <ActionIcon
              variant="default"
              onClick={() => toggleColorScheme()}
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((section) => (
          <NavLink
            key={section.label}
            label={section.label}
            leftSection={<section.icon size={18} />}
            defaultOpened
          >
            {section.children.map((item) => (
              <NavLink
                key={item.href}
                label={item.label}
                leftSection={<item.icon size={16} />}
                active={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
                onClick={() => !item.disabled && navigate(item.href)}
                disabled={item.disabled}
                style={{ cursor: item.disabled ? 'not-allowed' : 'pointer' }}
              />
            ))}
          </NavLink>
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Box mih="calc(100vh - 60px - 2rem)">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
