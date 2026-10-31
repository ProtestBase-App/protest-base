import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FormSurface } from '@/components/event-form/FormSurface';
import { LocationSection } from '@/components/event-form/LocationSection';
import CustomButton from '@/components/CustomButton';
import { EventMapPreview } from '@/components/EventMapPreview';
import { BorderRadius, Spacing } from '@/constants/DesignTokens';
import { useHomeArea } from '@/context/HomeAreaProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { EventLocation } from '@/hooks/useEventLocation';
import type { FormState, SavedPin } from '@/types/eventForm.types';
import { formPin } from '@/utils/eventWhen';
import { t } from '@/utils/i18n';
import { countryOfLocationToken } from '@/utils/locationFilterOptions';
import { getThemeColors } from '@/utils/themeColors';

export interface WhereSurfaceProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  location: EventLocation;
  userLanguage: string;
  isDark: boolean;
  inSheet: boolean;
  savedPin?: SavedPin | null;
  onClose: () => void;
}

export function WhereSurface({
  form,
  setForm,
  location,
  userLanguage,
  isDark,
  inSheet,
  savedPin,
  onClose,
}: WhereSurfaceProps) {
  const { homeAreaToken } = useHomeArea();
  const themeColors = getThemeColors(useColorScheme());
  const pin = formPin(form, savedPin);

  return (
    <FormSurface
      title={t('createEvent.where')}
      onClose={onClose}
      inSheet={inSheet}
      testID="surface-where"
      footer={
        <View style={styles.footer}>
          <CustomButton
            testID="btn-where-done"
            title={t('common.done')}
            handlePress={onClose}
            pill
            isLoading={false}
          />
        </View>
      }
    >
      {!!pin && (
        <View style={[styles.map, { borderColor: themeColors.cardBorder }]}>
          <EventMapPreview latitude={pin.latitude} longitude={pin.longitude} />
        </View>
      )}
      <LocationSection
        form={form}
        setForm={setForm}
        location={location}
        userLanguage={userLanguage}
        isDark={isDark}
        suggestedCountry={homeAreaToken ? countryOfLocationToken(homeAreaToken) : null}
      />
    </FormSurface>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  map: {
    height: 150,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
});
