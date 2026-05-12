// Mock dependencies BEFORE imports
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key) => key),
}));

import React from 'react';
import { renderWithProviders } from '@/test-utils/render';
import ReportEventScreen from '../report-event';

describe('ReportEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Static Content', () => {
    it('should render report title', () => {
      const { getByText } = renderWithProviders(<ReportEventScreen />);

      expect(getByText('report.title')).toBeTruthy();
    });

    it('should render under construction message', () => {
      const { getByText } = renderWithProviders(<ReportEventScreen />);

      expect(getByText('report.underConstruction')).toBeTruthy();
    });

    it('should render centered layout', () => {
      const { getByText } = renderWithProviders(<ReportEventScreen />);

      const title = getByText('report.title');
      expect(title).toBeTruthy();

      const subtitle = getByText('report.underConstruction');
      expect(subtitle).toBeTruthy();
    });
  });
});
