import { StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useUserOrganizations } from '@/context/UserOrganizationsProvider';
import { InfoRow } from '@/components/ui/InfoRow';
import { SectionContainer } from '@/components/ui/SectionContainer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spacing, Typography } from '@/constants/DesignTokens';
import { useColorScheme } from '@/hooks/useColorScheme';
import { t } from '@/utils/i18n';

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'owner':
      return t('account.roleOwner');
    case 'admin':
      return t('account.roleAdmin');
    case 'member':
      return t('account.roleMember');
    default:
      return role;
  }
};

export default function AccountInfoScreen() {
  const { user } = useGlobalContext();
  const { userOrganizations, loading: orgsLoading } = useUserOrganizations();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme-aware divider color matching section borders
  const dividerColor = isDark ? 'rgba(205, 205, 224, 0.2)' : 'rgba(104, 112, 118, 0.2)';

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ThemedView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Basic Information */}
            <SectionContainer title={t('account.title')}>
              <InfoRow label={t('account.fullName')} value={user?.name} numberOfLines={2} />
              <View style={[styles.divider, { backgroundColor: dividerColor }]} />
              <InfoRow
                label={t('account.email')}
                value={user?.email}
                selectable
                numberOfLines={1}
              />
            </SectionContainer>

            {/* Account Status */}
            <SectionContainer title={t('account.status')}>
              <ThemedView style={styles.statusRow}>
                <ThemedText style={styles.statusLabel}>{t('account.accountStatus')}</ThemedText>
                <StatusBadge active={user?.status ?? false} />
              </ThemedView>
            </SectionContainer>

            {/* Organization & Role */}
            {!orgsLoading && userOrganizations.length > 0 && (
              <SectionContainer title={t('account.organization')}>
                <InfoRow label={t('account.organization')} value={userOrganizations[0].Name} />
                <InfoRow
                  label={t('account.role')}
                  value={getRoleLabel(userOrganizations[0].role)}
                />
              </SectionContainer>
            )}
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    minHeight: 44,
  },
  statusLabel: {
    fontSize: Typography.sizes.sm,
    opacity: 0.7,
    flex: 1,
  },
});
