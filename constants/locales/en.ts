/**
 * English Translations
 *
 * Comprehensive English translations for the ProtestBase app.
 * This file implements the LocaleData structure for the 'en' locale.
 */

import { LocaleData } from '@/types/i18n.types';

const en: LocaleData = {
  // ============================================
  // Tabs - Bottom tab bar labels
  // ============================================
  tabs: {
    home: 'Calendar',
    explore: 'Explore',
    more: 'More',
  },

  // ============================================
  // Filters - Filter screens and options
  // ============================================
  filters: {
    title: 'Filters',
    location: 'Location',
    date: 'Date',
    organization: 'Organization',
    category: 'Category',
    allLocations: 'All Locations',
    allDates: 'All dates',
    allOrganizations: 'All organizations',
    allCategories: 'All categories',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisWeekend: 'This Weekend',
    confirmFilters: 'Confirm Filters',
    loadingLocations: 'Loading locations...',
    locationPlaceholder: 'City, postal code, ...',
    searchPlaceholder: 'Type at least 2 characters to search...',
    locationError: 'Please select a valid location.',
    organizationPlaceholder: 'Organizers, ...',
    searchOrganizations: 'Search organizations...',
    organizationError: 'Please select a valid organization.',
    selected: 'Selected:',
    clearAllOrganizations: 'Clear all selected organizations',
    clearAllLocations: 'Clear all selected locations',
    tierRegion: 'Region',
    tierProvince: 'Province',
    tierMunicipality: 'Municipality',
    postalCodesCount: '{{count}} postal codes',
    selectionTooBroad: 'Selection too broad — pick fewer or smaller areas.',
  },

  // ============================================
  // Categories - Event categories
  // ============================================
  categories: {
    protest: 'Protest',
    act: 'Act',
    learn: 'Learn',
    support: 'Support',
    strike: 'Strike',
  },

  // ============================================
  // Common - General UI elements
  // ============================================
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    loading: 'Loading...',
    loadingCurrentWord: 'Loading. Current word: {{word}}',
    error: 'Error',
    success: 'Success',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    close: 'Close',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    required: 'Required',
    optional: 'Optional',
    search: 'Search',
    filter: 'Filter',
    clear: 'Clear',
    clearAll: 'Clear all',
    apply: 'Apply',
    reset: 'Reset',
    refresh: 'Refresh',
    retry: 'Retry',
    submit: 'Submit',
    edit: 'Edit',
    create: 'Create',
    update: 'Update',
    view: 'View',
    share: 'Share',
    report: 'Report',
    help: 'Help',
    welcome: 'Welcome',
    seeAll: 'See All',
    viewAll: 'View All',
    learnMore: 'Learn More',
    getStarted: 'Get Started',
    continue: 'Continue',
    skip: 'Skip',
    tryAgain: 'Try Again',
    goBack: 'Go Back',
    dismiss: 'Dismiss',
    noResultsFound: 'No results found',
    tryAdjustingSearch: 'Try adjusting your search term',
    invalidDateError: 'Invalid date. Cannot add to calendar.',
  },

  // ============================================
  // Template - Event template management
  // ============================================
  template: {
    // Titles
    createTitle: 'Create Template',
    createFromEventTitle: 'Create Template from Event',
    editTitle: 'Edit Template',

    // Subtitles and descriptions
    createSubtitle:
      'Save your event details as a reusable template to speed up future event creation.',
    eventDetailsSection: 'Event Details to Save',
    eventDetailsHelper: 'Fill in the event details you want to reuse. All fields are optional.',

    // Field labels
    nameLabel: 'Template Name *',
    descriptionLabel: 'Template Description (Optional)',
    namePlaceholder: 'Give your template a name (e.g., Monthly Meetup)',
    descriptionPlaceholder: 'What is this template for?',

    // Buttons
    saveButton: 'Save Template',
    deleteButton: 'Delete Template',

    // Success messages
    createdSuccess: 'Template saved successfully!',
    updatedSuccess: 'Template updated successfully!',
    deletedSuccess: 'Template deleted successfully!',

    // Error messages
    nameMissing: 'Please enter a template name.',
    volunteerDescMissing: 'Please describe how volunteers can help.',

    // Delete confirmation
    deleteConfirmTitle: 'Delete Template',
    deleteConfirmMessage:
      'Are you sure you want to delete "{{name}}"? This action cannot be undone.',

    // Loading states
    deleting: 'Deleting template...',
  },

  // ============================================
  // Create Event Options
  // ============================================
  createEventOptions: {
    blankTitle: 'Plan a new action',
    blankSubtitle: 'Create a new event with a blank form',
    templateTitle: 'Use a template',
    templateSubtitle: 'Pre-fill with saved event details',
    footer: 'Templates save time for recurring events with similar details.',
  },

  // ============================================
  // Event Edit
  // ============================================
  eventEdit: {
    title: 'Edit Event',
    successMessage: 'Event edited successfully!',
    mandatoryFieldsError: 'Please fill in all mandatory fields.',
    invalidTimeRangeError: 'End time cannot be before the Start time',
    closeAccessibilityLabel: 'Close edit event screen',
  },

  // ============================================
  // Auth - Authentication & user access
  // ============================================
  auth: {
    signIn: 'Log in',
    signOut: 'Sign Out',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset Password',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
    signInButton: 'Sign In',
    signInSuccess: 'User signed in successfully',
    signInError: 'Failed to sign in. Please check your credentials.',
    logoutSuccess: 'Successfully signed out',
    logoutError: 'Failed to sign out. Please try again.',
    sessionExpired: 'Session Expired',
    invalidCredentials: 'Invalid email or password',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    invalidEmail: 'Please enter a valid email address',
    fillAllFields: 'Please fill in all fields',
    resetPasswordTitle: 'Reset Password',
    resetPasswordDescription:
      'We will send you an email with the instructions to reset your password',
    resetPasswordPlaceholder: 'your.email@example.com',
    resetPasswordSend: 'Send',
    resetPasswordSending: 'Sending...',
    resetPasswordSuccess: 'Password reset instructions sent to your email',
    resetPasswordError: 'Failed to send reset instructions. Please try again.',
    tryAgainIn: 'Try again in {{seconds}}s',
    noAccount: "Don't have an account?",
    requestAccess: 'Request it here',
    resetPasswordCheckEmail: 'Check your email',
    resetPasswordHowItWorks: "Here's how it works:",
    resetPasswordStep1: '1. Enter your email below',
    resetPasswordStep2: '2. Check your inbox for a reset link',
    resetPasswordStep3: '3. Open the link to set a new password on our website',
    resetPasswordStep4: '4. Come back here and sign in',
    resetPasswordSentTo: 'We sent a reset link to:',
    resetPasswordNextSteps:
      'Open the link to set a new password on our website. Once done, come back here and sign in.',
    resetPasswordCheckSpam: "Didn't receive it? Check your spam folder.",
    resetPasswordGotIt: 'Got it',
    firstTimeLogin: 'Login for first time?',
    firstTimeTitle: 'Set Your Password',
    firstTimeHowItWorks: "Here's how to get started:",
    firstTimeStep1: '1. Enter the email linked to your account below',
    firstTimeStep2: '2. Check your inbox for a password setup link',
    firstTimeStep3: '3. Open the link to create your password on our website',
    firstTimeStep4: '4. Come back here and sign in',
    firstTimeSentTo: 'We sent a password setup link to:',
    firstTimeNextSteps:
      'Open the link to create your password on our website. Once done, come back here and sign in.',
    migrationBannerTitle: 'Password Reset Required',
    migrationBannerMessage:
      'We recently migrated our systems to improve security. Your previous password will no longer work.',
    migrationBannerAction: 'Reset Password',
  },

  // ============================================
  // Home - Calendar/saved events screen
  // ============================================
  home: {
    title: 'My Calendar',
    emptyTitle: 'No Upcoming Events',
    emptySubtitle: 'Discover and save events from the Explore tab to see them here.',
    emptyButton: 'Explore Events',
    refreshFailed: 'Refresh Failed',
    refreshFailedMessage: 'Unable to refresh events. Please check your connection and try again.',
    noEvents: 'No events',
    viewToggleCalendar: 'Calendar',
    viewToggleList: 'List',
    listSectionUpcoming: 'Upcoming',
    listSectionPast: 'Past',
    listEmptyTitle: 'No saved events',
    listEmptySubtitle: 'Events you save will show up here.',
  },

  // ============================================
  // Explore - Event discovery screen
  // ============================================
  explore: {
    searchPlaceholder: 'Search for a protest',
    noResults: 'No Events Found',
    noResultsMessage:
      "We couldn't find any events matching your search. Try adjusting your filters or search terms.",
    filterTitle: 'Filter Events',
    categories: 'Categories',
    dateRange: 'Date Range',
    location: 'Location',
    organization: 'Organization',
    helpTitle: 'How to Use Explore',
    helpDescription:
      'Use the search bar to find events by keyword, or apply filters to narrow your results by category, date, location, or organizer.',
    refreshFailed: 'Refresh Failed',
    refreshFailedMessage: 'Unable to refresh events. Please check your connection and try again.',
    saveError: 'Failed to update saved events. Please try again.',
    emptyTitle: 'Nothing Scheduled Yet',
    emptySubtitle: "Organizers haven't created any upcoming events. Check back soon!",
  },

  // ============================================
  // More - Additional features hub
  // ============================================
  more: {
    // Section Headers
    myOrganization: 'My Organization',
    tools: 'Tools',
    resources: 'Resources',
    account: 'Account',
    settings: 'Settings',
    accountResources: 'Account & Resources',
    devTools: 'Dev Tools',

    // Action Buttons
    createEvent: 'Create Event',
    createNewEvent: 'Create New Event',
    myEvents: 'My Events',
    myUpcomingEvents: 'My Upcoming Events',
    myPastEvents: 'My Past Events',
    draftEvents: 'Draft Events',
    draftEventsEmpty: 'No draft events yet',
    eventTemplates: 'Event Templates',
    becomeOrganizer: 'Become an Organizer',
    signInToManageEvents: 'Sign In to Manage Events',
    giveFeedback: 'Give Feedback',
    about: 'About',
    termsAndConditions: 'Terms & Conditions',
    termsPrivacy: 'Terms & Privacy',
    accountInfo: 'Account Information',
    deleteAccount: 'Delete Account',
    logout: 'Logout',
    createFakeEventDev: 'Create Fake Event (Dev)',
    creating: 'Creating...',

    // Alerts
    logoutSuccess: 'You have been logged out successfully.',
    logoutError: 'Failed to log out. Please try again.',
    privacyCenter: 'Privacy Center',
  },

  // ============================================
  // Events - Event detail & actions
  // ============================================
  events: {
    // Event Detail Labels
    title: 'Event Title',
    viewImage: 'View event image',
    description: 'Description',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    organizer: 'Organizer',
    organizedBy: 'Organized by',
    organizers: 'Organizers',
    category: 'Category',
    attendees: 'Attendees',
    waysToHelp: 'Ways to Help',
    coOrganizers: 'Co-Organizers',
    attention: 'Attention',
    moreInfo: 'More Info',

    // Actions
    save: 'Save',
    saved: 'Saved',
    unsave: 'Unsave',
    share: 'Share',
    report: 'Report Event',
    addToCalendar: 'Add to Calendar',
    getDirections: 'Get Directions',
    viewOnMap: 'View on map',

    // Confirmations
    saveSuccess: 'Event saved to your calendar',
    unsaveSuccess: 'Event removed from your calendar',
    reportSubmitted: 'Report submitted successfully',
    eventSaved: 'Event Saved',
    eventUnsaved: 'Event Unsaved',

    // Delete
    deleteButton: 'Delete Event',
    deleteConfirmTitle: 'Delete Event',
    deleteConfirmMessage:
      'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
    deleting: 'Deleting event...',

    // Badges & Labels
    views: 'Views',
    helpWanted: 'Help Wanted',

    // Redesigned event detail — sticky bar
    saveEvent: 'Save',
    savedEvent: 'Saved',
    directions: 'Directions',

    // Creator mode — sticky bar
    manage: 'Manage',
    editEvent: 'Edit Event',

    // Creator mode — nav pill
    modifyPill: 'Edit',

    // Creator mode — stats banner
    yourEvent: 'YOUR EVENT',
    viewCount: 'Views',
    savesCount: 'Saves',

    // Organizer row
    viewProfile: 'View profile',

    // Creator action sheet
    editDetails: 'Edit details',
    editDetailsDesc: 'Title, date, location, description',
    notifyParticipants: 'Notify participants',
    notifyParticipantsDesc: 'Send an update',
    visitorPreview: 'Visitor preview',
    visitorPreviewDesc: 'See as a normal user',
    cancelEvent: 'Cancel event',
    cancelEventDesc: "This can't be undone",
    comingSoon: 'Coming soon',

    // Cancellation / lifecycle banners
    cancelledBadge: 'Cancelled',
    cancelledBanner: 'This event has been cancelled',
    cancelledReasonLabel: 'Reason',
    cancelledNoReason: 'No reason given',
    pastBadge: 'Past event',
    cancelConfirmTitle: 'Cancel this event?',
    cancelConfirmMessage: "The event will be marked as cancelled. This can't be undone.",
    cancelAction: 'Cancel event',
    keepActive: 'Keep event',
    cancelSuccess: 'Event cancelled',
    alreadyCancelled: 'This event has already been cancelled.',
    cancelError: 'Could not cancel the event. Please try again.',

    // Like
    likeEvent: 'Like',
    likedEvent: 'Liked',
    likesCount: 'Likes',
  },

  // ============================================
  // Organizer Profile
  // ============================================
  organizer: {
    title: 'Organizer',
    upcomingEvents: 'Upcoming Events',
    seeAll: 'See all',
    events: 'Events',
    followers: 'Followers',
    rating: 'Rating',
    about: 'About',
    memberSince: 'Member since',
    verifiedOrganizer: 'Verified organizer',
    follow: 'Follow',
    following: '✓ Following',
    noUpcomingEvents: 'No upcoming events',
    report: 'Report this organizer',
    followComingSoon: 'Follow functionality coming soon',

    // Rich profile
    bio: 'About',
    noBio: 'No description available yet.',
    website: 'Website',
    location: 'Location',
    members: 'Members',
    loadError: 'Could not load organizer details',
  },

  // ============================================
  // Create Event - Event creation form
  // ============================================
  createEvent: {
    // Organization Selection
    organization: 'Organization',
    selectOrganization: 'Select organization',
    organizationRequired: 'Please select an organization',

    // Section Headers
    basicInformation: 'BASIC INFORMATION',
    dateAndTime: 'DATE & TIME',
    locationSection: 'LOCATION',
    additionalInfo: 'Additional Information',
    mediaAndAdditionalDetails: 'MEDIA & ADDITIONAL DETAILS',
    additionalDetails: 'ADDITIONAL DETAILS',

    // Field Labels
    title: 'Title',
    description: 'Description',
    category: 'Category',
    startTime: 'Start Time',
    endTime: 'End Time',
    country: 'Country',
    postalCode: 'Postal Code',
    streetAddress: 'Street Address',
    organizerName: 'Organizer Name',
    contactEmail: 'Contact Email',
    helpNeeded: 'Help Needed',
    helpDescription: 'What help do you need?',
    uploadImage: 'Upload Image',
    eventLink: 'Event Link',
    coOrganizers: 'Co-Organizers',
    volunteering: 'Volunteering',
    volunteerRoles: 'Volunteer Roles & Details',
    disclaimer: 'Disclaimer',

    // Placeholders
    titlePlaceholder: 'Title of the Event',
    descriptionPlaceholder:
      "Describe your event - what it's about, what to expect, who should attend...",
    selectCategory: 'Select a category',
    categoryPlaceholder: 'Select a category',
    pickDateTime: 'Pick date/time',
    pickStartDateTime: 'Pick start date/time',
    pickEndDateTime: 'Pick end date/time',
    countryPlaceholder: 'Select country',
    selectCountry: 'Select country',
    postalCodePlaceholder: 'Postal code',
    searchPostalCode: 'Search by postal code or municipality...',
    streetAddressPlaceholder: 'Street name and number',
    organizerNamePlaceholder: 'Your organization name',
    contactEmailPlaceholder: 'contact@example.com',
    helpDescriptionPlaceholder: 'Describe what volunteers or help you need...',
    eventLinkPlaceholder: 'https://www.example.com',
    selectCoOrganizers: 'Select co-organizing groups',
    volunteerRolesPlaceholder:
      'Example:\n\nWAYS TO HELP\n\n  WATER DISTRIBUTION\n    Role: Distribute water.\n    Arrive: 1:30 PM\n    Meet: Station B\nNo signup needed, just show up!',
    disclaimerPlaceholder: 'Important safety info, accessibility details, what to bring...',

    // Helper text
    categoryHelper: 'Helps people discover your event through filters',
    endTimeHelper: 'Leave blank if the event duration is flexible',
    locationHelper: 'Provide a specific location so attendees can find the event easily',
    imageHelper: 'Add a compelling image to attract more attendees',
    eventLinkHelper: 'Share a link to your event page, registration form, or more information',
    coOrganizersHelper: 'Organizations collaborating on this event',
    volunteerHelper: 'Let volunteers know how they can support your event',
    disclaimerHelper:
      'Important information attendees should know (safety, accessibility, requirements, etc.)',

    // Checkbox labels
    needHelpCheckbox: 'I need help in this event',

    // Labels
    selected: 'Selected',

    // Validation Messages
    titleRequired: 'Event title is required',
    descriptionRequired: 'Description is required',
    categoryRequired: 'Please select a category',
    startTimeRequired: 'Start time is required',
    countryRequired: 'Country is required',
    postalCodeRequired: 'Postal code is required',
    streetAddressRequired: 'Street address is required',
    organizerNameRequired: 'Organizer name is required',
    contactEmailRequired: 'Contact email is required',
    contactEmailInvalid: 'Please enter a valid email address',
    endTimeBeforeStart: 'End time must be after start time',
    invalidUrlFormat: 'Website URL must start with www., http://, or https://',

    // Progress & Actions
    progressText: 'Required fields completed',
    requiredFieldsProgress: 'Required fields completed: {{completed}}/{{total}}',
    saveAsDraft: 'Save as Draft',
    publish: 'Publish Event',
    creating: 'Creating Event...',
    updating: 'Updating Event...',

    // Template
    templateError: 'Template Error',
    templateErrorMessage:
      'Could not load template data. You can continue creating your event from scratch.',
    // Additional validation
    fillMandatoryFields: 'Please fill in all mandatory fields.',
    organizationsLoading: 'Please wait for organizations to load before submitting.',
    // Accessibility
    closeAccessibilityLabel: 'Close create event screen',
    progressAccessibilityLabel: 'Form progress: {{percentage}}% complete',
    removeImageAccessibilityLabel: 'Remove selected image',
    changeImageAccessibilityLabel: 'Change selected image',
    addImageAccessibilityLabel: 'Add an image to your event',
    imageAccessibilityHint: 'Opens photo library to select an image',
    clearPostalCodeAccessibilityLabel: 'Clear postal code selection',
    clearCoOrganizersAccessibilityLabel: 'Clear co-organizers selection',

    // Error messages for data loading
    postalCodeLoadError: 'Failed to load postal codes. Please try again.',
    permissionRequired: 'Permission Required',
    photoPermissionMessage: 'Please grant photo library access to add images to your event.',
    imagePickerError: 'Failed to select image. Please try again.',
    missingFieldsError: 'Please fill in the following required fields: {{fields}}',
  },

  // ============================================
  // My Events - User's created events
  // ============================================
  myEvents: {
    // Tabs
    upcoming: 'Upcoming',
    past: 'Past',
    all: 'All Events',

    // Empty States
    emptyUpcoming: 'No Upcoming Events',
    emptyUpcomingMessage: "You haven't created any upcoming events yet.",
    emptyPast: 'No Past Events',
    emptyPastMessage: "You don't have any past events.",
    emptyAll: 'No Events',
    emptyAllMessage: "You haven't created any events yet. Create your first event to get started!",

    // List Headers
    listHeaderUpcoming: 'Your Upcoming Events',
    listHeaderPast: 'Your Past Events',
    listHeaderAll: 'All Your Events',

    // Subtitles
    eventsScheduled: '{{count}} events scheduled',
    completedEvents: '{{count}} completed events',
  },

  // ============================================
  // Templates - Event template management
  // ============================================
  templates: {
    title: 'Event Templates',
    emptyTitle: 'No Templates Yet',
    emptyDescription:
      'Create reusable event templates to save time when organizing similar events.',
    createButton: 'Create Template',
    fromPastEvent: 'Create from Past Event',
    editTemplate: 'Edit Template',
    deleteTemplate: 'Delete Template',
    useTemplate: 'Use Template',
    confirmDelete: 'Are you sure you want to delete this template? This action cannot be undone.',
    // Additional keys for event-templates screen
    noTemplatesAvailable: 'No templates available',
    selectionEmptyDescription:
      "You don't have any templates yet. Create one now to speed up your event creation.",
    createNewTemplate: 'Create new Template',
    loadingTemplates: 'Loading templates',
    loadError: 'Failed to load templates',
    chooseTemplate: 'Choose a Template',
    loadingTemplate: 'Loading template...',
  },

  // ============================================
  // Account - Account management
  // ============================================
  account: {
    title: 'Account Details',
    fullName: 'Full Name',
    email: 'Email',
    status: 'Status',
    accountStatus: 'Account Status',
    verified: 'Verified',
    unverified: 'Unverified',

    // Organization & Role
    organization: 'Organization',
    role: 'Role',
    roleOwner: 'Owner',
    roleMember: 'Member',
    roleAdmin: 'Admin',

    // Delete Account
    deleteTitle: 'Delete my account',
    deleteWarning: 'Deleting your account will:',
    deleteWarningItems: {
      loginInfo: 'Delete your log in info',
      accountInfo: 'Delete your account info',
      eventsData: 'Delete all your events data',
      images: 'Delete all images/photos of your events',
    },
    deleteConfirmation: 'Enter your email to confirm',
    deletePasswordConfirmation: 'Enter your password to confirm',
    confirmButton: 'Delete my account',
    enterEmailConfirm: 'Please enter your email to confirm',
    incorrectEmail: 'Incorrect email. Please try again',
    incorrectPassword: 'Incorrect password. Please try again.',
    passwordRequired: 'Please enter your password to confirm',
    deleteSuccess: 'Account deleted successfully',
  },

  // ============================================
  // Errors - Error messages
  // ============================================
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network error. Please check your internet connection.',
    notFound: 'The requested resource was not found.',
    unauthorized: 'You are not authorized to perform this action.',
    forbidden: 'Access forbidden.',
    serverError: 'Server error. Please try again later.',
    timeout: 'Request timed out. Please try again.',
    validation: 'Please check your input and try again.',
    permissionDenied: 'Permission denied.',
    unknownError: 'An unknown error occurred.',
    organizationsLoadFailed: 'Failed to load organizations. Please try again.',
    rateLimit: {
      title: 'Too Many Requests',
      message: 'You have made too many requests. Please wait a moment and try again.',
      loginMessage: 'Too many login attempts. Please wait 15 minutes before trying again.',
      forgotPasswordMessage:
        'Too many password reset requests. Please wait an hour before trying again.',
      deleteAccountMessage:
        'Too many account deletion attempts. Please wait an hour before trying again.',
      accountLockedMessage: 'Too many failed login attempts. Please try again later.',
    },
  },

  // ============================================
  // Alerts - Success/error alerts for operations
  // ============================================
  alerts: {
    eventCreated: 'Event created successfully!',
    eventUpdated: 'Event updated successfully!',
    eventDeleted: '"{{name}}" deleted successfully',
    eventDeleteError: 'Failed to delete event. Please try again.',
    templateCreated: 'Template created successfully!',
    templateDeleted: 'Template deleted successfully',
    templateDeleteError: 'Failed to delete template. Please try again.',
    settingsSaved: 'Settings saved successfully',
    settingsSaveError: 'Failed to save settings. Please try again.',
    networkError: 'Network error. Please check your connection and try again.',
    unknownError: 'An unexpected error occurred. Please try again.',
    fakeEventCreated: 'Fake event created successfully!',
    feedbackFormError: 'Cannot open feedback form',
    feedbackFormOpenError: 'Failed to open feedback form',
  },

  // ============================================
  // Calendar - Calendar integration
  // ============================================
  calendar: {
    permissionsNotGranted: 'Calendar Permissions Required',
    permissionsMessage:
      'ProtestBase needs access to your calendar to add events. Please grant calendar permissions in your device settings.',
    addSuccess: 'Event added to your calendar successfully',
    addError: 'Failed to add event to calendar. Please try again.',
    openError: 'Unable to open calendar. Please try again.',
    eventSaved: 'Event saved successfully!',
  },

  // ============================================
  // Help - Help needed section
  // ============================================
  help: {
    title: 'Help Needed',
    subtitle: 'The organizer is looking for volunteers to help with this event',
    volunteerNeeded: 'Volunteers Needed',
    whatsNeeded: "What's Needed",
    noDetails: 'No additional details provided. Please contact the organizer for more information.',
    gotIt: 'Got It',
  },

  // ============================================
  // Search - Search functionality
  // ============================================
  search: {
    placeholder: 'Search events...',
    noResults: 'No results found',
    recentSearches: 'Recent Searches',
    clearRecent: 'Clear Recent',
  },

  // ============================================
  // Session - Session management
  // ============================================
  session: {
    expired: 'Session Expired',
    expiredMessage: 'Your session has expired. Please sign in again to continue.',
    signInAgain: 'Sign In Again',
    securityAlert: 'Security Alert',
    securityAlertMessage: 'Your session was terminated for security reasons. Please sign in again.',
    signedInElsewhere: 'Signed In on Another Device',
    signedInElsewhereMessage:
      'Your account was signed in on another device. For security, only one active session is allowed at a time.',
  },

  // ============================================
  // About - About ProtestBase
  // ============================================
  about: {
    thankYou: 'Thank you for downloading ProtestBase, the protest calendar!',
    appDescription: 'ProtestBase is a calendar app designed to help:',
    helpActivists: 'Activists find protests, strikes and workshops easily and securely.',
    helpOrganizations: 'Organisations keep their activists up to date with the latest event info.',
    howToJoin: 'How do I join as an organisation?',
    howToJoinDescription: 'If you are part of an organisation, you can fill in the',
    onboardingForm: 'onboarding form',
    howToJoinDescriptionContinued:
      'and we will contact you to start the onboarding process - we will need to verify that you have permission from the organisation to create a ProtestBase account. Once your account is approved, you can freely add events to the ProtestBase calendar.',
    feedbackMatters: 'Your Feedback Matters',
    feedbackDescriptionStart:
      'We would love to hear from you! If you have ideas, suggestions, or spot any issues, please use',
    feedbackForm: 'our feedback form.',
    feedbackDescriptionEnd: 'Your input will help shape the future of ProtestBase.',
    privacyPriority: 'Your Privacy is Our Priority',
    privacyOrganizations:
      'For Organisations: We only keep your account info and event data. We do not share your data with third parties, and we never will.',
    privacyUsers:
      'For Users: We are not collecting any personal data from users who do not log in. Any data you save (like your protest calendar) is stored locally on your phone and belongs to you.',
    aboutCreators: 'About the creators',
    creatorsDescription:
      "ProtestBase was founded by two Brussels-based activists who believe in the power of collective action. Even if we're all protesting for different things, our struggles are all connected and by empowering each other, we can change the world.",
    joinUs: 'Join Us in Building a Better ProtestBase',
    joinUsDescription:
      "Together, we can create a tool that supports protest, fosters community, and upholds our democratic rights and values. Thank you for being part of the ProtestBase community. Let's make collective action more accessible and impactful!",
  },

  // ============================================
  // Report - Report event functionality
  // ============================================
  report: {
    title: 'Report Event',
    description:
      "Please describe why you're reporting this event. We review all reports carefully to maintain a safe and respectful community.",
    placeholder: 'Describe the issue...',
    submitButton: 'Submit Report',
    success: "Thank you for your report. We'll review it as soon as possible.",
    underConstruction: 'This feature is currently under construction. Please check back later.',
  },

  // ============================================
  // Version - App version management
  // ============================================
  version: {
    updateRequired: {
      title: 'Update Required',
      message:
        'A new version of ProtestBase is available. Please update to continue using the app.',
      button: 'Update Now',
    },
    updatePrompt: {
      title: 'Update Available',
      message: 'A new version of ProtestBase is available with improvements and new features.',
      updateButton: 'Update',
      laterButton: 'Later',
    },
    maintenance: {
      title: 'Under Maintenance',
      titlePrefix: "We'll be ",
      titleHighlight: 'right back',
      message:
        "ProtestBase is temporarily unavailable because we're improving the security of our data and services. Hang tight, we'll be back before you can finish your protest sign.",
      badge: 'Back soon',
    },
    connectionError: {
      title: 'Connection Problem',
      message:
        "We couldn't reach the ProtestBase servers. Please check your internet connection and try again.",
      button: 'Try Again',
      badge: 'Check your connection',
    },
  },

  // ============================================
  // Integrity - App integrity / install attestation
  // ============================================
  integrity: {
    failed: {
      title: "We couldn't verify this app",
      message:
        "ProtestBase couldn't confirm that this device is running a genuine, unmodified version of the app. This usually happens on rooted devices, sideloaded installs, or unsupported emulators.",
      button: 'Try Again',
      badge: 'Verification failed',
    },
    retryable: {
      title: 'Temporary verification issue',
      message:
        "We couldn't finish verifying this device. This is usually temporary — please try again in a moment.",
      button: 'Try Again',
      badge: 'Verification issue',
    },
    deviceStateUnsupported: {
      title: 'Device security state not supported',
      message:
        "ProtestBase can't run on devices with an unlocked bootloader, an unverified OS, or expired or revoked device certificates. If you believe this is an error, please reach out to us.",
      badge: 'Device blocked',
    },
    appConfig: {
      title: 'App configuration issue',
      message:
        'Something about this install is misconfigured — most often this means the app needs to be reinstalled from the official store. Please uninstall and reinstall ProtestBase, then try again.',
      badge: 'Reinstall required',
    },
    devSetup: {
      title: 'Developer setup needed',
      message:
        'EXPO_PUBLIC_DEV_INTEGRITY_BYPASS is missing from your local environment. Add it to .env.local with the value used by the backend, then restart Metro.',
      button: 'Try Again',
      badge: 'Setup required',
    },
    unsupportedDevice: {
      title: 'This device is not supported',
      message:
        "ProtestBase relies on hardware security features that aren't available on this device. iOS 14 or Android 9 (or newer) is required.",
      badge: 'Device not supported',
    },
  },

  // ============================================
  // Form - Form validation & messages
  // ============================================
  form: {
    required: 'This field is required',
    optional: 'Optional',
    invalidFormat: 'Invalid format',
    tooShort: 'This field is too short',
    tooLong: 'This field is too long',
    selectOption: 'Please select an option',
  },

  // ============================================
  // Become Organizer - Organizer application
  // ============================================
  becomeOrganizer: {
    title: 'Become an Organizer',
    descriptionStart: 'Want to organize and promote your own events? Fill out our',
    applicationForm: 'application form',
    descriptionEnd: 'to get started.',
    createEventRequirement: 'You need to be part of an organization to create events.',
  },

  // ============================================
  // Terms and Conditions
  // ============================================
  termsAndConditions: {
    title: 'Terms and Conditions for ProtestBase',
    lastUpdated: 'Last Updated: 21/04/2025',

    // Introduction
    intro1:
      'Welcome to ProtestBase! We\'re thrilled to have you here. These Terms and Conditions ("Terms") govern your use of ProtestBase, a protest calendar app. The app is designed to make it easy for you to find protests and the organisations that organise them. By using the App, you agree to these Terms. If you don\'t agree, please refrain from using the App.',
    intro2:
      "Our mission is to support peaceful protest and collective action, and we're committed to creating a safe, welcoming, and cheerful space for everyone. Let's dive in!",

    // Section 1: Acceptance of Terms
    section1Title: '1. Acceptance of Terms',
    section1Intro: 'By using ProtestBase, you confirm that you meet the following requirements:',
    section1Bullet1:
      'If you are under the age of 16, you have reviewed these Terms with a parent or guardian and obtained their consent.',
    section1Bullet2:
      'If you are creating an account as an organisation, you are at least 18 years old & have the legal authority and permission to represent your organisation.',

    // Section 2: Your Rights as an EU Citizen
    section2Title: '2. Your Rights as an EU Citizen',
    section2Intro:
      'At ProtestBase, we stand firmly behind the democratic right to protest. As an EU citizen, you are protected by the following rights under the EU Charter of Fundamental Rights:',
    section2Article11Title: 'Article 11: Freedom of Expression and Information',
    section2Article11Text:
      'Everyone has the right to freedom of expression. This includes the freedom to hold opinions and to receive and impart information and ideas without interference by public authority and regardless of frontiers.',
    section2Article12Title: 'Article 12: Freedom of Assembly and Association',
    section2Article12Text:
      'Everyone has the right to freedom of peaceful assembly and association at all levels, particularly in political, trade union, and civic matters. This includes the right to form and join trade unions for the protection of interests.',
    section2Conclusion:
      'ProtestBase is designed to support these rights by helping users find and participate in peaceful protests. We believe in the power of collective action and strive to make protest accessible to all.',

    // Section 3: For Users (Without Log-In)
    section3Title: '3. For Users (Without Log-In)',
    section3Intro:
      "If you're using ProtestBase as a guest (without logging in), here's what you need to know:",
    section3_1Title: '3.1. Data Privacy',
    section3_1Bullet1:
      'We respect your privacy. We do not collect any personal data from users who do not log in.',
    section3_1Bullet2:
      'Any protests you save or interact with will only be stored locally on your device.',
    section3_2Title: '3.2. Reporting Events or Organisations',
    section3_2Bullet1:
      'If you come across an event or organisation that violates local laws or organises unsafe events, you can report it directly through the App.',
    section3_2Bullet2:
      'We will review all reports and take appropriate action, which may include removing the event or organisation from the App.',
    section3_3Title: '3.3. Your Responsibility',
    section3_3Bullet1:
      'While we strive to provide accurate and up-to-date information, ProtestBase cannot guarantee the safety or legality of any event listed on the App.',
    section3_3Bullet2:
      'It is your responsibility to ensure that your participation in any protest is lawful and safe for yourself and those around you.',

    // Section 4: For Organisations (With Log-In)
    section4Title: '4. For Organisations (With Log-In)',
    section4Intro:
      "If you're an organisation using ProtestBase to promote your events, here's what applies to you:",
    section4_1Title: '4.1. Account Registration',
    section4_1Bullet1: 'To post events on ProtestBase, you must apply for a log-in.',
    section4_1Bullet2:
      'You must be at least 18 years old or have the legal authority to represent your organisation.',
    section4_1Bullet3:
      'We may request additional information to verify that your organisation is legitimate.',
    section4_2Title: '4.2. Data Privacy for Organisations',
    section4_2Bullet1:
      'Unlike guest users, organisations do not have the same level of privacy because we need to verify your identity and ensure the legitimacy of your organisation.',
    section4_2Bullet2:
      'By creating an account, you agree to provide accurate and up-to-date information about your organisation.',
    section4_3Title: '4.3. Responsibility for Content',
    section4_3Bullet1:
      'You are solely responsible for the content you post on ProtestBase, including event details, descriptions, and any linked materials.',
    section4_3Bullet2: 'You agree not to post content that:',
    section4_3Nested1: 'Violates local laws or promotes violence.',
    section4_3Nested2: 'Is false, misleading, or harmful.',
    section4_3Nested3: 'Infringes on the rights of others.',
    section4_3Bullet3:
      'This includes the promotion of racism, zionism, supremacy, sectarianism, neoliberalism, colonialism, imperialism or cults. ProtestBase wants to unite the people around societal issues, not divide them.',
    section4_4Title: '4.4. Ensuring Safety',
    section4_4Bullet1:
      'As an organiser, you have a duty to ensure the safety of protesters at your events.',
    section4_4Bullet2: 'This includes:',
    section4_4Nested1:
      "Providing clear information about the event's purpose, location, and safety measures.",
    section4_4Nested2: 'Complying with all applicable laws and regulations.',
    section4_4Nested3: 'Taking steps to minimise risks and ensure a peaceful environment.',

    // Section 5: Disclaimer of Responsibility
    section5Title: '5. Disclaimer of Responsibility',
    section5Intro:
      'ProtestBase is a platform for discovering and promoting protests, but we cannot be held responsible for:',
    section5Bullet1: 'The actions of individuals or organisations using the App.',
    section5Bullet2:
      'Any harm, injury, or legal issues that arise from participating in or organising a protest.',
    section5Bullet3: 'The accuracy or legality of events listed on the App.',
    section5Conclusion: 'By using ProtestBase, you acknowledge and accept these limitations.',

    // Section 6: Safety First
    section6Title: '6. Safety First',
    section6Intro:
      'We care deeply about the safety of protesters. While we cannot control what happens at events, we encourage organisers and participants to:',
    section6Bullet1: 'Prioritise peaceful and lawful protest.',
    section6Bullet2: 'Follow local laws and regulations.',
    section6Bullet3: 'Look out for one another and act responsibly.',

    // Section 7: Changes to These Terms
    section7Title: '7. Changes to These Terms',
    section7Text:
      "We may update these Terms from time to time. If we make significant changes, we'll notify you through the App or via email. Your continued use of ProtestBase after the changes take effect means you accept the updated Terms.",

    // Section 8: Governing Law
    section8Title: '8. Governing Law',
    section8Text:
      'These Terms are governed by the laws of the European Union and Belgium. Any disputes arising under these Terms shall be resolved in the courts of Belgium.',

    // Section 9: Contact Us
    section9Title: '9. Contact Us',
    section9Intro: 'If you have any questions or need support, please reach out to us at:',

    // Conclusion
    conclusion:
      'Thank you for using ProtestBase! Together, we can make collective action more accessible, peaceful, and impactful.',
  },

  // ============================================
  // Not Found - 404 screen
  // ============================================
  notFound: {
    headerTitle: 'Oops!',
    title: "This screen doesn't exist.",
    goHome: 'Go to home screen!',
  },

  // ============================================
  // Draft - Event draft management
  // ============================================
  draft: {
    checkingDraft: 'Checking for saved draft...',
    resumeTitle: 'Resume Draft?',
    resumeMessage:
      'You have an unsaved event draft. Would you like to continue where you left off?',
    resumeDraft: 'Resume Draft',
    startFresh: 'Start Fresh',
    closeTitle: 'Unsaved Changes',
    closeMessage: 'You have unsaved changes. What would you like to do?',
    discard: 'Discard',
    saveDraft: 'Save Draft',
    keepEditing: 'Keep Editing',
    saveWarningTitle: 'Auto-Save Issue',
    saveWarningMessage:
      'Your draft could not be saved automatically. Your changes may be lost if you leave this screen. Please try saving manually or check your device storage.',
  },

  // ============================================
  // Drafts - Backend draft events (save-now-publish-later).
  // NOTE: distinct from the `draft` namespace above, which is the local
  // form-autosave / resume feature.
  // ============================================
  drafts: {
    editTitle: 'Edit Draft',
    saveAsDraft: 'Save as draft',
    savedConfirmation: 'Draft saved.',
    save: 'Save draft',
    publish: 'Publish',
    published: 'Event published.',
    publishIssuesTitle: 'Not ready to publish',
    issueDescription: 'Add a description.',
    issueCategory: 'Choose at least one category.',
    issueLocation: 'Add a location (city or street address).',
    issueStartTime: 'Set a start date and time in the future.',
    issueIncomplete: 'Some required information is missing.',
    delete: 'Delete draft',
    deleted: 'Draft deleted.',
    deleteConfirmTitle: 'Delete draft?',
    deleteConfirmMessage: 'This draft will be permanently deleted. This action cannot be undone.',
  },

  // ============================================
  // Share - Event sharing
  // ============================================
  share: {
    cta: 'Join this event on ProtestBase!',
    errorTitle: 'Error',
    eventNotFound: 'Event not found or incomplete data.',
    shareFailed: 'Failed to share event. Please try again.',
  },

  // ============================================
  // Privacy Center - Privacy transparency screen
  // ============================================
  privacyCenter: {
    // Header
    title: 'Your Privacy, Protected',
    subtitle: "For us, privacy is a right, not a feature. Here's how we protect yours.",

    // What we don't collect section
    notCollectedTitle: "What We Don't Collect",
    noIpAddresses: "IP addresses - we don't log your connection",
    noTrackingCookies: 'Tracking cookies - zero analytics, zero fingerprinting',
    noPersonalData: 'Personal data - no account needed',
    noBehavioralData: "Behavioral data - we don't know what you view or save",

    // What stays on device section
    onDeviceTitle: 'What Stays on Your Phone',
    onDeviceDescription:
      'When you save an event or set your preferences, that data stays on your phone. We never see it, store it, or sync it.',
    viewCounterNote: 'The view counter? Completely anonymous, no info about you.',

    // Where we operate section
    locationTitle: 'Where We Operate',
    locationDescription: 'Our servers are located in Europe and are fully GDPR compliant.',

    // Transparency section
    transparencyTitle: 'Transparency',
    transparencyDescription:
      'Our source code is publicly available so you can check everything yourself. Trust, but verify.',

    // For organizations section
    forOrgsTitle: 'For Organizations',
    forOrgsDescription:
      'Got an org account to manage events? We keep track of your logins (standard security). Everything above applies to users without accounts.',

    // Permissions section
    permissionsTitle: 'App Permissions',
    permissionsDescription: 'ProtestBase only asks for permissions when needed:',
    photoReadPermission: 'Photos (Read)',
    photoReadDescription: 'To add images to events you create',
    calendarPermission: 'Calendar',
    calendarDescription: 'To add events to your calendar',

    // Permission status labels
    statusGranted: 'Allowed',
    statusDenied: 'Denied',
    statusUndetermined: 'Not requested yet',
    openSettings: 'Open Settings',
    manageAllPermissions: 'Manage permissions in Settings',
  },

  // ============================================
  // Privacy Info Modal - Saved events privacy info
  // ============================================
  privacyInfo: {
    title: 'Your Privacy Matters',
    subtitle: "Here's how we protect your data when you save events",
    localTitle: 'Stored Locally Only',
    localBody:
      'All saved events are stored exclusively on your device. We never upload your saved events to our servers.',
    anonymousTitle: 'Completely Anonymous',
    anonymousBody:
      'We track the total number of saves for each event, but we never know who saved what. Your activity is 100% private.',
    noAccountTitle: 'No Account Required',
    noAccountBody:
      'Browse and save events without creating an account. Your data stays with you, always.',
    gotIt: 'Got It',
    closeAccessibility: 'Close privacy information',
  },

  // ============================================
  // Permissions - Pre-permission dialogs
  // ============================================
  permissions: {
    photoLibraryPreTitle: 'Add Event Image',
    photoLibraryPreMessage:
      'ProtestBase needs access to your photo library to add images to your events. Your photos stay on your device.',
    calendarPreTitle: 'Add to Calendar',
    calendarPreMessage:
      'ProtestBase needs calendar access to add this event. We cannot see your other calendar events.',
    photoSavePreTitle: 'Save Event Image',
    photoSavePreMessage: 'ProtestBase needs access to save this image to your photo library.',
    allowAccess: 'Allow Access',
    notNow: 'Not Now',
  },
};

// Export as default and named export
export default en;
export { en };
