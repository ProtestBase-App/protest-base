/**
 * App Configuration Types
 *
 * Types for the GET /app/config endpoint used for version checking
 * and maintenance mode enforcement.
 */

/**
 * Response from GET /app/config endpoint
 * Matches backend specification exactly
 */
export interface AppConfigResponse {
  success: boolean;
  data: AppConfigData;
}

/**
 * App configuration data from backend
 */
export interface AppConfigData {
  /** Minimum version allowed to use the app (per platform) */
  minimumVersion: {
    ios: string;
    android: string;
  };
  /** Latest available version in stores (per platform) */
  currentVersion: {
    ios: string;
    android: string;
  };
  /** Store URLs for updates (per platform) */
  updateUrl: {
    ios: string;
    android: string;
  };
  /** If true, users below minimum version CANNOT use the app */
  forceUpdate: boolean;
  /** If true, ALL users are blocked regardless of version */
  maintenanceMode: boolean;
  /** Message to display during maintenance (can be null) */
  maintenanceMessage: string | null;
  /** Message to display when update is available (can be null) */
  updateMessage: string | null;
  /** Internal counter, increments on each config change */
  configVersion: number;
  /** Path prefix the mobile app must prepend to all API requests (e.g. "/api/v1"). Empty string when none. */
  apiPrefix?: string;
}

/**
 * Result of version check logic
 * Used by VersionCheckProvider to determine UI state
 */
export interface VersionCheckResult {
  /** Whether the user can proceed to the app */
  canProceed: boolean;
  /** Show blocking maintenance screen */
  showMaintenanceScreen: boolean;
  /** Show blocking update required screen */
  showBlockingUpdateScreen: boolean;
  /** Show dismissible update prompt modal */
  showDismissibleUpdatePrompt: boolean;
  /** Show subtle update badge indicator */
  showUpdateBadge: boolean;
  /** Maintenance message to display */
  maintenanceMessage: string | null;
  /** Update message to display */
  updateMessage: string | null;
  /** Store URL for the current platform */
  updateUrl: string;
}
