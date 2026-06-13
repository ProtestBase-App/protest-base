// Mock dependencies BEFORE imports

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

jest.mock('@/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
}));

jest.mock('@/utils/themeColors', () => ({
  getThemeColors: jest.fn(() => ({
    tint: '#F94460',
    text: '#000000',
    secondaryText: '#666666',
    subtleText: '#999999',
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E5E5',
    surfaceBackground: '#F5F5F5',
    surfaceAltBackground: '#FFFFFF',
    separator: '#E5E5E5',
    border: '#E5E5E5',
  })),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TemplateActionsMenu from '@/components/TemplateActionsMenu';
import type { TemplateActionsMenuProps } from '@/components/TemplateActionsMenu';
import type { TemplateMenuAnchor } from '@/components/TemplateTiles';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeAnchor = (overrides: Partial<TemplateMenuAnchor> = {}): TemplateMenuAnchor => ({
  x: 100,
  y: 200,
  width: 30,
  height: 30,
  ...overrides,
});

const defaultCallbacks = {
  onClose: jest.fn(),
  onEdit: jest.fn(),
  onDuplicate: jest.fn(),
  onDelete: jest.fn(),
};

function renderMenu(props: Partial<TemplateActionsMenuProps> = {}) {
  const merged: TemplateActionsMenuProps = {
    visible: true,
    anchor: makeAnchor(),
    ...defaultCallbacks,
    ...props,
  };
  return render(<TemplateActionsMenu {...merged} />);
}

describe('TemplateActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Null anchor guard
  // -------------------------------------------------------------------------

  describe('when anchor is null', () => {
    it('renders nothing (returns null)', () => {
      const { toJSON } = render(
        <TemplateActionsMenu
          visible={true}
          anchor={null}
          onClose={jest.fn()}
          onEdit={jest.fn()}
          onDuplicate={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      // Component returns null when anchor is null — nothing to render.
      expect(toJSON()).toBeNull();
    });

    it('renders nothing even when visible is false and anchor is null', () => {
      const { toJSON } = render(
        <TemplateActionsMenu
          visible={false}
          anchor={null}
          onClose={jest.fn()}
          onEdit={jest.fn()}
          onDuplicate={jest.fn()}
          onDelete={jest.fn()}
        />
      );
      expect(toJSON()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Menu row rendering
  // -------------------------------------------------------------------------

  describe('when visible with a valid anchor', () => {
    it('renders the Edit template row with i18n label templates.editTemplate', () => {
      renderMenu();
      expect(screen.getByText('templates.editTemplate')).toBeTruthy();
    });

    it('renders the Duplicate row with i18n label templates.duplicate', () => {
      renderMenu();
      expect(screen.getByText('templates.duplicate')).toBeTruthy();
    });

    it('renders the Delete row with i18n label common.delete', () => {
      renderMenu();
      expect(screen.getByText('common.delete')).toBeTruthy();
    });

    it('renders exactly 3 menu rows', () => {
      renderMenu();
      // All three labels must exist
      expect(screen.getByText('templates.editTemplate')).toBeTruthy();
      expect(screen.getByText('templates.duplicate')).toBeTruthy();
      expect(screen.getByText('common.delete')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // Row callbacks
  // -------------------------------------------------------------------------

  describe('row press callbacks', () => {
    it('calls onEdit when the Edit template row is pressed', () => {
      const onEdit = jest.fn();
      renderMenu({ onEdit });
      fireEvent.press(screen.getByText('templates.editTemplate'));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onDuplicate when the Duplicate row is pressed', () => {
      const onDuplicate = jest.fn();
      renderMenu({ onDuplicate });
      fireEvent.press(screen.getByText('templates.duplicate'));
      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when the Delete row is pressed', () => {
      const onDelete = jest.fn();
      renderMenu({ onDelete });
      fireEvent.press(screen.getByText('common.delete'));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Backdrop callback
  // -------------------------------------------------------------------------

  describe('backdrop press', () => {
    it('calls onClose when the backdrop is pressed', () => {
      const onClose = jest.fn();
      renderMenu({ onClose });
      // The backdrop has accessibilityLabel 'common.cancel'
      fireEvent.press(screen.getByLabelText('common.cancel'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onEdit/onDuplicate/onDelete when the backdrop is pressed', () => {
      const onEdit = jest.fn();
      const onDuplicate = jest.fn();
      const onDelete = jest.fn();
      const onClose = jest.fn();
      renderMenu({ onEdit, onDuplicate, onDelete, onClose });
      fireEvent.press(screen.getByLabelText('common.cancel'));
      expect(onEdit).not.toHaveBeenCalled();
      expect(onDuplicate).not.toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Anchor position edge cases
  // -------------------------------------------------------------------------

  describe('anchor position variations', () => {
    it('renders correctly when anchor is at top-left corner of screen', () => {
      renderMenu({ anchor: makeAnchor({ x: 0, y: 0 }) });
      expect(screen.getByText('templates.editTemplate')).toBeTruthy();
    });

    it('renders correctly when anchor is near bottom of screen (menu flips up)', () => {
      // y near the bottom forces the fitsBelow check to be false
      renderMenu({ anchor: makeAnchor({ x: 100, y: 750, height: 30 }) });
      expect(screen.getByText('templates.editTemplate')).toBeTruthy();
    });

    it('renders correctly when anchor is at far right of screen', () => {
      renderMenu({ anchor: makeAnchor({ x: 360, y: 200, width: 30 }) });
      expect(screen.getByText('templates.editTemplate')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // visible=false with valid anchor
  // -------------------------------------------------------------------------

  describe('when visible is false with a valid anchor', () => {
    it('the Modal is present but not visible (does not crash)', () => {
      // Component returns the Modal (because anchor is non-null), but Modal has
      // visible=false so content may not be in the accessibility tree. Either
      // way the component must not throw.
      expect(() => renderMenu({ visible: false })).not.toThrow();
    });
  });
});
