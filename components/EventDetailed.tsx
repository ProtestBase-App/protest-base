import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Alert,
  View,
  NativeModules,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import ImageView from 'react-native-image-viewing';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Calendar from 'expo-calendar';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLoader } from '@/components/ui/loaders/BrandLoader';
import { OrganizerAvatar } from '@/components/OrganizerAvatar';
import { countries } from '@/constants/Countries';
import { CoOrganizerAvatar } from '@/types/event.types';
import { FormattedEvent, parseAsUTC } from '@/utils/eventFormatters';
import { BorderRadius, IconSizes, Spacing, Typography } from '@/constants/DesignTokens';
import { usePostalCodes } from '@/context/PostalCodeProvider';
import { useOrganizations } from '@/context/OrganizationsProvider';
import { t } from '@/utils/i18n';
import { getThemeColors } from '@/utils/themeColors';
import { logger } from '@/utils/logger';
import { openMap } from '@/utils/mapHelpers';
import { useLogoScheme } from '@/hooks/useLogoScheme';

// Dynamically load MapLibre to avoid dual CJS/ESM module instantiation.
let MapView: any = null;
let Camera: any = null;
let MapMarker: any = null;
let isMapAvailable = false;

if (NativeModules.MLRNModule) {
  try {
    const MC = require('@/components/MapComponents');
    MapView = MC.MapView;
    Camera = MC.Camera;
    MapMarker = MC.MapMarker;
    isMapAvailable = !!(MapView && Camera && MapMarker);
    logger.info('[EventDetailed] Map components loaded', { isMapAvailable });
  } catch (error) {
    logger.warn('[EventDetailed] MapLibre failed to load', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
} else {
  logger.info('[EventDetailed] MapLibre native module not available — map hidden');
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';
const HERO_HEIGHT = 260;

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const safeOpenUrl = async (url: string): Promise<void> => {
  if (!url || !isValidUrl(url)) {
    logger.warn('Invalid URL provided:', { url });
    return;
  }
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      logger.warn('Cannot open URL:', { url });
    }
  } catch (err) {
    logger.error('Error opening URL:', { url, error: err });
  }
};

export interface EventDetailedProps {
  event: FormattedEvent;
  isCreator: boolean;
  isEventSaved: boolean;
  viewCount: number;
  onBack: () => void;
  onSave: () => void;
  onOrganizerPress: (orgId: string) => void;
  onOpenCreatorMenu: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  userLanguage: string;
  topInset: number;
  isEventLiked?: boolean;
  onLike?: () => void;
}

const EventDetailed: React.FC<EventDetailedProps> = ({
  event,
  isCreator,
  isEventSaved,
  viewCount,
  onBack,
  onSave,
  onOrganizerPress,
  onOpenCreatorMenu,
  refreshing,
  onRefresh,
  userLanguage,
  topInset,
  isEventLiked = false,
  onLike,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = getThemeColors(colorScheme);
  const logo = useLogoScheme();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const { getSubMunicipalityName, loadPostalCodesForCountry } = usePostalCodes();
  const { organizations } = useOrganizations();

  const country = countries.find((c) => c.value === event.country);
  const countryLabel = country
    ? country.label[userLanguage as 'en' | 'fr' | 'nl'] || country.label.en
    : '';

  useEffect(() => {
    if (event.country) {
      loadPostalCodesForCountry(event.country);
    }
  }, [event.country, loadPostalCodesForCountry]);

  const cityLabel =
    event.postal_code && event.country
      ? getSubMunicipalityName(String(event.postal_code), event.country)
      : '';

  const fullAddress = [event.street_address, event.postal_code, cityLabel, countryLabel]
    .filter(Boolean)
    .join(', ');

  const hasMap =
    event.geocod_lat !== null &&
    event.geocod_lat !== undefined &&
    event.geocod_lng !== null &&
    event.geocod_lng !== undefined;

  const org = event.organization_id
    ? organizations.find((o) => o.$id === event.organization_id)
    : null;
  const primaryOrgName = org?.Name || event.organizer_name;

  const proceedWithCalendarAdd = async (
    title: string,
    startDate: string,
    endDate: string | null,
    timeZone: string,
    address: string | null,
    postalCode: string | null,
    city: string | null,
    notes: string
  ) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const startDateObj = parseAsUTC(startDate);
        if (isNaN(startDateObj.getTime())) {
          Alert.alert(t('common.error'), t('common.invalidDateError'));
          return;
        }
        let endDateObj: Date;
        if (!endDate) {
          endDateObj = new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000);
        } else {
          endDateObj = parseAsUTC(endDate);
          if (isNaN(endDateObj.getTime())) {
            endDateObj = new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000);
          }
        }
        const result = await Calendar.createEventInCalendarAsync({
          title,
          startDate: startDateObj,
          endDate: endDateObj,
          timeZone,
          location: `${address ?? ''}, ${postalCode ?? ''}, ${city ?? ''}`,
          notes,
        });
        if (
          result.action === Calendar.CalendarDialogResultActions.saved ||
          result.action === Calendar.CalendarDialogResultActions.done
        ) {
          alert(t('calendar.eventSaved'));
        }
      } else {
        alert(`${t('calendar.permissionsNotGranted')}. ${t('calendar.permissionsMessage')}`);
      }
    } catch {
      alert(t('calendar.openError'));
    }
  };

  const createEventCalendar = async () => {
    if (isAddingToCalendar) return;
    setIsAddingToCalendar(true);
    try {
      const currentPermission = await Calendar.getCalendarPermissionsAsync();
      if (currentPermission.status === 'undetermined') {
        Alert.alert(
          t('permissions.calendarPreTitle'),
          t('permissions.calendarPreMessage'),
          [
            {
              text: t('permissions.notNow'),
              style: 'cancel',
              onPress: () => setIsAddingToCalendar(false),
            },
            {
              text: t('permissions.allowAccess'),
              onPress: async () => {
                await proceedWithCalendarAdd(
                  event.title,
                  event.startDateFull,
                  event.endDateFull,
                  'Europe/Brussels',
                  event.street_address ?? null,
                  event.postal_code?.toString() ?? null,
                  cityLabel || null,
                  event.description
                );
                setIsAddingToCalendar(false);
              },
            },
          ],
          { cancelable: false }
        );
        return;
      }
      await proceedWithCalendarAdd(
        event.title,
        event.startDateFull,
        event.endDateFull,
        'Europe/Brussels',
        event.street_address ?? null,
        event.postal_code?.toString() ?? null,
        cityLabel || null,
        event.description
      );
    } catch {
      alert(t('calendar.openError'));
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const viewerImages = event.image ? [{ uri: event.image }] : [];

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              tintColor={themeColors.tint}
            />
          ) : undefined
        }
      >
        <View style={styles.hero}>
          <TouchableOpacity
            activeOpacity={0.95}
            style={styles.heroImage}
            onPress={() => {
              if (event.image) setIsImageViewerVisible(true);
            }}
            disabled={!event.image}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('events.viewImage')}
          >
            <Image
              source={event.image || require('@/assets/images/event-image-default.png')}
              placeholder={require('@/assets/images/event-image-default.png')}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              style={styles.heroImage}
            />
          </TouchableOpacity>

          {/* Dark scrim behind the title — keeps white text readable on any
            image regardless of theme (the fade-to-background gradient below
            is white in light mode and would otherwise wash out the title). */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.heroTitleScrim}
            pointerEvents="none"
          />

          <LinearGradient
            colors={['transparent', themeColors.background]}
            style={styles.heroGradient}
            pointerEvents="none"
          />

          <View style={[styles.heroNav, { paddingTop: topInset + 8 }]}>
            <TouchableOpacity
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <BlurView intensity={20} tint="dark" style={styles.navPill}>
                <IconSymbol name="arrow.backward" size={IconSizes.md} color="white" />
              </BlurView>
            </TouchableOpacity>

            <RNImage source={logo} style={styles.navLogo} resizeMode="contain" />

            {isCreator ? (
              <TouchableOpacity
                style={[styles.creatorPill, { backgroundColor: themeColors.tint }]}
                onPress={onOpenCreatorMenu}
                accessibilityRole="button"
                accessibilityLabel={t('events.modifyPill')}
              >
                <IconSymbol name="pencil" size={14} color="white" />
                <ThemedText style={styles.creatorPillText}>{t('events.modifyPill')}</ThemedText>
              </TouchableOpacity>
            ) : (
              <View style={styles.heroNavRightGroup}>
                {onLike && (
                  <TouchableOpacity
                    onPress={onLike}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isEventLiked ? t('events.likedEvent') : t('events.likeEvent')
                    }
                  >
                    <BlurView
                      intensity={20}
                      tint="dark"
                      style={[
                        styles.navPill,
                        isEventLiked && { backgroundColor: themeColors.tint },
                      ]}
                    >
                      <IconSymbol
                        name={isEventLiked ? 'heart.fill' : 'heart'}
                        size={IconSizes.md}
                        color="white"
                      />
                    </BlurView>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onSave}
                  accessibilityRole="button"
                  accessibilityLabel={isEventSaved ? t('events.savedEvent') : t('events.saveEvent')}
                >
                  <BlurView
                    intensity={20}
                    tint="dark"
                    style={[styles.navPill, isEventSaved && { backgroundColor: themeColors.tint }]}
                  >
                    <IconSymbol
                      name={isEventSaved ? 'bookmark.fill' : 'bookmark'}
                      size={IconSizes.md}
                      color="white"
                    />
                  </BlurView>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ThemedText style={styles.heroTitle} numberOfLines={3} pointerEvents="none">
            {event.title}
          </ThemedText>
        </View>

        <View style={styles.content}>
          {/* The detail endpoint keeps cancelled events, so the banner shows. */}
          {event.status === 'cancelled' && (
            <View
              style={[
                styles.cancelledBanner,
                {
                  backgroundColor: themeColors.warningBg,
                  borderColor: themeColors.destructive,
                },
              ]}
            >
              <View style={styles.cancelledBannerHeader}>
                <IconSymbol
                  name="xmark.circle.fill"
                  size={IconSizes.md}
                  color={themeColors.destructive}
                />
                <ThemedText
                  style={[styles.cancelledBannerTitle, { color: themeColors.destructive }]}
                >
                  {t('events.cancelledBanner')}
                </ThemedText>
              </View>
              <ThemedText style={[styles.cancelledBannerReason, { color: themeColors.text }]}>
                <ThemedText style={styles.cancelledReasonLabel}>
                  {t('events.cancelledReasonLabel')}:{' '}
                </ThemedText>
                {event.cancellation_reason?.trim()
                  ? event.cancellation_reason
                  : t('events.cancelledNoReason')}
              </ThemedText>
            </View>
          )}

          {/* Past-event soft badge; nightly cron flips status after end_time. */}
          {event.status === 'past' && (
            <View
              style={[
                styles.pastBanner,
                {
                  backgroundColor: themeColors.badgeBg,
                  borderColor: themeColors.separator,
                },
              ]}
            >
              <IconSymbol name="clock" size={IconSizes.sm} color={themeColors.subtleText} />
              <ThemedText style={[styles.pastBannerText, { color: themeColors.subtleText }]}>
                {t('events.pastBadge')}
              </ThemedText>
            </View>
          )}

          {isCreator && (
            <View
              style={[
                styles.creatorBanner,
                {
                  backgroundColor: themeColors.categoryBadgeBg,
                  borderColor: themeColors.tint + '66',
                },
              ]}
            >
              <View style={styles.creatorBannerHeader}>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={IconSizes.sm}
                  color={themeColors.tint}
                />
                <ThemedText style={[styles.creatorBannerLabel, { color: themeColors.tint }]}>
                  {t('events.yourEvent')}
                </ThemedText>
              </View>
              <View style={styles.creatorStats}>
                <CreatorStat label={t('events.viewCount')} value={String(viewCount)} />
                <View style={[styles.statDivider, { backgroundColor: themeColors.separator }]} />
                <CreatorStat
                  label={t('events.participantsCount')}
                  value={String(event.participant_count ?? 0)}
                />
                <View style={[styles.statDivider, { backgroundColor: themeColors.separator }]} />
                <CreatorStat label={t('events.savesCount')} value={String(event.save_count ?? 0)} />
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={createEventCalendar}
            style={[
              styles.actionCard,
              {
                backgroundColor: themeColors.cardBackground,
                borderColor: themeColors.cardBorder,
              },
            ]}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.actionCardIcon,
                {
                  backgroundColor: themeColors.categoryBadgeBg,
                  borderColor: themeColors.tint + '40',
                },
              ]}
            >
              <IconSymbol name="calendar" size={IconSizes.lg} color={themeColors.tint} />
            </View>
            <View style={styles.actionCardText}>
              <ThemedText style={styles.actionCardPrimary}>{event.start_date}</ThemedText>
              <ThemedText style={[styles.actionCardSecondary, { color: themeColors.subtleText }]}>
                {event.start_time}
                {event.end_time &&
                  (event.startDateNoFormat === event.endDateNoFormat
                    ? `  ›  ${event.end_time}`
                    : `  ›  ${event.end_date}, ${event.end_time}`)}
                {' · '}
                {t('events.addToCalendar')}
              </ThemedText>
            </View>
            {isAddingToCalendar ? (
              <ActivityIndicator size="small" color={themeColors.tint} />
            ) : (
              <IconSymbol name="plus.circle" size={IconSizes.lg} color={themeColors.tint} />
            )}
          </TouchableOpacity>

          {hasMap && (
            <TouchableOpacity
              onPress={() => openMap(event.geocod_lat!, event.geocod_lng!, fullAddress)}
              style={[
                styles.actionCard,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.actionCardIcon,
                  { backgroundColor: 'rgba(33,150,243,0.12)', borderColor: 'rgba(33,150,243,0.3)' },
                ]}
              >
                {/* #2196F3 is the constant location-pin blue — hardcoded by design. */}
                <IconSymbol name="location.fill" size={IconSizes.lg} color="#2196F3" />
              </View>
              <View style={styles.actionCardText}>
                <ThemedText style={styles.actionCardPrimary}>
                  {cityLabel || event.city || event.street_address || t('events.location')}
                </ThemedText>
                <ThemedText style={[styles.actionCardSecondary, { color: themeColors.subtleText }]}>
                  {event.street_address}
                  {event.postal_code ? `, ${event.postal_code}` : ''}
                  {' · '}
                  {t('events.viewOnMap')}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={IconSizes.md} color={themeColors.chevron} />
            </TouchableOpacity>
          )}

          {(event.description || (event.help_needed && event.help_description)) && (
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}
            >
              {event.description ? (
                <View style={styles.infoSection}>
                  <ThemedText style={[styles.sectionLabel, { color: themeColors.secondaryText }]}>
                    {t('events.description').toUpperCase()}
                  </ThemedText>
                  <ThemedText style={[styles.infoBody, { color: themeColors.text }]}>
                    {event.description}
                  </ThemedText>
                </View>
              ) : null}

              {event.description && event.help_needed && event.help_description && (
                <View style={[styles.infoSeparator, { backgroundColor: themeColors.separator }]} />
              )}

              {event.help_needed && event.help_description && (
                <View
                  style={[
                    styles.helpSection,
                    {
                      backgroundColor: themeColors.categoryBadgeBg,
                      borderLeftColor: themeColors.tint,
                    },
                  ]}
                >
                  <View style={styles.helpHeader}>
                    <IconSymbol name="info.circle" size={IconSizes.sm} color={themeColors.tint} />
                    <ThemedText style={[styles.helpLabel, { color: themeColors.tint }]}>
                      {t('events.waysToHelp').toUpperCase()}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.infoBody, { color: themeColors.text }]}>
                    {event.help_description}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {(primaryOrgName ||
            (event.co_organizer_avatars && event.co_organizer_avatars.length > 0)) && (
            <View style={styles.organizersSection}>
              <ThemedText style={styles.sectionTitle}>{t('events.organizers')}</ThemedText>

              {primaryOrgName && (
                <OrganizerRow
                  name={primaryOrgName}
                  avatarUrl={event.organizer_avatar}
                  navigable={!!event.organization_id}
                  onPress={
                    event.organization_id
                      ? () => onOrganizerPress(event.organization_id)
                      : undefined
                  }
                  themeColors={themeColors}
                />
              )}

              {event.co_organizer_avatars
                ?.filter((co: CoOrganizerAvatar) => co.name?.trim())
                .map((co: CoOrganizerAvatar, i: number) => (
                  <OrganizerRow
                    key={`co-${i}`}
                    name={co.name}
                    avatarUrl={co.avatar}
                    navigable={!!co.id}
                    onPress={co.id ? () => onOrganizerPress(co.id!) : undefined}
                    themeColors={themeColors}
                  />
                ))}
            </View>
          )}

          {event.website_url && isValidUrl(event.website_url) && (
            <TouchableOpacity
              onPress={() => safeOpenUrl(event.website_url!)}
              style={[
                styles.websiteRow,
                {
                  backgroundColor: themeColors.cardBackground,
                  borderColor: themeColors.cardBorder,
                },
              ]}
              activeOpacity={0.75}
            >
              <IconSymbol name="globe.europe.africa" size={IconSizes.lg} color={themeColors.tint} />
              <ThemedText
                style={[styles.websiteText, { color: themeColors.tint }]}
                numberOfLines={1}
              >
                {event.website_url}
              </ThemedText>
              <IconSymbol name="chevron.right" size={IconSizes.md} color={themeColors.chevron} />
            </TouchableOpacity>
          )}

          {hasMap && (
            <View style={styles.mapSection}>
              <ThemedText style={styles.sectionTitle}>{t('events.location')}</ThemedText>

              <View style={[styles.mapContainer, { borderColor: themeColors.cardBorder }]}>
                {isMapAvailable && MapView && Camera && MapMarker && (
                  <>
                    <MapView
                      style={styles.map}
                      mapStyle={OPENFREEMAP_STYLE}
                      attributionEnabled={true}
                      logoEnabled={false}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                      onDidFinishLoadingMap={() => setMapLoaded(true)}
                    >
                      <Camera
                        centerCoordinate={[event.geocod_lng!, event.geocod_lat!]}
                        zoomLevel={13}
                        animationMode="moveTo"
                        animationDuration={0}
                      />
                      <MapMarker
                        coordinate={[event.geocod_lng!, event.geocod_lat!]}
                        markerWidth={40}
                        markerHeight={22}
                      />
                    </MapView>
                    {!mapLoaded && (
                      <View
                        style={[
                          styles.mapLoadingOverlay,
                          { backgroundColor: themeColors.cardBackground },
                        ]}
                      >
                        <BrandLoader />
                      </View>
                    )}
                  </>
                )}

                <TouchableOpacity
                  style={[styles.floatingDirections, { backgroundColor: themeColors.tint }]}
                  onPress={() => openMap(event.geocod_lat!, event.geocod_lng!, fullAddress)}
                  activeOpacity={0.85}
                >
                  <IconSymbol
                    name="arrow.triangle.turn.up.right.diamond"
                    size={IconSizes.md}
                    color="white"
                  />
                  <ThemedText style={styles.floatingDirectionsText}>
                    {t('events.getDirections')}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {fullAddress ? (
                <ThemedText style={[styles.addressCaption, { color: themeColors.subtleText }]}>
                  {fullAddress}
                </ThemedText>
              ) : null}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>
      <ImageView
        images={viewerImages}
        imageIndex={0}
        visible={isImageViewerVisible}
        onRequestClose={() => setIsImageViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        backgroundColor="#000"
        HeaderComponent={() => (
          <View style={[styles.viewerHeader, { paddingTop: topInset + 8 }]}>
            <TouchableOpacity
              onPress={() => setIsImageViewerVisible(false)}
              style={styles.viewerCloseButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <IconSymbol name="xmark" size={IconSizes.lg} color="white" />
            </TouchableOpacity>
          </View>
        )}
      />
    </>
  );
};

interface CreatorStatProps {
  label: string;
  value: string;
}

function CreatorStat({ label, value }: CreatorStatProps) {
  return (
    <View style={styles.creatorStat}>
      <ThemedText style={styles.creatorStatValue}>{value}</ThemedText>
      <ThemedText style={styles.creatorStatLabel}>{label}</ThemedText>
    </View>
  );
}

interface OrganizerRowProps {
  name: string;
  avatarUrl?: string | null;
  navigable: boolean;
  onPress?: () => void;
  themeColors: ReturnType<typeof getThemeColors>;
}

function OrganizerRow({ name, avatarUrl, navigable, onPress, themeColors }: OrganizerRowProps) {
  const rowContent = (
    <>
      <OrganizerAvatar avatarUrl={avatarUrl} name={name} size={44} />
      <View style={styles.orgRowText}>
        <ThemedText style={styles.orgRowName} numberOfLines={1}>
          {name}
        </ThemedText>
        {navigable && (
          <ThemedText style={[styles.orgRowSub, { color: themeColors.subtleText }]}>
            {t('events.viewProfile')}
          </ThemedText>
        )}
      </View>
      {navigable && (
        <IconSymbol name="chevron.right" size={IconSizes.md} color={themeColors.chevron} />
      )}
    </>
  );

  const rowStyle = [
    styles.orgRow,
    {
      backgroundColor: themeColors.cardBackground,
      borderColor: themeColors.cardBorder,
    },
  ];

  if (navigable && onPress) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${t('events.viewProfile')} ${name}`}
      >
        {rowContent}
      </TouchableOpacity>
    );
  }

  return <View style={rowStyle}>{rowContent}</View>;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  hero: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroTitleScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
  },
  viewerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  navPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  navLogo: {
    width: 40,
    height: 40,
  },
  heroNavRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  creatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 18,
  },
  creatorPillText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
    color: 'white',
  },
  heroTitle: {
    position: 'absolute',
    bottom: 14,
    left: Spacing.lg,
    right: Spacing.lg,
    fontFamily: Typography.families.extraBold,
    fontSize: 22,
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  cancelledBanner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cancelledBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cancelledBannerTitle: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.base,
  },
  cancelledBannerReason: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  cancelledReasonLabel: {
    fontFamily: Typography.families.semiBold,
  },
  pastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  pastBannerText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.4,
  },

  creatorBanner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  creatorBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  creatorBannerLabel: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xxs,
    letterSpacing: 0.8,
  },
  creatorStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorStat: {
    flex: 1,
    alignItems: 'center',
  },
  creatorStatValue: {
    fontFamily: Typography.families.bold,
    fontSize: Typography.sizes.xl,
  },
  creatorStatLabel: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xxs,
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  actionCardIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardText: {
    flex: 1,
  },
  actionCardPrimary: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
  actionCardSecondary: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  infoSection: {
    padding: Spacing.lg,
  },
  infoSeparator: {
    height: 0.5,
    marginHorizontal: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  infoBody: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  helpSection: {
    borderLeftWidth: 3,
    padding: Spacing.lg,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  helpLabel: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.6,
  },

  organizersSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.families.bold,
    fontSize: 17,
    marginBottom: Spacing.md,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  orgRowText: {
    flex: 1,
  },
  orgRowName: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.base,
  },
  orgRowSub: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },

  websiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  websiteText: {
    flex: 1,
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.sm,
  },

  mapSection: {
    marginBottom: Spacing.lg,
  },
  mapContainer: {
    height: 170,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingDirections: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  floatingDirectionsText: {
    fontFamily: Typography.families.semiBold,
    fontSize: Typography.sizes.sm,
    color: 'white',
  },
  addressCaption: {
    fontFamily: Typography.families.regular,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  bottomPadding: {
    height: 100,
  },
});

export default EventDetailed;
