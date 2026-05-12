import React from 'react';
import { StyleSheet } from 'react-native';
import { DropdownCustom } from '@/components/DropdownCustom';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
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
 * Renders an organization dropdown for multi-org users.
 * For single-org users, renders nothing (auto-selected in context).
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
  const { dropdownItems, hasSingleOrganization, hasMultipleOrganizations, loading } =
    useUserOrganizations();

  // Single organization users: render nothing (auto-selected)
  if (hasSingleOrganization) {
    return null;
  }

  // No organizations or still loading: don't render dropdown
  if (!hasMultipleOrganizations) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.label}>{t('createEvent.organization')} *</ThemedText>
      <DropdownCustom
        testID="dropdown-organization"
        items={dropdownItems}
        placeholder={t('createEvent.selectOrganization')}
        value={value}
        onValueChange={onValueChange}
        searchable={dropdownItems.length > 5}
        excludeSearchField={dropdownItems.length <= 5}
        disabled={loading}
        error={error}
        errorMessage={errorMessage}
        containerStyle={styles.dropdown}
        maxHeight={250}
        mode="auto"
      />
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
    marginBottom: 4,
  },
  dropdown: {
    marginTop: 8,
  },
});

export default OrganizationPicker;
