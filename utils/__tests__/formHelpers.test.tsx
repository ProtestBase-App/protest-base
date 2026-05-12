/* eslint-disable import/first */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { SectionHeader, HelperText } from '../formHelpers';
import { getThemeColors } from '../themeColors';

const lightColors = getThemeColors('light');
const darkColors = getThemeColors('dark');

/**
 * Helper to extract the final resolved color from a RN style prop.
 * Handles nested arrays and objects — the last color value wins (RN semantics).
 */
function extractColor(styleProp: any): string | undefined {
  if (!styleProp) return undefined;
  const flat = Array.isArray(styleProp) ? styleProp.flat(Infinity) : [styleProp];
  let color: string | undefined;
  for (const s of flat) {
    if (s && typeof s === 'object' && 'color' in s) {
      color = s.color;
    }
  }
  return color;
}

describe('formHelpers', () => {
  describe('SectionHeader', () => {
    it('should render title text', () => {
      const { getByText } = render(<SectionHeader title="Event Details" isDark={false} />);
      expect(getByText('Event Details')).toBeTruthy();
    });

    it('should apply tint color to title in light mode', () => {
      const { UNSAFE_getAllByType } = render(<SectionHeader title="Light Theme" isDark={false} />);
      const textElements = UNSAFE_getAllByType(Text);
      const titleText = textElements.find(
        (el: any) =>
          el.props.children === 'Light Theme' ||
          (Array.isArray(el.props.children) && el.props.children.includes('Light Theme'))
      );
      expect(titleText).toBeTruthy();
      const color = extractColor(titleText!.props.style);
      expect(color).toBe(lightColors.tint);
    });

    it('should apply tint color to title in dark mode', () => {
      const { UNSAFE_getAllByType } = render(<SectionHeader title="Dark Theme" isDark={true} />);
      const textElements = UNSAFE_getAllByType(Text);
      const titleText = textElements.find(
        (el: any) =>
          el.props.children === 'Dark Theme' ||
          (Array.isArray(el.props.children) && el.props.children.includes('Dark Theme'))
      );
      expect(titleText).toBeTruthy();
      const color = extractColor(titleText!.props.style);
      expect(color).toBe(darkColors.tint);
    });

    it('should update when title changes on rerender', () => {
      const { getByText, rerender, queryByText } = render(
        <SectionHeader title="Original Title" isDark={false} />
      );
      expect(getByText('Original Title')).toBeTruthy();

      rerender(<SectionHeader title="New Title" isDark={false} />);
      expect(queryByText('Original Title')).toBeNull();
      expect(getByText('New Title')).toBeTruthy();
    });
  });

  describe('HelperText', () => {
    it('should render text content', () => {
      const { getByText } = render(<HelperText text="This field is required" isDark={false} />);
      expect(getByText('This field is required')).toBeTruthy();
    });

    it('should apply light subtleText color in light mode', () => {
      const { UNSAFE_getAllByType } = render(<HelperText text="Light helper" isDark={false} />);
      const textElements = UNSAFE_getAllByType(Text);
      const helperText = textElements.find(
        (el: any) =>
          el.props.children === 'Light helper' ||
          (Array.isArray(el.props.children) && el.props.children.includes('Light helper'))
      );
      expect(helperText).toBeTruthy();
      const color = extractColor(helperText!.props.style);
      expect(color).toBe(lightColors.subtleText);
    });

    it('should apply dark subtleText color in dark mode', () => {
      const { UNSAFE_getAllByType } = render(<HelperText text="Dark helper" isDark={true} />);
      const textElements = UNSAFE_getAllByType(Text);
      const helperText = textElements.find(
        (el: any) =>
          el.props.children === 'Dark helper' ||
          (Array.isArray(el.props.children) && el.props.children.includes('Dark helper'))
      );
      expect(helperText).toBeTruthy();
      const color = extractColor(helperText!.props.style);
      expect(color).toBe(darkColors.subtleText);
    });

    it('should have different colors between light and dark mode', () => {
      expect(lightColors.subtleText).not.toBe(darkColors.subtleText);
    });

    it('should update when text changes on rerender', () => {
      const { getByText, rerender, queryByText } = render(
        <HelperText text="Original helper text" isDark={false} />
      );
      expect(getByText('Original helper text')).toBeTruthy();

      rerender(<HelperText text="Updated helper text" isDark={false} />);
      expect(queryByText('Original helper text')).toBeNull();
      expect(getByText('Updated helper text')).toBeTruthy();
    });
  });

  describe('Combined Usage', () => {
    it('should render both SectionHeader and HelperText together', () => {
      const { getByText } = render(
        <>
          <SectionHeader title="Event Location" isDark={false} />
          <HelperText text="Enter the address where the event will take place" isDark={false} />
        </>
      );
      expect(getByText('Event Location')).toBeTruthy();
      expect(getByText('Enter the address where the event will take place')).toBeTruthy();
    });
  });
});
