/**
 * App version check against backend configuration.
 *
 * Logic order (per backend spec):
 *   1. maintenanceMode → block
 *   2. installedVersion < minimumVersion → step 3
 *   3. forceUpdate → block or show dismissible prompt
 *   4. installedVersion < currentVersion → optional update badge
 *
 * Fail-open: if the API errors out, the user proceeds to the app.
 */

import { Platform, Linking } from 'react-native';
import { logger } from '@/utils/logger';
// Import individual semver functions; importing the full package breaks Metro.
import semverValid from 'semver/functions/valid';
import semverLt from 'semver/functions/lt';
import api, { setApiPrefix } from './api';
import { AppConfigResponse, VersionCheckResult } from '@/types/appConfig.types';
import { getInstalledAppVersion } from '@/utils/appVersion';

/** Default fail-open result — lets the user proceed when the API fails. */
const FAIL_OPEN_RESULT: VersionCheckResult = {
  canProceed: true,
  showMaintenanceScreen: false,
  showBlockingUpdateScreen: false,
  showDismissibleUpdatePrompt: false,
  showUpdateBadge: false,
  maintenanceMessage: null,
  updateMessage: null,
  updateUrl: '',
};

/**
 * Checks app version against backend configuration.
 *
 * @returns VersionCheckResult indicating what UI to show
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  try {
    // Integrity-exempt endpoint; runs anonymously before attestation.
    const response = await api.get<AppConfigResponse>('/app/config');

    if (!response.data.success) {
      logger.warn('[VersionService] App config returned success: false');
      return FAIL_OPEN_RESULT;
    }

    const data = response.data.data;

    // Capture the dynamic API prefix so subsequent requests route correctly.
    // Empty-string default keeps an old-backend / new-app combo working.
    await setApiPrefix(data.apiPrefix ?? '');

    const installedVersion = getInstalledAppVersion() ?? '0.0.0';
    const platform = Platform.OS;

    if (platform !== 'ios' && platform !== 'android') {
      logger.warn('[VersionService] Unsupported platform', { platform });
      return FAIL_OPEN_RESULT;
    }

    const minimumVersion = data.minimumVersion[platform];
    const currentVersion = data.currentVersion[platform];
    const updateUrl = data.updateUrl[platform];

    if (!semverValid(installedVersion)) {
      logger.warn('[VersionService] Invalid installed version', { installedVersion });
      return FAIL_OPEN_RESULT;
    }

    if (!semverValid(minimumVersion)) {
      logger.warn('[VersionService] Invalid minimum version from API', { minimumVersion });
      return FAIL_OPEN_RESULT;
    }

    // Maintenance mode has highest priority.
    if (data.maintenanceMode) {
      logger.info('[VersionService] App is in maintenance mode');
      return {
        canProceed: false,
        showMaintenanceScreen: true,
        showBlockingUpdateScreen: false,
        showDismissibleUpdatePrompt: false,
        showUpdateBadge: false,
        maintenanceMessage: data.maintenanceMessage,
        updateMessage: null,
        updateUrl: '',
      };
    }

    const isBelowMinimum = semverLt(installedVersion, minimumVersion);

    if (isBelowMinimum) {
      if (data.forceUpdate) {
        logger.info(
          `[VersionService] Force update required: ${installedVersion} < ${minimumVersion}`
        );
        return {
          canProceed: false,
          showMaintenanceScreen: false,
          showBlockingUpdateScreen: true,
          showDismissibleUpdatePrompt: false,
          showUpdateBadge: false,
          maintenanceMessage: null,
          updateMessage: data.updateMessage,
          updateUrl: updateUrl,
        };
      } else {
        logger.info(
          `[VersionService] Optional update available: ${installedVersion} < ${minimumVersion}`
        );
        return {
          canProceed: true,
          showMaintenanceScreen: false,
          showBlockingUpdateScreen: false,
          showDismissibleUpdatePrompt: true,
          showUpdateBadge: false,
          maintenanceMessage: null,
          updateMessage: data.updateMessage,
          updateUrl: updateUrl,
        };
      }
    }

    let hasAvailableUpdate = false;
    if (semverValid(currentVersion)) {
      hasAvailableUpdate = semverLt(installedVersion, currentVersion);
    }

    if (hasAvailableUpdate) {
      logger.info(`[VersionService] Update badge: ${installedVersion} < ${currentVersion}`);
    }

    return {
      canProceed: true,
      showMaintenanceScreen: false,
      showBlockingUpdateScreen: false,
      showDismissibleUpdatePrompt: false,
      showUpdateBadge: hasAvailableUpdate,
      maintenanceMessage: null,
      updateMessage: hasAvailableUpdate ? data.updateMessage : null,
      updateUrl: updateUrl,
    };
  } catch (error) {
    // Fail-open: log and allow the user to proceed.
    logger.error('[VersionService] Version check failed:', { error });
    return FAIL_OPEN_RESULT;
  }
}

/** Open the platform store URL for updates. */
export function openUpdateUrl(url: string): void {
  if (url) {
    Linking.openURL(url).catch((err) => {
      logger.error('[VersionService] Failed to open store URL:', err);
    });
  }
}
