/**
 * Update Required Screen
 *
 * BLOCKING screen displayed when the user's app version is below
 * the minimum required version AND forceUpdate is true.
 * User cannot dismiss or skip - must update to continue.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import CustomButton from '@/components/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing, IconSizes } from '@/constants/DesignTokens';
import { t } from '@/utils/i18n';

interface UpdateRequiredScreenProps {
  /** Message from backend, or null for default message */
  message: string | null;
  /** Callback to open the store URL */
  onUpdate: () => void;
}

/**
 * Full-screen blocking update required display
 */
export function UpdateRequiredScreen({
  message,
  onUpdate,
}: UpdateRequiredScreenProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint;

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Ionicons name="download-outline" size={IconSizes['3xl'] * 2} color={iconColor} />
          <ThemedText type="title" style={styles.title}>
            {t('version.updateRequired.title')}
          </ThemedText>
          <ThemedText style={styles.message}>
            {message || t('version.updateRequired.message')}
          </ThemedText>
          <CustomButton
            title={t('version.updateRequired.button')}
            handlePress={onUpdate}
            containerStyles={styles.button}
            isLoading={false}
          />
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  title: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: Spacing['2xl'],
  },
  button: {
    minWidth: 200,
  },
});
