import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  SheetSearchMultiSelect,
  SheetSearchMultiSelectOption,
} from '@/components/SheetSearchMultiSelect';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';
import { Typography } from '@/constants/DesignTokens';

interface OrganizationPickerProps {
  /** Currently selected organization ID */
  value?: string;
  /** Callback when selection changes */
  onValueChange: (organizationId: string) => void;
  /** Show error state for validation */
  error?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * OrganizationPicker Component
 *
 * Renders an organization picker for multi-org users using the filter-style
 * searchable field. For single-org users, renders nothing (auto-selected in context).
 *
 * Usage:
 * ```tsx
 * <OrganizationPicker
 *   value={form.organization_id}
 *   onValueChange={(id) => setForm({ ...form, organization_id: id })}
 *   error={!form.organization_id}
 *   errorMessage={t('createEvent.organizationRequired')}
 * />
 * ```
 */
export const OrganizationPicker: React.FC<OrganizationPickerProps> = ({
  value,
  onValueChange,
  error = false,
  errorMessage,
}) => {
  const { dropdownItems, hasSingleOrganization, hasMultipleOrganizations } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const options = useMemo<SheetSearchMultiSelectOption[]>(
    () => dropdownItems.map((item) => ({ value: item.value, label: item.label })),
    [dropdownItems]
  );

  const resolveLabel = useCallback(
    (id: string) => dropdownItems.find((item) => item.value === id)?.label ?? id,
    [dropdownItems]
  );

  // Single organization users: render nothing (auto-selected)
  if (hasSingleOrganization) {
    return null;
  }

  // No organizations or still loading: don't render the picker
  if (!hasMultipleOrganizations) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.label}>{t('createEvent.organization')} *</ThemedText>
      <SheetSearchMultiSelect
        testID="dropdown-organization"
        options={options}
        selected={value ? [value] : []}
        onChange={(next) => onValueChange(next[0] ?? '')}
        placeholder={t('createEvent.selectOrganization')}
        resolveSelectedLabel={resolveLabel}
        leadingIconName="person"
        minSearchLength={0}
        singleSelect
      />
      {error && errorMessage ? (
        <ThemedText style={[styles.errorText, { color: themeColors.error }]}>
          {errorMessage}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.medium,
    marginBottom: 8,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    marginTop: 6,
  },
});

export default OrganizationPicker;
