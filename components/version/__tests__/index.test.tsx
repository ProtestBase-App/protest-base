jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  return (props: any) => React.createElement('MaterialIcons', props);
});

import {
  MaintenanceScreen,
  UpdateRequiredScreen,
  UpdatePrompt,
  VersionGate,
} from '@/components/version';

describe('version/index barrel exports', () => {
  it('exports MaintenanceScreen', () => {
    expect(MaintenanceScreen).toBeDefined();
    expect(typeof MaintenanceScreen).toBe('function');
  });

  it('exports UpdateRequiredScreen', () => {
    expect(UpdateRequiredScreen).toBeDefined();
    expect(typeof UpdateRequiredScreen).toBe('function');
  });

  it('exports UpdatePrompt', () => {
    expect(UpdatePrompt).toBeDefined();
    expect(typeof UpdatePrompt).toBe('function');
  });

  it('exports VersionGate', () => {
    expect(VersionGate).toBeDefined();
    expect(typeof VersionGate).toBe('function');
  });
});
