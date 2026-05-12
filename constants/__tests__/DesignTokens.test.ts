/**
 * DesignTokens Tests
 *
 * Validates all design token constants are correctly defined with their
 * expected values, ensuring the design system contract is enforced.
 */

import { Typography, Spacing, BorderRadius, Shadows, IconSizes } from '@/constants/DesignTokens';

describe('DesignTokens', () => {
  afterEach(() => jest.clearAllMocks());

  describe('Typography.sizes', () => {
    it('should define xs as 12', () => {
      expect(Typography.sizes.xs).toBe(12);
    });

    it('should define sm as 14', () => {
      expect(Typography.sizes.sm).toBe(14);
    });

    it('should define base as 16', () => {
      expect(Typography.sizes.base).toBe(16);
    });

    it('should define lg as 18', () => {
      expect(Typography.sizes.lg).toBe(18);
    });

    it('should define xl as 20', () => {
      expect(Typography.sizes.xl).toBe(20);
    });

    it('should define 2xl as 24', () => {
      expect(Typography.sizes['2xl']).toBe(24);
    });

    it('should define 3xl as 32', () => {
      expect(Typography.sizes['3xl']).toBe(32);
    });

    it('should define xxs as 10', () => {
      expect(Typography.sizes.xxs).toBe(10);
    });

    it('should have all 8 size tokens', () => {
      const keys = Object.keys(Typography.sizes);
      expect(keys).toHaveLength(8);
    });

    it('should have sizes in ascending order', () => {
      const values = Object.values(Typography.sizes);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe('Typography.lineHeights', () => {
    it('should define tight as 16', () => {
      expect(Typography.lineHeights.tight).toBe(16);
    });

    it('should define normal as 20', () => {
      expect(Typography.lineHeights.normal).toBe(20);
    });

    it('should define relaxed as 24', () => {
      expect(Typography.lineHeights.relaxed).toBe(24);
    });

    it('should define loose as 32', () => {
      expect(Typography.lineHeights.loose).toBe(32);
    });

    it('should have all 4 line height tokens', () => {
      const keys = Object.keys(Typography.lineHeights);
      expect(keys).toHaveLength(4);
    });
  });

  describe('Typography.families', () => {
    it('should define regular as Poppins-Regular', () => {
      expect(Typography.families.regular).toBe('Poppins-Regular');
    });

    it('should define medium as Poppins-Medium', () => {
      expect(Typography.families.medium).toBe('Poppins-Medium');
    });

    it('should define semiBold as Poppins-SemiBold', () => {
      expect(Typography.families.semiBold).toBe('Poppins-SemiBold');
    });

    it('should define bold as Poppins-Bold', () => {
      expect(Typography.families.bold).toBe('Poppins-Bold');
    });

    it('should define extraBold as Poppins-ExtraBold', () => {
      expect(Typography.families.extraBold).toBe('Poppins-ExtraBold');
    });

    it('should define thin as Poppins-Thin', () => {
      expect(Typography.families.thin).toBe('Poppins-Thin');
    });

    it('should have all 7 family tokens', () => {
      const keys = Object.keys(Typography.families);
      expect(keys).toHaveLength(7);
    });

    it('should all start with Poppins-', () => {
      for (const family of Object.values(Typography.families)) {
        expect(family).toMatch(/^Poppins-/);
      }
    });
  });

  describe('Spacing', () => {
    it('should define xs as 4', () => {
      expect(Spacing.xs).toBe(4);
    });

    it('should define sm as 8', () => {
      expect(Spacing.sm).toBe(8);
    });

    it('should define md as 12', () => {
      expect(Spacing.md).toBe(12);
    });

    it('should define lg as 16', () => {
      expect(Spacing.lg).toBe(16);
    });

    it('should define xl as 24', () => {
      expect(Spacing.xl).toBe(24);
    });

    it('should define 2xl as 32', () => {
      expect(Spacing['2xl']).toBe(32);
    });

    it('should define 3xl as 48', () => {
      expect(Spacing['3xl']).toBe(48);
    });

    it('should define touchTargetPadding as 11', () => {
      expect(Spacing.touchTargetPadding).toBe(11);
    });

    it('should define bottomTabOffset as 50', () => {
      expect(Spacing.bottomTabOffset).toBe(50);
    });

    it('should have all 9 spacing tokens', () => {
      const keys = Object.keys(Spacing);
      expect(keys).toHaveLength(9);
    });

    it('should have scale tokens in ascending order', () => {
      const scaleValues = [
        Spacing.xs,
        Spacing.sm,
        Spacing.md,
        Spacing.lg,
        Spacing.xl,
        Spacing['2xl'],
        Spacing['3xl'],
      ];
      for (let i = 1; i < scaleValues.length; i++) {
        expect(scaleValues[i]).toBeGreaterThan(scaleValues[i - 1]);
      }
    });
  });

  describe('BorderRadius', () => {
    it('should define sm as 6', () => {
      expect(BorderRadius.sm).toBe(6);
    });

    it('should define md as 8', () => {
      expect(BorderRadius.md).toBe(8);
    });

    it('should define lg as 12', () => {
      expect(BorderRadius.lg).toBe(12);
    });

    it('should define xl as 16', () => {
      expect(BorderRadius.xl).toBe(16);
    });

    it('should define full as 9999', () => {
      expect(BorderRadius.full).toBe(9999);
    });

    it('should have all 5 border radius tokens', () => {
      const keys = Object.keys(BorderRadius);
      expect(keys).toHaveLength(5);
    });

    it('should have sm, md, lg, xl in ascending order', () => {
      expect(BorderRadius.md).toBeGreaterThan(BorderRadius.sm);
      expect(BorderRadius.lg).toBeGreaterThan(BorderRadius.md);
      expect(BorderRadius.xl).toBeGreaterThan(BorderRadius.lg);
      expect(BorderRadius.full).toBeGreaterThan(BorderRadius.xl);
    });
  });

  describe('Shadows', () => {
    describe('card shadow', () => {
      it('should define iOS shadowColor as #000', () => {
        expect(Shadows.card.ios.shadowColor).toBe('#000');
      });

      it('should define iOS shadowOffset with width 0 and height 2', () => {
        expect(Shadows.card.ios.shadowOffset).toEqual({ width: 0, height: 2 });
      });

      it('should define iOS shadowOpacity as 0.25', () => {
        expect(Shadows.card.ios.shadowOpacity).toBe(0.25);
      });

      it('should define iOS shadowRadius as 8', () => {
        expect(Shadows.card.ios.shadowRadius).toBe(8);
      });

      it('should define Android elevation as 4', () => {
        expect(Shadows.card.android.elevation).toBe(4);
      });
    });

    describe('modal shadow', () => {
      it('should define iOS shadowColor as #000', () => {
        expect(Shadows.modal.ios.shadowColor).toBe('#000');
      });

      it('should define iOS shadowOffset with width 0 and height 4', () => {
        expect(Shadows.modal.ios.shadowOffset).toEqual({ width: 0, height: 4 });
      });

      it('should define iOS shadowOpacity as 0.3', () => {
        expect(Shadows.modal.ios.shadowOpacity).toBe(0.3);
      });

      it('should define iOS shadowRadius as 10', () => {
        expect(Shadows.modal.ios.shadowRadius).toBe(10);
      });

      it('should define Android elevation as 5', () => {
        expect(Shadows.modal.android.elevation).toBe(5);
      });
    });

    it('should have modal shadow with higher elevation than card shadow', () => {
      expect(Shadows.modal.android.elevation).toBeGreaterThan(Shadows.card.android.elevation);
    });

    it('should have modal shadow with greater opacity than card shadow', () => {
      expect(Shadows.modal.ios.shadowOpacity).toBeGreaterThan(Shadows.card.ios.shadowOpacity);
    });
  });

  describe('IconSizes', () => {
    it('should define xs as 12', () => {
      expect(IconSizes.xs).toBe(12);
    });

    it('should define sm as 16', () => {
      expect(IconSizes.sm).toBe(16);
    });

    it('should define md as 20', () => {
      expect(IconSizes.md).toBe(20);
    });

    it('should define lg as 22', () => {
      expect(IconSizes.lg).toBe(22);
    });

    it('should define xl as 24', () => {
      expect(IconSizes.xl).toBe(24);
    });

    it('should define 2xl as 32', () => {
      expect(IconSizes['2xl']).toBe(32);
    });

    it('should define 3xl as 48', () => {
      expect(IconSizes['3xl']).toBe(48);
    });

    it('should have all 7 icon size tokens', () => {
      const keys = Object.keys(IconSizes);
      expect(keys).toHaveLength(7);
    });

    it('should have sizes in ascending order', () => {
      const values = Object.values(IconSizes);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });
});
