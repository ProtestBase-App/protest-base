import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormField from '@/components/FormField';
import CustomButton from '@/components/CustomButton';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { useGlobalContext } from '@/context/GlobalProvider';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { forgotPassword, login } from '@/services/auth.service';
import { ExternalLink } from '@/components/ExternalLink';
import { Colors } from '@/constants/Colors';
import { Routes } from '@/constants/Routes';
import { ExternalLinks } from '@/constants/ExternalLinks';
import { isValidEmail, getEmailValidationError } from '@/utils/validation';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { Typography, Spacing, BorderRadius } from '@/constants/DesignTokens';

const MODAL_FADE_ANIMATION_DURATION = 300; // ms — must match the modal's fade animation
const INPUT_FOCUS_DELAY = 100; // ms

const COOLDOWN_PER_ATTEMPT_MS = 2_000;
const LOCKOUT_AFTER_FAILURES = 3;
const LOCKOUT_DURATION_MS = 30_000;
const COOLDOWN_TICK_INTERVAL_MS = 1_000;

export default function SignIn() {
  const { setUser, setIsLogged } = useGlobalContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'forgot' | 'firstTime'>('forgot');
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const logoSource =
    colorScheme === 'dark'
      ? require('@/assets/images/auth-icon-dark.png')
      : require('@/assets/images/auth-icon-light.png');
  const [isSubmitting, setSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [emptyFields, setEmptyFields] = useState({
    email: false,
    password: false,
  });
  const [emailResetPassword, setEmailResetPassword] = useState('');
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetEmailError, setResetEmailError] = useState('');
  const [resetPasswordStatus, setResetPasswordStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );
  const [resetPasswordMessage, setResetPasswordMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const emailInputRef = useRef<TextInput>(null);
  const onboardingFormUrl = ExternalLinks.ONBOARDING_FORM;

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [resetFailedAttempts, setResetFailedAttempts] = useState(0);
  const [resetCooldownEndTime, setResetCooldownEndTime] = useState<number | null>(null);
  const [resetCooldownRemaining, setResetCooldownRemaining] = useState(0);

  const handleBackPress = () => {
    router.back();
  };

  const handleLoginEmailChange = (text: string) => {
    setForm((prev) => ({ ...prev, email: text }));
    setCanSubmit(isValidEmail(text));
  };

  useEffect(() => {
    if (cooldownEndTime === null) {
      setCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((cooldownEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownRemaining(0);
        setCooldownEndTime(null);
      } else {
        setCooldownRemaining(remaining);
      }
    };
    tick();
    const intervalId = setInterval(tick, COOLDOWN_TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [cooldownEndTime]);

  useEffect(() => {
    if (resetCooldownEndTime === null) {
      setResetCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((resetCooldownEndTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setResetCooldownRemaining(0);
        setResetCooldownEndTime(null);
      } else {
        setResetCooldownRemaining(remaining);
      }
    };
    tick();
    const intervalId = setInterval(tick, COOLDOWN_TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [resetCooldownEndTime]);

  const applyCooldown = useCallback((attempts: number): number => {
    if (attempts >= LOCKOUT_AFTER_FAILURES) {
      return Date.now() + LOCKOUT_DURATION_MS;
    }
    return Date.now() + COOLDOWN_PER_ATTEMPT_MS;
  }, []);

  const submit = async () => {
    if (cooldownEndTime !== null && Date.now() < cooldownEndTime) return;

    const newEmptyFields = {
      email: form.email === '',
      password: form.password === '',
    };

    setEmptyFields(newEmptyFields);

    if (newEmptyFields.email || newEmptyFields.password) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    setSubmitting(true);

    try {
      const session = await login(form.email.trim(), form.password);

      if (session && session.$id) {
        setFailedAttempts(0);
        setUser(session);
        setIsLogged(true);

        // Event counts are refreshed by UserOrganizationsProvider once the
        // user's organizations finish loading.

        router.replace(Routes.EXPLORE);
      } else {
        return;
      }
    } catch (error) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setCooldownEndTime(applyCooldown(newAttempts));

      const isRateLimitError =
        (error as { code?: string })?.code === 'RATE_LIMIT_EXCEEDED' ||
        (error as { isRateLimited?: boolean })?.isRateLimited;

      if (isRateLimitError) {
        Alert.alert(t('errors.rateLimit.title'), t('errors.rateLimit.loginMessage'));
      } else {
        Alert.alert(t('common.error'), (error as Error).message || t('errors.unknownError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetEmailChange = (text: string) => {
    setEmailResetPassword(text);
    if (text.trim()) {
      setCanResetPassword(isValidEmail(text));
      const errorMessage = getEmailValidationError(text);
      setResetEmailError(errorMessage || '');
    } else {
      setCanResetPassword(false);
      setResetEmailError('');
    }
  };

  const handleResetPassword = async () => {
    if (resetCooldownEndTime !== null && Date.now() < resetCooldownEndTime) return;

    const email = emailResetPassword.trim();

    setIsSubmittingReset(true);
    setResetPasswordStatus('idle');

    try {
      // forgotPassword throws on error and returns { success, data, message? } on success.
      const response = await forgotPassword(email);

      const successMessage = response.message || t('auth.resetPasswordSuccess');

      setResetFailedAttempts(0);
      setResetPasswordStatus('success');
      setResetPasswordMessage(successMessage);
    } catch (error: any) {
      const newAttempts = resetFailedAttempts + 1;
      setResetFailedAttempts(newAttempts);
      setResetCooldownEndTime(applyCooldown(newAttempts));

      const errorMessage = error.message || t('auth.resetPasswordError');

      setResetPasswordStatus('error');

      // Don't reveal whether the email exists — this prevents account enumeration.
      if (error.code === 'RATE_LIMIT_EXCEEDED' || error.isRateLimited) {
        setResetPasswordMessage(t('errors.rateLimit.forgotPasswordMessage'));
      } else if (
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('timeout')
      ) {
        setResetPasswordMessage(t('errors.networkError'));
      } else {
        setResetPasswordMessage(errorMessage);
      }
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    // Wait for the fade animation before resetting state so the form doesn't
    // flash briefly while the modal is closing.
    setTimeout(() => {
      setEmailResetPassword('');
      setResetEmailError('');
      setResetPasswordStatus('idle');
      setResetPasswordMessage('');
      setIsFocused(false);
      setResetFailedAttempts(0);
      setResetCooldownEndTime(null);
    }, MODAL_FADE_ANIMATION_DURATION);
  };

  const handleOpenModal = (mode: 'forgot' | 'firstTime' = 'forgot') => {
    setModalMode(mode);
    setModalVisible(true);
    // Delay focus until the modal has rendered.
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, INPUT_FOCUS_DELAY);
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex1}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <ThemedView style={styles.container}>
              <ThemedView style={styles.logoContainer}>
                <TouchableOpacity
                  onPress={handleBackPress}
                  style={styles.iconContainer}
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                >
                  <IconSymbol name="arrow.backward" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <Image source={logoSource} style={styles.logo} />
              </ThemedView>
              <ThemedText type="title" style={styles.text1}>
                {t('auth.signIn')}
              </ThemedText>
              <FormField
                title={t('auth.email')}
                value={form.email}
                placeholder={t('auth.emailPlaceholder')}
                handleChangeText={handleLoginEmailChange}
                otherStyles={styles.margintop}
                keyboardType="email-address"
                textContentType="emailAddress"
                hasError={emptyFields.email}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                testID="input-sign-in-email"
              />
              <FormField
                title={t('auth.password')}
                value={form.password}
                placeholder={t('auth.passwordPlaceholder')}
                handleChangeText={(e) => setForm({ ...form, password: e })}
                otherStyles={styles.margintop}
                textContentType="password"
                hasError={emptyFields.password}
                isPassword={true}
                maxLength={128}
                testID="input-sign-in-password"
              />
              <CustomButton
                title={
                  cooldownRemaining > 0
                    ? t('auth.tryAgainIn', { seconds: cooldownRemaining })
                    : t('auth.signInButton')
                }
                handlePress={submit}
                containerStyles={
                  canSubmit && cooldownRemaining === 0
                    ? styles.margintop
                    : { backgroundColor: 'rgba(128, 128, 128, 0.4)', marginTop: 24 }
                }
                isLoading={!canSubmit || isSubmitting || cooldownRemaining > 0}
                testID="btn-sign-in-submit"
              />

              <TouchableOpacity
                style={styles.forgetPasswordButton}
                onPress={() => handleOpenModal('forgot')}
              >
                <ThemedText style={[styles.forgotPasswordText, { color: themeColors.tint }]}>
                  {t('auth.forgotPassword')}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.firstTimeButton}
                onPress={() => handleOpenModal('firstTime')}
              >
                <ThemedText style={[styles.firstTimeText, { color: themeColors.tint }]}>
                  {t('auth.firstTimeLogin')}
                </ThemedText>
              </TouchableOpacity>

              <ThemedView style={styles.container2}>
                <ThemedText style={styles.text2}>{t('auth.noAccount')}</ThemedText>
                <ExternalLink
                  href={onboardingFormUrl}
                  style={[styles.link, { color: themeColors.tint }]}
                >
                  {t('auth.requestAccess')}
                </ExternalLink>
              </ThemedView>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex1}
          >
            <TouchableOpacity
              style={styles.modalContainer}
              activeOpacity={1}
              onPress={handleCloseModal}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={styles.modalTouchableWrapper}
              >
                <ThemedView style={styles.modalContent}>
                  {resetPasswordStatus === 'idle' ? (
                    <>
                      <ThemedView style={styles.modalTextContainer}>
                        <ThemedText type="subtitleBold" style={styles.modalTitle}>
                          {modalMode === 'firstTime'
                            ? t('auth.firstTimeTitle')
                            : t('auth.resetPasswordTitle')}
                        </ThemedText>
                        <ThemedText style={styles.stepsIntro}>
                          {modalMode === 'firstTime'
                            ? t('auth.firstTimeHowItWorks')
                            : t('auth.resetPasswordHowItWorks')}
                        </ThemedText>
                        <ThemedView style={styles.stepsList}>
                          <ThemedText style={styles.stepText}>
                            {modalMode === 'firstTime'
                              ? t('auth.firstTimeStep1')
                              : t('auth.resetPasswordStep1')}
                          </ThemedText>
                          <ThemedText style={styles.stepText}>
                            {modalMode === 'firstTime'
                              ? t('auth.firstTimeStep2')
                              : t('auth.resetPasswordStep2')}
                          </ThemedText>
                          <ThemedText style={styles.stepText}>
                            {modalMode === 'firstTime'
                              ? t('auth.firstTimeStep3')
                              : t('auth.resetPasswordStep3')}
                          </ThemedText>
                          <ThemedText style={styles.stepText}>
                            {modalMode === 'firstTime'
                              ? t('auth.firstTimeStep4')
                              : t('auth.resetPasswordStep4')}
                          </ThemedText>
                        </ThemedView>
                        <TextInput
                          ref={emailInputRef}
                          style={[
                            styles.textInput,
                            colorScheme === 'dark' ? styles.textInputDark : styles.textInputLight,
                            isFocused && styles.textInputFocused,
                            resetEmailError && styles.textInputError,
                          ]}
                          placeholder={t('auth.resetPasswordPlaceholder')}
                          placeholderTextColor={
                            colorScheme === 'dark'
                              ? Colors.semantic.placeholderDark
                              : Colors.semantic.placeholderLight
                          }
                          value={emailResetPassword}
                          onChangeText={handleResetEmailChange}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          autoComplete="email"
                          autoCorrect={false}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          returnKeyType="send"
                          onSubmitEditing={() => {
                            if (canResetPassword && !isSubmittingReset) {
                              handleResetPassword();
                            }
                          }}
                          accessibilityLabel="Email address for password reset"
                          accessibilityHint="Enter your email to receive password reset instructions"
                        />
                        {resetEmailError ? (
                          <ThemedText style={styles.errorText}>{resetEmailError}</ThemedText>
                        ) : null}
                      </ThemedView>
                      <ThemedView style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[
                            styles.modalButtonCancelContainer,
                            { borderTopColor: themeColors.border },
                          ]}
                          onPress={handleCloseModal}
                          activeOpacity={0.7}
                        >
                          <ThemedText
                            style={[styles.modalButtonCancel, { color: themeColors.tint }]}
                          >
                            {t('common.cancel')}
                          </ThemedText>
                        </TouchableOpacity>

                        <ThemedView style={styles.modalButtonSendWrapper}>
                          <CustomButton
                            title={
                              resetCooldownRemaining > 0
                                ? t('auth.tryAgainIn', { seconds: resetCooldownRemaining })
                                : isSubmittingReset
                                ? t('auth.resetPasswordSending')
                                : t('auth.resetPasswordSend')
                            }
                            handlePress={handleResetPassword}
                            containerStyles={styles.modalButtonSendContainer}
                            textStyles={styles.modalButtonSendText}
                            isLoading={
                              !canResetPassword || isSubmittingReset || resetCooldownRemaining > 0
                            }
                          />
                        </ThemedView>
                      </ThemedView>
                    </>
                  ) : resetPasswordStatus === 'success' ? (
                    <ThemedView style={styles.statusContainer}>
                      <ThemedText type="subtitleBold" style={styles.statusTitle}>
                        {t('auth.resetPasswordCheckEmail')}
                      </ThemedText>
                      <ThemedText style={styles.statusMessage}>
                        {modalMode === 'firstTime'
                          ? t('auth.firstTimeSentTo')
                          : t('auth.resetPasswordSentTo')}
                      </ThemedText>
                      <ThemedText style={styles.emailDisplay}>{emailResetPassword}</ThemedText>
                      <ThemedText style={styles.statusMessage}>
                        {modalMode === 'firstTime'
                          ? t('auth.firstTimeNextSteps')
                          : t('auth.resetPasswordNextSteps')}
                      </ThemedText>
                      <ThemedText style={[styles.spamHint, { color: themeColors.subtleText }]}>
                        {t('auth.resetPasswordCheckSpam')}
                      </ThemedText>
                      <CustomButton
                        title={t('auth.resetPasswordGotIt')}
                        handlePress={handleCloseModal}
                        containerStyles={styles.gotItButton}
                        isLoading={false}
                      />
                    </ThemedView>
                  ) : (
                    <ThemedView style={styles.statusContainer}>
                      <ThemedText type="subtitleBold" style={styles.statusTitleError}>
                        {t('common.error')}
                      </ThemedText>
                      <ThemedText style={styles.statusMessage}>{resetPasswordMessage}</ThemedText>
                      <CustomButton
                        title={t('common.tryAgain')}
                        handlePress={() => {
                          setResetPasswordStatus('idle');
                          setResetPasswordMessage('');
                        }}
                        containerStyles={styles.tryAgainButton}
                        isLoading={false}
                      />
                    </ThemedView>
                  )}
                </ThemedView>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: '100%',
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    position: 'absolute',
    left: 10,
    resizeMode: 'contain',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  text1: {
    marginTop: Spacing.sm,
  },
  margintop: {
    marginTop: Spacing.lg,
  },
  container2: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    gap: 8,
  },
  text2: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.regular,
  },
  forgetPasswordButton: {
    alignContent: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    textDecorationLine: 'underline',
  },
  firstTimeButton: {
    alignContent: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  firstTimeText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
    textDecorationLine: 'underline',
  },
  link: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.semiBold,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalTouchableWrapper: {
    width: '85%',
  },
  modalContent: {
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  modalTextContainer: {
    padding: 24,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 12,
  },
  stepsIntro: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.semiBold,
    textAlign: 'left',
    marginBottom: 8,
  },
  stepsList: {
    paddingLeft: 4,
    marginBottom: 20,
    gap: 4,
  },
  stepText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    height: 56,
    gap: 1,
  },
  modalButtonCancelContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  modalButtonCancel: {
    textAlign: 'center',
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
  modalButtonSendWrapper: {
    flex: 0.6,
  },
  modalButtonSendContainer: {
    height: '100%',
    borderRadius: 0,
    minHeight: 56,
  },
  modalButtonSendText: {
    fontSize: Typography.sizes.base,
  },
  textInput: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    minHeight: 48,
  },
  textInputLight: {
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.icon,
  },
  textInputDark: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.background,
    borderColor: Colors.dark.icon,
  },
  textInputFocused: {
    borderColor: Colors.light.tint,
    borderWidth: 2,
  },
  textInputError: {
    borderColor: Colors.semantic.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    color: Colors.semantic.error,
    marginTop: 4,
  },
  statusContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  statusTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: Colors.semantic.success,
  },
  statusTitleError: {
    textAlign: 'center',
    marginBottom: 12,
    color: Colors.semantic.error,
  },
  statusMessage: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  tryAgainButton: {
    marginTop: 20,
    minHeight: 48,
    width: '100%',
  },
  emailDisplay: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  spamHint: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  gotItButton: {
    marginTop: 20,
    minHeight: 48,
    width: '100%',
  },
});
