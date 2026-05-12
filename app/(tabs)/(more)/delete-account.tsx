import React, { useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  Pressable,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useGlobalContext } from '@/context/GlobalProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { deleteAccount } from '@/services/auth.service';
import { Typography, Spacing } from '@/constants/DesignTokens';
import { Routes } from '@/constants/Routes';
import { t } from '@/utils/i18n';

export default function DeleteAccountScreen() {
  const { user, clearAuthState } = useGlobalContext();
  const colorScheme = useColorScheme();
  const [isSubmitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [emptyFields, setEmptyFields] = useState({
    email: false,
    password: false,
  });

  // Handle Delete Account
  const handleDeleteAccount = async () => {
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

      // Clear all auth state and user data (tokens, caches, drafts, saved events)
      await clearAuthState();

      // Show success message then navigate
      Alert.alert(t('common.success'), t('account.deleteSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => router.replace(Routes.ROOT),
        },
      ]);
    } catch (error) {
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Pressable onPress={Keyboard.dismiss}>
              <ThemedView
                style={[styles.container, { minHeight: Dimensions.get('window').height - 100 }]}
              >
                <ThemedView style={styles.titleContainer}>
                  <ThemedText style={styles.title}>{t('account.deleteTitle')}</ThemedText>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      router.back();
                    }}
                  >
                    <IconSymbol
                      name="xmark"
                      size={22}
                      color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
                    />
                  </TouchableOpacity>
                </ThemedView>

                <ThemedView
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
                >
                  <IconSymbol name="exclamationmark.triangle" size={36} color={'red'} />
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
                  <ThemedText style={styles.bullets}>
                    {' '}
                    • {t('account.deleteWarningItems.loginInfo')}
                  </ThemedText>
                  <ThemedText style={styles.bullets}>
                    {' '}
                    • {t('account.deleteWarningItems.accountInfo')}
                  </ThemedText>
                  <ThemedText style={styles.bullets}>
                    {' '}
                    • {t('account.deleteWarningItems.eventsData')}
                  </ThemedText>
                  <ThemedText style={styles.bullets}>
                    {' '}
                    • {t('account.deleteWarningItems.images')}
                  </ThemedText>
                </ThemedView>

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
                />

                <CustomButton
                  title={t('account.confirmButton')}
                  handlePress={handleDeleteAccount}
                  isLoading={isSubmitting}
                />
              </ThemedView>
            </Pressable>
          </ScrollView>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </KeyboardAvoidingView>
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
