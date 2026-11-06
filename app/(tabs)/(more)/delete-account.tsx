import React, { useState } from 'react';
import {
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Pressable,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useConnectivity } from '@/context/ConnectivityProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  useAccountDeletionImpact,
  type AccountDeletionImpact,
} from '@/hooks/useAccountDeletionImpact';
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import MfaReauthStep from '@/components/auth/MfaReauthStep';
import { deleteAccount } from '@/services/auth.service';
import { reauthenticate } from '@/services/mfa.service';
import { Typography, Spacing } from '@/constants/DesignTokens';
import { Routes } from '@/constants/Routes';
import type { MfaCodeMethod } from '@/types/mfa.types';
import { t } from '@/utils/i18n';
import { describeMfaFailure, type MfaFailure } from '@/utils/mfa';
import { assertOnlineOrAlert } from '@/utils/offlineGuard';
import { getThemeColors } from '@/utils/themeColors';

// Room kept between a focused field and the keyboard, so the confirm button
// under the password field stays reachable while typing.
const KEYBOARD_BOTTOM_OFFSET = 112;

export default function DeleteAccountScreen() {
  const { user, clearAuthState } = useGlobalContext();
  const { isOffline } = useConnectivity();
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [emptyFields, setEmptyFields] = useState({
    email: false,
    password: false,
  });

  // An account with a second factor confirms with a code after the password (REAUTH_REQUIRED).
  const [needsCode, setNeedsCode] = useState(false);
  const [isVerifyingCode, setVerifyingCode] = useState(false);
  const [codeFailure, setCodeFailure] = useState<MfaFailure | null>(null);
  const impact = useAccountDeletionImpact();
  const sharedOrganizations =
    impact.status === 'ready' ? impact.organizations.filter((org) => org.shared) : [];

  const finishDeletion = async () => {
    // Clear all auth state and user data (tokens, caches, drafts, saved events)
    await clearAuthState();

    // Show success message then navigate
    Alert.alert(t('common.success'), t('account.deleteSuccess'), [
      {
        text: t('common.ok'),
        onPress: () => router.replace(Routes.ROOT),
      },
    ]);
  };

  const handleCode = async (method: MfaCodeMethod, code: string) => {
    if (!assertOnlineOrAlert(isOffline)) return;
    setVerifyingCode(true);
    setCodeFailure(null);
    try {
      const reauthToken = await reauthenticate(form.password, method, code);
      await deleteAccount(form.password, reauthToken);
      await finishDeletion();
    } catch (error) {
      const errorCode = (error as { code?: string })?.code;
      if (
        errorCode === 'INVALID_CREDENTIALS' ||
        (error as Error)?.message === 'INVALID_CREDENTIALS'
      ) {
        // The password stopped working since it was checked: start again from it.
        setNeedsCode(false);
        Alert.alert(t('common.error'), t('account.incorrectPassword'));
      } else if (errorCode === 'REAUTH_REQUIRED') {
        // The proof expired between the two calls.
        setCodeFailure({ kind: 'other', message: t('mfa.reauthExpired') });
      } else {
        setCodeFailure(describeMfaFailure(error));
      }
    } finally {
      setVerifyingCode(false);
    }
  };

  const cancelCode = () => {
    setNeedsCode(false);
    setCodeFailure(null);
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    if (!assertOnlineOrAlert(isOffline)) return;
    const newEmptyFields = {
      email: form.email === '',
      password: form.password === '',
    };

    setEmptyFields(newEmptyFields);

    if (newEmptyFields.email) {
      Alert.alert(t('common.error'), t('account.enterEmailConfirm'));
      return;
    }

    if (newEmptyFields.password) {
      Alert.alert(t('common.error'), t('account.passwordRequired'));
      return;
    }

    if (form.email !== user?.email) {
      Alert.alert(t('common.error'), t('account.incorrectEmail'));
      return;
    }

    setSubmitting(true);

    try {
      await deleteAccount(form.password);
      await finishDeletion();
    } catch (error) {
      if ((error as { code?: string })?.code === 'REAUTH_REQUIRED') {
        setCodeFailure(null);
        setNeedsCode(true);
        return;
      }

      // Check for rate limit error and show specific message
      const isRateLimitError =
        (error as { code?: string })?.code === 'RATE_LIMIT_EXCEEDED' ||
        (error as { isRateLimited?: boolean })?.isRateLimited;

      if (isRateLimitError) {
        Alert.alert(t('errors.rateLimit.title'), t('errors.rateLimit.deleteAccountMessage'));
      } else if ((error as Error).message === 'INVALID_CREDENTIALS') {
        Alert.alert(t('common.error'), t('account.incorrectPassword'));
      } else {
        Alert.alert(t('common.error'), (error as Error).message || t('errors.unknownError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <ThemedView style={styles.splashContainer}>
        <BrandLoader />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAwareScrollView
          bottomOffset={KEYBOARD_BOTTOM_OFFSET}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable accessible={false} accessibilityRole="none" onPress={Keyboard.dismiss}>
            <ThemedView
              style={[styles.container, { minHeight: Dimensions.get('window').height - 100 }]}
            >
              <ThemedView style={styles.titleContainer}>
                <ThemedText style={styles.title}>{t('account.deleteTitle')}</ThemedText>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.closeButton}
                  onPress={() => {
                    router.back();
                  }}
                >
                  <IconSymbol name="xmark" size={22} color={themeColors.text} />
                </TouchableOpacity>
              </ThemedView>

              <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <IconSymbol
                  name="exclamationmark.triangle"
                  size={36}
                  color={themeColors.destructive}
                />
                <ThemedText
                  style={{
                    marginLeft: 14,
                    fontFamily: Typography.families.semiBold,
                    fontSize: Typography.sizes.base,
                  }}
                >
                  {t('account.deleteWarning')}
                </ThemedText>
              </ThemedView>

              <ThemedView style={{ alignItems: 'flex-start', marginLeft: 40, marginRight: 10 }}>
                <Bullet text={t('account.deleteWarningItems.loginInfo')} />
                <Bullet text={t('account.deleteWarningItems.accountInfo')} />
                <DeletionImpactItems impact={impact} loaderColor={themeColors.tint} />
                {sharedOrganizations.map((org) => (
                  <ThemedText
                    key={org.id}
                    style={[styles.hint, { color: themeColors.secondaryText }]}
                  >
                    {t('account.deleteImpact.sharedHint', { name: org.name })}
                  </ThemedText>
                ))}
              </ThemedView>

              {needsCode ? (
                <MfaReauthStep
                  submitting={isVerifyingCode}
                  failure={codeFailure}
                  onSubmit={handleCode}
                  onEdit={() => setCodeFailure(null)}
                  onCancel={cancelCode}
                />
              ) : (
                <>
                  <FormField
                    title={t('account.deleteConfirmation')}
                    value={form.email}
                    placeholder={t('account.email')}
                    handleChangeText={(value) => setForm({ ...form, email: value })}
                    otherStyles={styles.formField}
                    maxLength={75}
                    hasError={emptyFields.email}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect={false}
                    disableKeyboardShortcuts={true}
                    inputMode="email"
                    keyboardType="email-address"
                    contextMenuHidden={true}
                    selectTextOnFocus={false}
                    testID="input-delete-account-email"
                  />

                  <FormField
                    title={t('account.deletePasswordConfirmation')}
                    value={form.password}
                    placeholder={t('auth.password')}
                    handleChangeText={(value) => setForm({ ...form, password: value })}
                    otherStyles={styles.formField}
                    maxLength={128}
                    hasError={emptyFields.password}
                    isPassword={true}
                    testID="input-delete-account-password"
                  />

                  <CustomButton
                    testID="btn-delete-account-confirm"
                    title={t('account.confirmButton')}
                    handlePress={handleDeleteAccount}
                    isLoading={isSubmitting}
                  />
                </>
              )}
            </ThemedView>
          </Pressable>
        </KeyboardAwareScrollView>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    </ThemedView>
  );
}

function Bullet({ text }: { text: string }) {
  return <ThemedText style={styles.bullets}> • {text}</ThemedText>;
}

// What happens to the user's organizations. It must never promise more than the backend
// deletes: an organization with other members keeps all its content.
function DeletionImpactItems({
  impact,
  loaderColor,
}: {
  impact: AccountDeletionImpact;
  loaderColor: string;
}) {
  if (impact.status === 'loading') {
    return (
      <ActivityIndicator
        style={styles.impactLoader}
        color={loaderColor}
        aria-label={t('account.deleteImpact.checking')}
        testID="delete-account-impact-loading"
      />
    );
  }
  if (impact.status === 'unknown') {
    return <Bullet text={t('account.deleteImpact.orgUnknown')} />;
  }
  if (impact.organizations.length === 0) {
    return <Bullet text={t('account.deleteImpact.ownContent')} />;
  }
  return (
    <>
      {impact.organizations.map((org) =>
        org.shared ? (
          <React.Fragment key={org.id}>
            <Bullet text={t('account.deleteImpact.orgKept', { name: org.name })} />
            <Bullet text={t('account.deleteImpact.nameReplaced', { name: org.name })} />
            {org.owner ? (
              <Bullet text={t('account.deleteImpact.ownerTransfer', { name: org.name })} />
            ) : null}
          </React.Fragment>
        ) : (
          <Bullet key={org.id} text={t('account.deleteImpact.orgDeleted', { name: org.name })} />
        )
      )}
    </>
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
    width: '100%',
    flex: 1,
    justifyContent: 'flex-start',
    height: '100%',
    paddingHorizontal: Spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
    position: 'relative',
  },
  title: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: 40,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    zIndex: 1,
    padding: Spacing.xs,
  },
  button: {
    marginTop: 20,
    marginBottom: 20,
  },
  bullets: {
    fontSize: Typography.sizes.sm,
  },
  impactLoader: {
    alignSelf: 'flex-start',
    marginVertical: Spacing.xs,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  formField: {
    marginTop: 20,
    marginBottom: 20,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
