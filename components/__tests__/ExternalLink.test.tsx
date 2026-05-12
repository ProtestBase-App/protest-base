// Mock dependencies BEFORE imports
jest.mock('expo-router', () => ({
  Link: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    // Expose onPress so tests can invoke the handler directly
    return React.createElement('Link', { ...props, onPress, testID: 'external-link' }, children);
  },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ExternalLink } from '@/components/ExternalLink';
import { openBrowserAsync } from 'expo-web-browser';

const mockedOpenBrowserAsync = openBrowserAsync as jest.MockedFunction<typeof openBrowserAsync>;

describe('ExternalLink', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(<ExternalLink href="https://example.com">Click me</ExternalLink>);
    expect(toJSON()).toBeTruthy();
  });

  it('passes href to the underlying Link', () => {
    const { toJSON } = render(<ExternalLink href="https://example.com">Visit site</ExternalLink>);
    const tree = toJSON() as any;
    expect(tree.props.href).toBe('https://example.com');
  });

  it('sets target to _blank', () => {
    const { toJSON } = render(<ExternalLink href="https://example.com">Link</ExternalLink>);
    const tree = toJSON() as any;
    expect(tree.props.target).toBe('_blank');
  });

  it('renders children', () => {
    const { toJSON } = render(<ExternalLink href="https://example.com">Child text</ExternalLink>);
    const tree = toJSON() as any;
    expect(tree.children).toContain('Child text');
  });

  describe('onPress handler on native (non-web)', () => {
    it('prevents default and opens browser on native (iOS)', async () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const { getByTestId } = render(
        <ExternalLink href="https://protestbase.be">Press me</ExternalLink>
      );

      const preventDefaultMock = jest.fn();
      await fireEvent(getByTestId('external-link'), 'press', {
        preventDefault: preventDefaultMock,
      });

      expect(preventDefaultMock).toHaveBeenCalledTimes(1);
      expect(mockedOpenBrowserAsync).toHaveBeenCalledWith('https://protestbase.be');

      Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    });

    it('prevents default and opens browser on native (Android)', async () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

      const { getByTestId } = render(
        <ExternalLink href="https://example.org/page">Press me</ExternalLink>
      );

      const preventDefaultMock = jest.fn();
      await fireEvent(getByTestId('external-link'), 'press', {
        preventDefault: preventDefaultMock,
      });

      expect(preventDefaultMock).toHaveBeenCalledTimes(1);
      expect(mockedOpenBrowserAsync).toHaveBeenCalledWith('https://example.org/page');

      Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    });

    it('does NOT call openBrowserAsync on web platform', async () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const { getByTestId } = render(
        <ExternalLink href="https://example.com">Web link</ExternalLink>
      );

      const preventDefaultMock = jest.fn();
      await fireEvent(getByTestId('external-link'), 'press', {
        preventDefault: preventDefaultMock,
      });

      expect(preventDefaultMock).not.toHaveBeenCalled();
      expect(mockedOpenBrowserAsync).not.toHaveBeenCalled();

      Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    });
  });

  it('forwards additional props to the Link', () => {
    const { toJSON } = render(
      <ExternalLink href="https://example.com" accessibilityLabel="Visit site">
        Link text
      </ExternalLink>
    );
    const tree = toJSON() as any;
    expect(tree.props.accessibilityLabel).toBe('Visit site');
  });
});
