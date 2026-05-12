import React, { useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  ListRenderItem,
  Pressable,
  View,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/DesignTokens';
import { ParsedEventTemplate } from '@/types/template.types';
import TemplateCardItem from '@/components/TemplateCardItem';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getThemeColors } from '@/utils/themeColors';

export interface TemplateListProps {
  templates: ParsedEventTemplate[];
  onTemplatePress: (template: ParsedEventTemplate) => void;
  onCreateTemplate?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
}

export default function TemplateList({
  templates,
  onTemplatePress,
  onCreateTemplate,
  refreshing = false,
  onRefresh,
  ListFooterComponent,
}: TemplateListProps) {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  const renderItem: ListRenderItem<ParsedEventTemplate> = useCallback(
    ({ item }) => <TemplateCardItem template={item} onPress={onTemplatePress} />,
    [onTemplatePress]
  );

  const keyExtractor = useCallback((item: ParsedEventTemplate) => item.$id, []);

  const themeColors = getThemeColors(colorScheme);

  const ListHeader = useCallback(() => {
    if (!onCreateTemplate) return null;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.createButton,
          { borderColor: themeColors.cardBorder },
          pressed && styles.createButtonPressed,
        ]}
        onPress={onCreateTemplate}
        accessibilityLabel="Create new template"
        accessibilityRole="button"
        testID="btn-create-template"
      >
        <ThemedView style={styles.createButtonContent}>
          <View style={[styles.iconContainer, { backgroundColor: '#F94460' }]}>
            <IconSymbol name="plus" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.createButtonTextContainer}>
            <ThemedText type="defaultSemiBold" style={styles.createButtonTitle}>
              Create New Template
            </ThemedText>
            <ThemedText style={[styles.createButtonSubtitle, { color: themeColors.subtleText }]}>
              Save event details for quick reuse
            </ThemedText>
          </View>
          <IconSymbol name="chevron.forward" size={20} color="#999999" />
        </ThemedView>
      </Pressable>
    );
  }, [onCreateTemplate, themeColors]);

  return (
    <FlatList
      data={templates}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
            colors={[tintColor]}
          />
        ) : undefined
      }
      accessibilityLabel="Templates list"
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  createButton: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Shadows.card.ios.shadowColor,
        shadowOffset: Shadows.card.ios.shadowOffset,
        shadowOpacity: Shadows.card.ios.shadowOpacity,
        shadowRadius: Shadows.card.ios.shadowRadius,
      },
      android: {
        elevation: Shadows.card.android.elevation,
      },
    }),
  },
  createButtonPressed: {
    opacity: 0.7,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  createButtonTextContainer: {
    flex: 1,
  },
  createButtonTitle: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs,
  },
  createButtonSubtitle: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
  },
});
