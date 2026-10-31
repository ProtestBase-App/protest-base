import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CustomButton from '@/components/CustomButton';
import FormField from '@/components/FormField';
import { ThemedText } from '@/components/ThemedText';
import { GroupLabelRow } from '@/components/ui/GroupLabelRow';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { TEMPLATE_LIMITS } from '@/constants/EventConfig';
import { useTemplates } from '@/context/TemplatesProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';
import type { Event } from '@/types/event.types';
import { t } from '@/utils/i18n';
import { TEMPLATE_PARTS, templateFromEvent, type TemplatePart } from '@/utils/templateUtils';
import { getThemeColors } from '@/utils/themeColors';

const PART_LABEL_KEYS: Record<TemplatePart, string> = {
  text: 'template.partText',
  category: 'createEvent.category',
  location: 'template.partLocation',
  photos: 'createEvent.uploadImage',
  link: 'createEvent.link',
  coOrganizers: 'createEvent.coOrganizers',
  volunteers: 'createEvent.volunteering',
  goodToKnow: 'createEvent.disclaimer',
};

// It opens as the menu's window closes, and TalkBack takes longer to settle on that.
const AFTER_MENU_FOCUS_DELAY_MS = 1000;

export interface SaveAsTemplateDialogProps {
  event: Event;
  onClose: () => void;
}

/** Turns a published event into a template, keeping only the parts ticked. */
export function SaveAsTemplateDialog({ event, onClose }: SaveAsTemplateDialogProps) {
  const themeColors = getThemeColors(useColorScheme());
  const { bottom } = useSafeAreaInsets();
  const { addTemplate } = useTemplates();
  const headingRef = useOverlayFocus(AFTER_MENU_FOCUS_DELAY_MS);
  const [name, setName] = useState(event.title.slice(0, TEMPLATE_LIMITS.name));
  const [kept, setKept] = useState<TemplatePart[]>([...TEMPLATE_PARTS]);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string>();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  const toggle = (part: TemplatePart) => {
    setKept((prev) =>
      prev.includes(part) ? prev.filter((item) => item !== part) : [...prev, part]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(t('template.nameMissing'));
      return;
    }

    setSaving(true);
    try {
      await addTemplate({ name: name.trim(), ...templateFromEvent(event, kept) });
      onClose();
      Alert.alert(t('common.success'), t('template.createdSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.scrim]}
        onPress={onClose}
        accessible={false}
        accessibilityRole="none"
        aria-hidden
      />
      <KeyboardStickyView style={styles.sticky}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: themeColors.cardBackground, paddingBottom: bottom + Spacing.lg },
          ]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          testID="dialog-save-template"
        >
          <View ref={headingRef} accessible accessibilityRole="header">
            <ThemedText type="subtitleBold">{t('template.saveFromEventTitle')}</ThemedText>
          </View>
          <FormField
            testID="input-save-template-name"
            title={t('template.nameLabel')}
            value={name}
            placeholder={t('template.namePlaceholder')}
            handleChangeText={(value) => {
              setName(value);
              setNameError(undefined);
            }}
            maxLength={TEMPLATE_LIMITS.name}
            errorText={nameError}
            otherStyles={styles.name}
          />

          <GroupLabelRow label={t('template.keepGroup')} style={styles.keepLabel} />
          <View style={styles.parts}>
            {TEMPLATE_PARTS.map((part) => {
              const checked = kept.includes(part);
              return (
                <Pressable
                  key={part}
                  onPress={() => toggle(part)}
                  style={styles.part}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  testID={`template-part-${part}`}
                >
                  <IconSymbol
                    name={checked ? 'checkmark.square.fill' : 'square'}
                    size={IconSizes.xl}
                    color={checked ? themeColors.tint : themeColors.icon}
                  />
                  <ThemedText style={styles.partLabel}>{t(PART_LABEL_KEYS[part])}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText style={[styles.note, { color: themeColors.secondaryText }]}>
            {t('template.datesNeverSaved')}
          </ThemedText>

          <CustomButton
            testID="btn-save-template-confirm"
            title={saving ? t('common.saving') : t('template.saveButton')}
            handlePress={handleSave}
            pill
            containerStyles={styles.button}
            isLoading={saving}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  name: {
    marginTop: Spacing.md,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  keepLabel: {
    paddingHorizontal: 0,
  },
  parts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  part: {
    width: '50%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  partLabel: {
    flexShrink: 1,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.families.medium,
  },
  note: {
    marginTop: Spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    marginTop: Spacing.md,
  },
});
