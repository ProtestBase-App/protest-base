import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, IconSymbolName } from '@/components/ui/IconSymbol';
import { Routes } from '@/constants/Routes';
import { Spacing, BorderRadius, Typography, IconSizes } from '@/constants/DesignTokens';
import { getThemeColors } from '@/utils/themeColors';
import { t } from '@/utils/i18n';

interface OptionRowProps {
  title: string;
  subtitle: string;
  icon: IconSymbolName;
  onPress: () => void;
  testID?: string;
}

function OptionRow({ title, subtitle, icon, onPress, testID }: OptionRowProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: themeColors.cardBackground,
          borderBottomColor: themeColors.border,
        },
        pressed && styles.optionRowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      testID={testID}
    >
      <View style={[styles.iconCircle, { backgroundColor: themeColors.categoryBadgeBg }]}>
        <IconSymbol name={icon} size={IconSizes.lg} color={themeColors.tint} />
      </View>
      <View style={styles.textContent}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={[styles.optionSubtitle, { color: themeColors.secondaryText }]}>
          {subtitle}
        </ThemedText>
      </View>
      <IconSymbol name="chevron.forward" size={IconSizes.sm} color={themeColors.chevron} />
    </Pressable>
  );
}

export default function CreateEventOptionsScreen() {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);

  const handleCreateFromScratch = () => {
    router.push({
      pathname: Routes.CREATE_EVENT,
      params: { source: 'scratch' },
    });
  };

  const handleUseTemplate = () => {
    router.push({
      pathname: Routes.EVENT_TEMPLATES,
      params: { mode: 'selection' },
    });
  };

  return (
    <ThemedView style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <View style={styles.container}>
          <View
            style={[
              styles.optionsCard,
              {
                backgroundColor: themeColors.cardBackground,
                borderColor: themeColors.border,
              },
            ]}
          >
            <OptionRow
              testID="btn-create-from-scratch"
              title={t('createEventOptions.blankTitle')}
              subtitle={t('createEventOptions.blankSubtitle')}
              icon="plus.circle"
              onPress={handleCreateFromScratch}
            />
            <OptionRow
              testID="btn-use-template"
              title={t('createEventOptions.templateTitle')}
              subtitle={t('createEventOptions.templateSubtitle')}
              icon="doc.on.doc"
              onPress={handleUseTemplate}
            />
          </View>

          <ThemedText style={[styles.footerText, { color: themeColors.subtleText }]}>
            {t('createEventOptions.footer')}
          </ThemedText>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  optionsCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionRowPressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  optionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.families.medium,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.regular,
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.regular,
    textAlign: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
});
