jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

// react-native-reanimated is mocked globally in jest.setup.js

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HelloWave } from '@/components/HelloWave';

describe('HelloWave', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the wave emoji', () => {
    render(<HelloWave />);
    expect(screen.getByText('\uD83D\uDC4B')).toBeTruthy();
  });
});
