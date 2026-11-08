/**
 * External Links - Centralized URLs for external resources
 *
 * These URLs were previously environment variables but are now constants
 * for better reliability and simpler configuration.
 */

export const ExternalLinks = {
  /**
   * Form for organizations to apply to become event organizers on ProtestBase
   */
  ONBOARDING_FORM:
    'https://cryptpad.fr/form/#/2/form/view/-SUEa5882qMtG5vrU9IvAOT3KcGffF3CU8TBLRsbKHg/',

  /**
   * Form for users to submit feedback about the app
   */
  FEEDBACK_FORM: 'https://tally.so/r/wgr7EP/',

  /**
   * Weather provider credited on the event "Protest forecast" card. Its data
   * is CC BY 4.0, which requires the attribution to link here.
   */
  OPEN_METEO: 'https://open-meteo.com/',

  /**
   * The privacy policy on the website, one page per app language. French is the
   * site's default language, so its page has no language prefix.
   */
  PRIVACY_POLICY: {
    fr: 'https://protestbase.be/privacy/',
    en: 'https://protestbase.be/en/privacy/',
    nl: 'https://protestbase.be/nl/privacy/',
  },
} as const;
