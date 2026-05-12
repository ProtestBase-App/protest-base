import React from 'react';
import { StyleSheet, Modal, Pressable, View, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getThemeColors } from '@/utils/themeColors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography, Spacing, BorderRadius } from '@/constants/DesignTokens';
import { getMonthName } from '@/utils/calendarUtils';
import { t } from '@/utils/i18n';

interface MonthYearPickerProps {
  visible: boolean;
  year: number;
  month: number;
  userLanguage: string;
  /** Earliest selectable year */
  minYear: number;
  /** Earliest selectable month (0-based) when year === minYear */
  minMonth: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

export default function MonthYearPicker({
  visible,
  year,
  month,
  userLanguage,
  minYear,
  minMonth,
  onSelect,
  onClose,
}: MonthYearPickerProps) {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const today = new Date();

  const canGoPrevYear = year > minYear;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.content, { backgroundColor: themeColors.cardBackground }]}>
          {/* Year navigation */}
          <View style={styles.yearRow}>
            <Pressable
              onPress={() => canGoPrevYear && onSelect(year - 1, month)}
              disabled={!canGoPrevYear}
              style={({ pressed }) => [
                styles.yearArrow,
                !canGoPrevYear && { opacity: 0.2 },
                pressed && canGoPrevYear && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous year"
            >
              <IconSymbol name="chevron.left" size={18} color={themeColors.text} />
            </Pressable>
            <ThemedText style={styles.yearText}>{year}</ThemedText>
            <Pressable
              onPress={() => onSelect(year + 1, month)}
              style={({ pressed }) => [styles.yearArrow, pressed && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Next year"
            >
              <IconSymbol name="chevron.right" size={18} color={themeColors.text} />
            </Pressable>
          </View>

          {/* Month grid (4 columns x 3 rows) */}
          <ScrollView bounces={false}>
            <View style={styles.monthGrid}>
              {MONTHS.map((m) => {
                const isSelected = m === month;
                const isCurrent = m === today.getMonth() && year === today.getFullYear();
                const isPast = year < minYear || (year === minYear && m < minMonth);

                return (
                  <Pressable
                    key={m}
                    disabled={isPast}
                    style={({ pressed }) => [
                      styles.monthCell,
                      isSelected && !isPast && { backgroundColor: themeColors.calendarAccent },
                      !isSelected &&
                        !isPast &&
                        isCurrent && {
                          borderWidth: 1,
                          borderColor: themeColors.calendarAccent,
                        },
                      pressed && !isPast && { opacity: 0.6 },
                    ]}
                    onPress={() => {
                      if (!isPast) {
                        onSelect(year, m);
                        onClose();
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={getMonthName(m, userLanguage)}
                  >
                    <ThemedText
                      style={[
                        styles.monthCellText,
                        isPast && { opacity: 0.25 },
                        isSelected && !isPast && { color: 'white' },
                        !isSelected &&
                          !isPast &&
                          isCurrent && {
                            color: themeColors.calendarAccent,
                          },
                      ]}
                    >
                      {getMonthName(m, userLanguage).substring(0, 3)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Today shortcut */}
          <Pressable
            style={({ pressed }) => [
              styles.todayShortcut,
              { borderTopColor: themeColors.separator },
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => {
              onSelect(today.getFullYear(), today.getMonth());
              onClose();
            }}
          >
            <ThemedText style={[styles.todayShortcutText, { color: themeColors.calendarAccent }]}>
              {t('filters.today')}
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    maxWidth: 320,
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  yearArrow: {
    padding: Spacing.sm,
  },
  yearText: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.xl,
    minWidth: 60,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
  },
  monthCell: {
    width: '25%',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  monthCellText: {
    fontFamily: Typography.families.medium,
    fontSize: Typography.sizes.sm,
  },
  todayShortcut: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  todayShortcutText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
});
