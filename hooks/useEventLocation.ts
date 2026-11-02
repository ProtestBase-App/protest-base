import React, { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import type { SheetSearchMultiSelectOption } from '@/components/SheetSearchMultiSelect';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import type { FranceAreas } from '@/constants/PostalCodes_FR';
import type {
  LuxembourgCanton,
  LuxembourgCommune,
  LuxembourgLocality,
} from '@/constants/PostalCodes_LU';
import type { AddressCountryCode, AddressLang, AddressSuggestion } from '@/types/address.types';
import type { FormState } from '@/types/eventForm.types';
import { buildFranceLocalities, findFranceLocalityValue } from '@/utils/franceLocalities';
import { t } from '@/utils/i18n';
import { logger } from '@/utils/logger';

// Form country → the address endpoint's lowercase ISO code.
const ADDRESS_COUNTRY_CODES: Record<string, AddressCountryCode> = {
  belgium: 'be',
  netherlands: 'nl',
  luxembourg: 'lu',
  france: 'fr',
};

export interface UseEventLocationOptions {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  userLanguage: string;
}

/**
 * Country, postal and address state. Lives above the view, so the postal lock survives
 * it closing, and out of `FormState`, which edit screens dirty-check.
 */
export function useEventLocation({ form, setForm, userLanguage }: UseEventLocationOptions) {
  const userLang = userLanguage;
  // Offered only once the backend serves it.
  const { franceEnabled } = usePostalCodes();

  const [postalCodesData, setPostalCodesData] = React.useState<any[]>([]);
  const [postalCodesLoading, setPostalCodesLoading] = React.useState(false);
  // Luxembourg postal codes are per street, so its picker lists towns.
  const [luxembourgData, setLuxembourgData] = React.useState<{
    localities: LuxembourgLocality[];
    communes: LuxembourgCommune[];
    cantons: LuxembourgCanton[];
  } | null>(null);
  // France, without its own address search yet: the picker lists its communes.
  const [franceData, setFranceData] = React.useState<FranceAreas | null>(null);
  // A suggestion with a postcode was accepted this session, so the card credits the address.
  const [postalLocked, setPostalLocked] = React.useState(false);
  // Re-picking a filled postal code: the picker shows instead of the card.
  const [postalManualOverride, setPostalManualOverride] = React.useState(false);
  const previousCountry = React.useRef<string | null>(null);
  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    const loadPostalCodes = async () => {
      // Must stay a truthy check: edit screens mount with country '' and load the real one
      // later, and treating that as a change would wipe the address just loaded.
      if (
        !isInitialMount.current &&
        previousCountry.current &&
        previousCountry.current !== form.country &&
        (form.postal_code || form.street_address || form.city || form.region)
      ) {
        setForm((prev) => ({
          ...prev,
          postal_code: null,
          street_address: '',
          city: '',
          region: '',
          geocod_lat: null,
          geocod_lng: null,
        }));
        setPostalLocked(false);
        setPostalManualOverride(false);
      }
      previousCountry.current = form.country;
      isInitialMount.current = false;

      if (!form.country) {
        setPostalCodesData([]);
        setPostalCodesLoading(false);
        return;
      }

      setPostalCodesLoading(true);

      try {
        let postalCodesModule;

        if (form.country === 'netherlands') {
          postalCodesModule = await import('@/constants/PostalCodes_NL');
          setPostalCodesData(postalCodesModule.POSTAL_CODES_NL_NL || []);
        } else if (form.country === 'belgium') {
          if (userLang === 'en') {
            postalCodesModule = await import('@/constants/PostalCodes_BE_EN');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_EN || []);
          } else if (userLang === 'nl') {
            postalCodesModule = await import('@/constants/PostalCodes_BE_NL');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_NL || []);
          } else if (userLang === 'fr') {
            postalCodesModule = await import('@/constants/PostalCodes_BE_FR');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_FR || []);
          } else {
            postalCodesModule = await import('@/constants/PostalCodes_BE_EN');
            setPostalCodesData(postalCodesModule.POSTAL_CODES_EN || []);
          }
        } else if (form.country === 'luxembourg') {
          const luxembourgModule = await import('@/constants/PostalCodes_LU');
          setLuxembourgData({
            localities: luxembourgModule.LU_LOCALITIES,
            communes: luxembourgModule.LU_COMMUNES,
            cantons: luxembourgModule.LU_CANTONS,
          });
          setPostalCodesData([]);
        } else if (form.country === 'france') {
          if (franceEnabled) {
            const franceModule = await import('@/constants/PostalCodes_FR');
            setFranceData(franceModule.FR_AREAS);
          }
          setPostalCodesData([]);
        }
      } catch (error) {
        logger.warn('Failed to load postal codes for country', {
          country: form.country,
          error: error instanceof Error ? error.message : String(error),
        });
        setPostalCodesData([]);
        Alert.alert(t('common.error'), t('createEvent.postalCodeLoadError'), [
          { text: t('common.ok') },
        ]);
      } finally {
        setPostalCodesLoading(false);
      }
    };

    loadPostalCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country, userLang, franceEnabled]);

  const listPostalCodes = useMemo(() => {
    if (postalCodesData.length === 0) return [];

    if (form.country === 'netherlands') {
      return postalCodesData.map((code) => ({
        label: `${code.sub_municipality_name} (${code.post_code})`,
        value: String(code.post_code),
      }));
    } else if (form.country === 'belgium') {
      const getSubMunicipalityName = (code: any) => {
        if (userLang === 'en') {
          return code.sub_municipality_name_english;
        } else if (userLang === 'nl') {
          return code.sub_municipality_name_dutch;
        } else if (userLang === 'fr') {
          return code.sub_municipality_name_french;
        } else {
          return code.sub_municipality_name_english;
        }
      };

      return postalCodesData.map((code) => ({
        label: `${getSubMunicipalityName(code)} (${code.post_code})`,
        value: String(code.post_code),
      }));
    }

    return [];
  }, [postalCodesData, userLang, form.country]);

  // Keyed by locality and commune: a few village names exist in two communes.
  const luxembourgEntries = useMemo(() => {
    const entries = new Map<
      string,
      { option: SheetSearchMultiSelectOption; locality: LuxembourgLocality; region: string }
    >();
    if (!luxembourgData) return entries;
    const communeBySlug = new Map(luxembourgData.communes.map((c) => [c.slug, c]));
    const cantonBySlug = new Map(luxembourgData.cantons.map((c) => [c.slug, c]));
    for (const locality of luxembourgData.localities) {
      const commune = communeBySlug.get(locality.commune);
      const canton = commune ? cantonBySlug.get(commune.canton) : undefined;
      const value = `${locality.name}|${locality.commune}`;
      const label =
        commune && commune.name !== locality.name
          ? `${locality.name} (${commune.name})`
          : locality.name;
      entries.set(value, {
        locality,
        // Stored the way address search stores it, in every app language.
        region: canton ? `Canton ${canton.name}` : '',
        option: {
          value,
          label,
          searchText: [locality.name, commune?.name, canton?.name].join(' ').toLowerCase(),
        },
      });
    }
    return entries;
  }, [luxembourgData]);

  const isLuxembourg = form.country === 'luxembourg';
  const isFrance = form.country === 'france' && franceEnabled;

  // About 35,000 entries, so they exist only while the form is set to France.
  const franceLocalities = useMemo(
    () => (isFrance && franceData ? buildFranceLocalities(franceData) : []),
    [isFrance, franceData]
  );

  const postalCodeOptions = useMemo<SheetSearchMultiSelectOption[]>(
    () =>
      isLuxembourg
        ? [...luxembourgEntries.values()].map((entry) => entry.option)
        : isFrance
          ? franceLocalities
          : listPostalCodes.map((item) => ({
              value: item.value,
              label: item.label,
              searchText: item.label.toLowerCase(),
            })),
    [isLuxembourg, luxembourgEntries, isFrance, franceLocalities, listPostalCodes]
  );

  // A commune from address search has no entry, so nothing then shows as picked.
  const selectedLuxembourgValue = useMemo(() => {
    if (!isLuxembourg || !form.postal_code) return null;
    for (const [value, entry] of luxembourgEntries) {
      if (
        entry.locality.name === form.city &&
        String(entry.locality.postCode) === form.postal_code
      ) {
        return value;
      }
    }
    return null;
  }, [isLuxembourg, form.city, form.postal_code, luxembourgEntries]);

  const resolveLuxembourgLabel = useCallback(
    (value: string) => luxembourgEntries.get(value)?.option.label ?? value,
    [luxembourgEntries]
  );

  const selectedFranceValue = useMemo(
    () =>
      isFrance && franceData
        ? findFranceLocalityValue(franceData, form.postal_code, form.city)
        : null,
    [isFrance, franceData, form.postal_code, form.city]
  );

  const resolveFranceLabel = useCallback(
    (value: string) =>
      franceLocalities.find((locality) => locality.value === value)?.label ?? value,
    [franceLocalities]
  );

  const localityPickerValue = isLuxembourg ? selectedLuxembourgValue : selectedFranceValue;

  const postalLabelMap = useMemo(
    () => new Map(listPostalCodes.map((item) => [item.value, item.label])),
    [listPostalCodes]
  );

  // Falls back to the synced city for codes missing from the bundled data.
  const resolvePostalLabel = useCallback(
    (code: string) => postalLabelMap.get(code) ?? (form.city ? `${form.city} (${code})` : code),
    [postalLabelMap, form.city]
  );

  // Null turns the autocomplete off.
  const addressCountryCode: AddressCountryCode | null =
    form.country === 'france' && !franceEnabled
      ? null
      : (ADDRESS_COUNTRY_CODES[form.country] ?? null);

  // The endpoint answers 400 to any other language.
  const addressLang: AddressLang | undefined =
    userLang === 'en' || userLang === 'fr' || userLang === 'nl' ? userLang : undefined;

  // The postal code drives the displayed city, so a suggestion replaces postal, city and
  // region together. One without a postcode changes only the street.
  const handleAddressSelect = useCallback(
    (s: AddressSuggestion) => {
      // The backend adopts this pin instead of re-geocoding.
      // Leading digits only ("1234 AB"), as a string so no leading zero is lost.
      const trustedPostal = s.postal_code?.match(/^\s*(\d+)/)?.[1] ?? null;
      const hasTrustedPostal = trustedPostal !== null;
      setPostalLocked(hasTrustedPostal);
      if (hasTrustedPostal) setPostalManualOverride(false);
      setForm((f) => {
        if (!s.postal_code) {
          return {
            ...f,
            street_address: s.street_address,
            geocod_lat: s.lat,
            geocod_lng: s.lng,
          };
        }
        return {
          ...f,
          street_address: s.street_address,
          city: s.city ?? '',
          region: s.region ?? '',
          postal_code: hasTrustedPostal ? trustedPostal : f.postal_code,
          geocod_lat: s.lat,
          geocod_lng: s.lng,
        };
      });
    },
    [setForm]
  );

  const handleAddressClear = useCallback(() => {
    setPostalLocked(false);
    setForm((f) => ({ ...f, street_address: '', geocod_lat: null, geocod_lng: null }));
  }, [setForm]);

  // Typing away from the accepted suggestion: its postcode no longer speaks for the street.
  const handleAddressEdit = useCallback(() => {
    setPostalLocked(false);
  }, []);

  const handlePostalChangePress = useCallback(() => {
    setPostalLocked(false);
    setPostalManualOverride(true);
  }, []);

  const handlePostalManualChange = useCallback(
    (next: string[]) => {
      const value = next[0];
      const luxembourgEntry = value ? luxembourgEntries.get(value) : undefined;
      const franceLocality =
        value && isFrance
          ? franceLocalities.find((locality) => locality.value === value)
          : undefined;
      if (luxembourgEntry) {
        setForm((f) => ({
          ...f,
          postal_code: String(luxembourgEntry.locality.postCode),
          city: luxembourgEntry.locality.name,
          region: luxembourgEntry.region,
        }));
      } else if (franceLocality) {
        setForm((f) => ({
          ...f,
          // Already a 5-digit string: "01000" keeps its leading zero.
          postal_code: franceLocality.postalCode,
          city: franceLocality.city,
          region: franceLocality.region,
        }));
      } else {
        setForm((f) => ({ ...f, postal_code: value || null }));
      }
      setPostalManualOverride(false);
    },
    [setForm, luxembourgEntries, isFrance, franceLocalities]
  );

  const postalConfirmed = form.postal_code != null && !postalManualOverride;
  // A picked Luxembourg locality shows by name: its code is only representative.
  const postalConfirmedLabel = selectedLuxembourgValue
    ? resolveLuxembourgLabel(selectedLuxembourgValue)
    : resolvePostalLabel(String(form.postal_code));
  // Narrows address search, so never a Luxembourg locality's representative code.
  const addressPostalHint =
    form.postal_code && (!isLuxembourg || postalLocked) ? String(form.postal_code) : undefined;

  return {
    franceEnabled,
    isLuxembourg,
    isFrance,
    postalCodesLoading,
    postalCodeOptions,
    localityPickerValue,
    resolveLuxembourgLabel,
    resolveFranceLabel,
    resolvePostalLabel,
    postalLocked,
    postalConfirmed,
    postalConfirmedLabel,
    addressCountryCode,
    addressLang,
    addressPostalHint,
    handleAddressSelect,
    handleAddressClear,
    handleAddressEdit,
    handlePostalChangePress,
    handlePostalManualChange,
  };
}

export type EventLocation = ReturnType<typeof useEventLocation>;
