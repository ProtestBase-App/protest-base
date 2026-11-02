import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { useFormFieldJump } from '@/components/FormScreenScaffold';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventFormValidation } from '@/hooks/useEventFormValidation';
import { issueSummaryTitle } from '@/utils/eventFormValidation';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';

export interface FormIssueSummaryProps {
  validation: EventFormValidation;
}

/**
 * Everything standing in the way of a refused submit, with a jump to each field.
 * Sits at the top of the form, inside the scaffold, and takes the form to the first
 * issue. It moves the form once per refused submit, never because an issue was fixed.
 */
export function FormIssueSummary({ validation: { issues, refused } }: FormIssueSummaryProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const { scrollToField } = useFormFieldJump();

  useEffect(() => {
    if (!refused) return;
    const [first] = refused.issues;
    scrollToField(first.field);
    AccessibilityInfo.announceForAccessibility(
      `${issueSummaryTitle(refused.intent, refused.issues.length)}. ${first.message}`
    );
  }, [refused, scrollToField]);

  if (!refused || issues.length === 0) return null;

  return (
    <View
      testID="form-issue-summary"
      accessibilityRole="alert"
      style={[styles.notice, { backgroundColor: themeColors.errorBg }]}
    >
      <IconSymbol
        name="exclamationmark.triangle"
        size={IconSizes.md}
        color={themeColors.errorText}
      />
      <View style={styles.body}>
        <ThemedText style={styles.title}>
          {issueSummaryTitle(refused.intent, issues.length)}
        </ThemedText>
        <View style={styles.links}>
          {issues.map((issue) => (
            <Pressable
              key={issue.field}
              testID={`form-issue-${issue.field}`}
              onPress={() => scrollToField(issue.field)}
              style={styles.link}
              accessibilityRole="button"
              accessibilityLabel={`${issue.label}: ${issue.message}`}
              accessibilityHint={t('a11y.hints.jumpToField')}
            >
              <ThemedText style={[styles.linkText, { color: themeColors.errorText }]}>
                {issue.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: Spacing.md,
    paddingHorizontal: 14,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
    lineHeight: 18,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.lg,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: 13,
    fontFamily: Typography.families.semiBold,
  },
});
