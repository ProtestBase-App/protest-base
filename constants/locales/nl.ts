/**
 * Dutch (Belgium) Translation File
 *
 * Comprehensive translations for all app namespaces.
 * Structure matches the English translation file.
 */

const nl = {
  // ============================================
  // Tabs - Bottom tab bar labels
  // ============================================
  tabs: {
    home: 'Kalender',
    explore: 'Ontdekken',
    map: 'Kaart',
    more: 'Meer',
  },

  // ============================================
  // Maps - Map tab (events on a map)
  // ============================================
  maps: {
    title: 'Kaart',
    actionCount: {
      one: '1 actie',
      other: '{{count}} acties',
    },
    actionCountNone: 'Geen acties',
    timeAll: 'Alles',
    timeToday: 'Vandaag',
    timeWeek: '7 dagen',
    today: 'Vandaag',
    actionType: 'Soort actie',
    country: 'Land',
    countryAll: 'Alle',
    postalCode: 'Postcode',
    searchPostalCode: 'Zoek een postcode...',
    filterApplyCount: {
      one: 'Bekijk 1 actie',
      other: 'Bekijk {{count}} acties',
    },
    filterApplyNone: 'Geen resultaten',
    emptyTitle: 'Geen acties met deze filters',
    resetFilters: 'Filters herstellen',
    mapUnavailable: 'De kaart is niet beschikbaar op dit apparaat',
    zoomIn: 'Inzoomen',
    zoomOut: 'Uitzoomen',
  },

  // ============================================
  // Filters - Filter screens and options
  // ============================================
  filters: {
    title: 'Filters',
    location: 'Locatie',
    date: 'Datum',
    organization: 'Organisatie',
    category: 'Categorie',
    today: 'Vandaag',
    tomorrow: 'Morgen',
    thisWeek: 'Deze week',
    thisWeekend: 'Dit weekend',
    thisMonth: 'Deze maand',
    confirmFilters: 'Filters bevestigen',
    searchPlaceholder: 'Typ minstens 2 tekens om te zoeken...',
    searchOrganizations: 'Zoek organisaties...',
    postalCodesCount: '{{count}} postcodes',
    selectionTooBroad: 'Selectie te breed — kies minder of kleinere gebieden.',
  },

  // ============================================
  // Categories - Event categories
  // ============================================
  categories: {
    all: 'Alle',
    protest: 'Protest',
    act: 'Actie',
    learn: 'Leren',
    support: 'Steun',
    strike: 'Staking',
    climateAction: 'Klimaatactie',
    socialJustice: 'Sociale rechtvaardigheid',
    humanRights: 'Mensenrechten',
    antiWar: 'Anti-oorlog',
    labor: 'Arbeid',
    education: 'Onderwijs',
    healthcare: 'Gezondheidszorg',
    housing: 'Huisvesting',
    democracy: 'Democratie',
    environment: 'Milieu',
    animalRights: 'Dierenrechten',
    immigration: 'Immigratie',
    gender: 'Gender',
    lgbtq: 'LGBTQ+',
    antiRacism: 'Anti-racisme',
    other: 'Andere',
  },

  // ============================================
  // Common translations used across the app
  // ============================================
  common: {
    ok: 'OK',
    cancel: 'Annuleren',
    save: 'Opslaan',
    delete: 'Verwijderen',
    loading: 'Laden...',
    loadingCurrentWord: 'Laden. Huidig woord: {{word}}',
    error: 'Fout',
    success: 'Gelukt',
    back: 'Terug',
    next: 'Volgende',
    done: 'Klaar',
    close: 'Sluiten',
    confirm: 'Bevestigen',
    yes: 'Ja',
    no: 'Nee',
    required: 'Verplicht',
    optional: 'Optioneel',
    search: 'Zoeken',
    filter: 'Filteren',
    clear: 'Wissen',
    clearAll: 'Alles wissen',
    apply: 'Toepassen',
    reset: 'Herstellen',
    refresh: 'Vernieuwen',
    retry: 'Opnieuw proberen',
    submit: 'Verzenden',
    edit: 'Bewerken',
    create: 'Aanmaken',
    update: 'Bijwerken',
    view: 'Bekijken',
    share: 'Delen',
    report: 'Melden',
    help: 'Hulp',
    continue: 'Doorgaan',
    skip: 'Overslaan',
    welcome: 'Welkom',
    subtitle: 'Ontdek en organiseer protesten',
    tryAgain: 'Opnieuw proberen',
    seeAll: 'Alles bekijken',
    viewAll: 'Alles bekijken',
    learnMore: 'Meer informatie',
    getStarted: 'Aan de slag',
    goBack: 'Terug',
    dismiss: 'Sluiten',
    noResultsFound: 'Geen resultaten gevonden',
    tryAdjustingSearch: 'Probeer je zoekopdracht aan te passen',
    invalidDateError: 'Ongeldige datum. Kan niet aan agenda toevoegen.',
  },

  // ============================================
  // Template - Event template management
  // ============================================
  template: {
    // Titles
    createTitle: 'Sjabloon aanmaken',
    createFromEventTitle: 'Sjabloon aanmaken van evenement',
    editTitle: 'Sjabloon bewerken',

    // Subtitles and descriptions
    createSubtitle:
      'Sla je evenementdetails op als herbruikbaar sjabloon om toekomstige evenementen sneller aan te maken.',
    eventDetailsSection: 'Evenementdetails om op te slaan',
    eventDetailsHelper:
      'Vul de evenementdetails in die je wilt hergebruiken. Alle velden zijn optioneel.',

    // Field labels
    nameLabel: 'Sjabloonnaam *',
    descriptionLabel: 'Sjabloonbeschrijving (Optioneel)',
    namePlaceholder: 'Geef je sjabloon een naam (bv. Maandelijkse bijeenkomst)',
    descriptionPlaceholder: 'Waar is dit sjabloon voor?',

    // Buttons
    saveButton: 'Sjabloon opslaan',
    deleteButton: 'Sjabloon verwijderen',

    // Success messages
    createdSuccess: 'Sjabloon succesvol opgeslagen!',
    updatedSuccess: 'Sjabloon succesvol bijgewerkt!',
    deletedSuccess: 'Sjabloon succesvol verwijderd!',

    // Error messages
    nameMissing: 'Voer een sjabloonnaam in.',
    volunteerDescMissing: 'Beschrijf hoe vrijwilligers kunnen helpen.',

    // Delete confirmation
    deleteConfirmTitle: 'Sjabloon verwijderen',
    deleteConfirmMessage:
      'Weet je zeker dat je "{{name}}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.',

    // Loading states
    deleting: 'Sjabloon verwijderen...',
  },

  // ============================================
  // Create Event Options
  // ============================================
  createEventOptions: {
    blankTitle: 'Plan een nieuwe actie',
    blankSubtitle: 'Maak een nieuw evenement met een leeg formulier',
    templateTitle: 'Gebruik een sjabloon',
    templateSubtitle: 'Vooraf invullen met opgeslagen evenementdetails',
    footer: 'Sjablonen besparen tijd voor terugkerende evenementen met vergelijkbare details.',
  },

  // ============================================
  // Event Edit
  // ============================================
  eventEdit: {
    title: 'Evenement bewerken',
    successMessage: 'Evenement succesvol bewerkt!',
    mandatoryFieldsError: 'Vul alle verplichte velden in.',
    invalidTimeRangeError: 'Eindtijd kan niet vóór de starttijd liggen',
    closeAccessibilityLabel: 'Sluit evenement bewerken scherm',
  },

  // ============================================
  // Authentication & Authorization
  // ============================================
  auth: {
    signIn: 'Inloggen',
    signOut: 'Afmelden',
    signUp: 'Registreren',
    email: 'E-mail',
    password: 'Wachtwoord',
    forgotPassword: 'Wachtwoord vergeten?',
    resetPassword: 'Wachtwoord herstellen',
    emailPlaceholder: 'Voer je e-mail in',
    passwordPlaceholder: 'Voer je wachtwoord in',
    signInButton: 'Aanmelden',
    signInSuccess: 'Succesvol aangemeld',
    signInError: 'Aanmelden mislukt',
    logoutSuccess: 'Succesvol afgemeld',
    logoutError: 'Afmelden mislukt. Probeer het opnieuw.',
    sessionExpired: 'Sessie verlopen',
    invalidCredentials: 'Ongeldige inloggegevens',
    noAccount: 'Heb je geen account?',
    requestAccess: 'Vraag het hier aan',
    greeting: 'Hallo, {{name}}!',
    accountRequired: 'Je moet aangemeld zijn om deze functie te gebruiken',
    loginPrompt: 'Meld je aan om door te gaan',
    fillAllFields: 'Vul alle velden in',
    resetPasswordTitle: 'Wachtwoord herstellen',
    resetPasswordDescription:
      'We sturen je een e-mail met instructies om je wachtwoord te herstellen',
    resetPasswordPlaceholder: 'je.email@voorbeeld.com',
    resetPasswordSend: 'Versturen',
    resetPasswordSending: 'Versturen...',
    resetPasswordSuccess: 'Instructies om je wachtwoord te herstellen zijn verzonden',
    resetPasswordError: 'Het versturen van de instructies is mislukt. Probeer het opnieuw.',
    tryAgainIn: 'Probeer opnieuw over {{seconds}}s',
    resetPasswordCheckEmail: 'Controleer je e-mail',
    resetPasswordHowItWorks: 'Zo werkt het:',
    resetPasswordStep1: '1. Voer hieronder je e-mail in',
    resetPasswordStep2: '2. Controleer je inbox voor een herstelkoppeling',
    resetPasswordStep3:
      '3. Open de koppeling om een nieuw wachtwoord in te stellen op onze website',
    resetPasswordStep4: '4. Kom hier terug en meld je aan',
    resetPasswordSentTo: 'We hebben een herstelkoppeling gestuurd naar:',
    resetPasswordNextSteps:
      'Open de koppeling om een nieuw wachtwoord in te stellen op onze website. Kom daarna hier terug en meld je aan.',
    resetPasswordCheckSpam: 'Niet ontvangen? Controleer je spammap.',
    resetPasswordGotIt: 'Begrepen',
    firstTimeLogin: 'Eerste keer inloggen?',
    firstTimeTitle: 'Stel je wachtwoord in',
    firstTimeHowItWorks: 'Zo ga je van start:',
    firstTimeStep1: '1. Voer hieronder het e-mailadres in dat aan je account is gekoppeld',
    firstTimeStep2: '2. Controleer je inbox voor een koppeling om je wachtwoord in te stellen',
    firstTimeStep3: '3. Open de koppeling om je wachtwoord aan te maken op onze website',
    firstTimeStep4: '4. Kom hier terug en meld je aan',
    firstTimeSentTo: 'We hebben een koppeling om je wachtwoord in te stellen gestuurd naar:',
    firstTimeNextSteps:
      'Open de koppeling om je wachtwoord aan te maken op onze website. Kom daarna hier terug en meld je aan.',
    migrationBannerTitle: 'Wachtwoord opnieuw instellen vereist',
    migrationBannerMessage:
      'We hebben onlangs onze systemen gemigreerd om de beveiliging te verbeteren. Je vorige wachtwoord werkt niet meer.',
    migrationBannerAction: 'Wachtwoord herstellen',
  },

  // ============================================
  // Home / My Calendar Screen
  // ============================================
  home: {
    refreshFailed: 'Vernieuwen mislukt',
    refreshFailedMessage: 'Kan evenementen niet vernieuwen. Controleer je verbinding.',
    viewToggleMonth: 'Maand',
    viewToggleAgenda: 'Agenda',
    dayEventCount: {
      one: '1 protest',
      other: '{{count}} protesten',
    },
    emptyDayTitle: 'Geen protesten op deze dag',
    emptyFilteredTitle: 'Geen resultaten met deze filters',
    nextEventPill: 'Volgende: {{date}}',
    multiDayBadge: {
      one: '{{count}} dag',
      other: '{{count}} dagen',
    },
    dayProgress: 'Dag {{index}}/{{total}}',
    inProgressBadge: 'Bezig',
    going: 'gaan',
    typesCount: '{{count}} types',
    savedOnlyTitle: 'Alleen opgeslagen',
    savedOnlySubtitle: 'Mijn persoonlijke kalender',
    savedChip: 'Opgeslagen',
    helpNeededSubtitle: 'Acties die vrijwilligers zoeken',
    filterApplyCount: {
      one: 'Bekijk 1 protest',
      other: 'Bekijk {{count}} protesten',
    },
    filterApplyNone: 'Geen resultaten',
    openFilters: 'Filters openen',
    previousMonth: 'Vorige maand',
    nextMonth: 'Volgende maand',
  },

  // ============================================
  // Explore / Discovery Screen
  // ============================================
  explore: {
    title: 'Verkennen',
    searchPlaceholder: 'Zoek een protest',
    noResults: 'Geen resultaten',
    noResultsMessage: 'Geen evenementen gevonden voor je zoekopdracht',
    filterButton: 'Filters',
    applyFilters: 'Filters toepassen',
    clearFilters: 'Filters wissen',
    resultsCount: {
      one: '{{count}} evenement gevonden',
      other: '{{count}} evenementen gevonden',
    },
    loadingMore: 'Meer laden...',
    endOfResults: 'Einde van resultaten',
    pullToRefresh: 'Trek om te vernieuwen',
    refreshing: 'Vernieuwen...',
    refreshFailed: 'Vernieuwen mislukt',
    refreshFailedMessage:
      'Kan evenementen niet vernieuwen. Controleer je verbinding en probeer het opnieuw.',
    saveError: 'Kan opgeslagen evenementen niet bijwerken. Probeer het opnieuw.',
    emptyTitle: 'Nog niets gepland',
    emptySubtitle:
      'Organisatoren hebben nog geen aankomende evenementen aangemaakt. Kom snel terug!',
  },

  // ============================================
  // More Tab (Hub)
  // ============================================
  more: {
    title: 'Meer',
    resources: 'Bronnen',
    account: 'Account',
    settings: 'Instellingen',
    devTools: 'Ontwikkeltools',
    createEvent: 'Evenement aanmaken',
    createNewEvent: 'Nieuw evenement aanmaken',
    myEvents: 'Mijn evenementen',
    draftEvents: 'Concept-evenementen',
    draftEventsEmpty: 'Nog geen concept-evenementen',
    eventTemplates: 'Evenementsjablonen',
    becomeOrganizer: 'Word organisator',
    giveFeedback: 'Feedback geven',
    about: 'Over',
    termsAndConditions: 'Algemene voorwaarden',
    termsPrivacy: 'Voorwaarden en privacy',
    accountInfo: 'Accountgegevens',
    deleteAccount: 'Account verwijderen',
    logout: 'Afmelden',
    createFakeEventDev: 'Nep evenement aanmaken (Dev)',
    creating: 'Aanmaken...',
    feedback: 'Feedback geven',
    help: 'Hulp',
    version: 'Versie',

    // Organizer hub (More tab redesign)
    upcoming: 'Aankomend',
    past: 'Afgelopen',
    drafts: 'Concepten',
    templates: 'Sjablonen',
    identitySubtitleOrganizer: 'Organisator · Account en profiel',
    identitySubtitle: 'Account en profiel',
    becomeOrganizerBody:
      'Creëer acties, mobiliseer supporters en beheer je evenementen — gratis voor grassroots-organisaties.',
    alreadyOrganizing: 'Al organisator?',
    signIn: 'Inloggen',
    logoutConfirmTitle: 'Afmelden',
    logoutConfirmMessage: 'Weet je zeker dat je je wilt afmelden?',
    versionLabel: 'Protestbase v{{version}}',

    // Alerts
    logoutSuccess: 'Je bent succesvol afgemeld.',
    logoutError: 'Afmelden mislukt. Probeer het opnieuw.',
    privacyCenter: 'Privacycentrum',
  },

  // ============================================
  // Event Details & Display
  // ============================================
  events: {
    title: 'Titel',
    viewImage: 'Bekijk afbeelding van evenement',
    description: 'Beschrijving',
    date: 'Datum',
    time: 'Tijd',
    location: 'Locatie',
    organizer: 'Organisator',
    organizedBy: 'Georganiseerd door',
    organizers: 'Organisatoren',
    category: 'Categorie',
    waysToHelp: 'Manieren om te helpen',
    coOrganizers: 'Mede-organisatoren',
    attention: 'Opgelet',
    moreInfo: 'Meer info',
    save: 'Opslaan',
    saved: 'Opgeslagen',
    unsave: 'Verwijderen',
    share: 'Delen',
    addToCalendar: 'Toevoegen aan kalender',
    getDirections: 'Routebeschrijving',
    viewOnMap: 'Bekijk op kaart',
    eventDetails: 'Evenementdetails',
    attending: 'Deelnemers',
    attendees: {
      one: '{{count}} deelnemer',
      other: '{{count}} deelnemers',
    },
    startTime: 'Starttijd',
    endTime: 'Eindtijd',
    duration: 'Duur',
    createdBy: 'Aangemaakt door',
    lastUpdated: 'Laatst bijgewerkt',
    eventImage: 'Evenementafbeelding',
    noImage: 'Geen afbeelding',
    shareEvent: 'Evenement delen',
    reportEvent: 'Evenement melden',
    editEvent: 'Evenement bewerken',
    deleteEvent: 'Evenement verwijderen',
    deleteConfirm: 'Weet je zeker dat je dit evenement wilt verwijderen?',
    deleteSuccess: 'Evenement succesvol verwijderd',
    deleteError: 'Kon evenement niet verwijderen',
    notFound: 'Evenement niet gevonden',
    loadingEvent: 'Evenement laden...',
    past: 'Afgelopen',
    upcoming: 'Aankomend',
    today: 'Vandaag',
    count: {
      one: '{{count}} evenement',
      other: '{{count}} evenementen',
    },

    // Delete
    deleteButton: 'Evenement verwijderen',
    deleteConfirmTitle: 'Evenement verwijderen',
    deleteConfirmMessage:
      'Weet je zeker dat je "{{name}}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.',
    deleting: 'Evenement verwijderen...',

    // Badges & Labels
    views: 'Weergaven',
    helpWanted: 'Hulp gezocht',

    // Redesigned event detail — sticky bar
    saveEvent: 'Opslaan',
    savedEvent: 'Opgeslagen',
    directions: 'Route',
    manage: 'Beheren',
    modifyPill: 'Bewerken',

    // Creator stats banner
    yourEvent: 'UW EVENEMENT',
    viewCount: 'Weergaven',
    savesCount: 'Opgeslagen',

    // Organizer row
    viewProfile: 'Profiel bekijken',

    // Creator action sheet
    editDetails: 'Details bewerken',
    editDetailsDesc: 'Titel, datum, locatie, beschrijving',
    notifyParticipants: 'Deelnemers informeren',
    notifyParticipantsDesc: 'Een update sturen',
    visitorPreview: 'Bezoekersweergave',
    visitorPreviewDesc: 'Zien als een gewone gebruiker',
    cancelEvent: 'Evenement annuleren',
    cancelEventDesc: 'Dit kan niet ongedaan worden gemaakt',
    comingSoon: 'Binnenkort beschikbaar',

    // Cancellation / lifecycle banners
    cancelledBadge: 'Geannuleerd',
    cancelledBanner: 'Dit evenement is geannuleerd',
    cancelledReasonLabel: 'Reden',
    cancelledNoReason: 'Geen reden opgegeven',
    pastBadge: 'Afgelopen evenement',
    cancelConfirmTitle: 'Dit evenement annuleren?',
    cancelConfirmMessage:
      'Het evenement wordt gemarkeerd als geannuleerd. Dit kan niet ongedaan worden gemaakt.',
    cancelAction: 'Evenement annuleren',
    keepActive: 'Evenement behouden',
    cancelSuccess: 'Evenement geannuleerd',
    alreadyCancelled: 'Dit evenement is al geannuleerd.',
    cancelError: 'Het evenement kon niet worden geannuleerd. Probeer opnieuw.',

    // Event detail loading
    detailNotFound: 'Evenement niet gevonden. Mogelijk is het verwijderd.',
    detailNetworkError:
      'Kan de server niet bereiken. Controleer je internetverbinding en probeer opnieuw.',
    detailLoadError: 'Het evenement kon niet worden geladen. Probeer opnieuw.',

    // Like
    likeEvent: 'Vind ik leuk',
    likedEvent: 'Vind ik leuk',
    likesCount: 'Likes',
  },

  organizer: {
    title: 'Organisator',
    upcomingEvents: 'Komende evenementen',
    seeAll: 'Alle bekijken',
    events: 'Evenementen',
    followers: 'Volgers',
    rating: 'Beoordeling',
    about: 'Over',
    memberSince: 'Lid sinds',
    verifiedOrganizer: 'Geverifieerde organisator',
    follow: 'Volgen',
    following: '✓ Volgend',
    noUpcomingEvents: 'Geen aankomende evenementen',
    report: 'Meld deze organisator',
    followComingSoon: 'Functie binnenkort beschikbaar',

    // Rich profile
    bio: 'Over',
    noBio: 'Nog geen beschrijving beschikbaar.',
    website: 'Website',
    location: 'Locatie',
    members: 'Leden',
    loadError: 'Kon de organisatorgegevens niet laden',
  },

  // ============================================
  // Create/Edit Event Form
  // ============================================
  createEvent: {
    // Organization Selection
    organization: 'Organisatie',
    selectOrganization: 'Selecteer organisatie',
    organizationRequired: 'Selecteer een organisatie',

    // Section Headers
    title: 'Titel',
    editTitle: 'Evenement bewerken',
    basicInformation: 'BASISINFORMATIE',
    dateAndTime: 'DATUM EN TIJD',
    locationSection: 'LOCATIE',
    additionalInfo: 'Aanvullende informatie',
    mediaAndAdditionalDetails: 'MEDIA EN AANVULLENDE DETAILS',
    additionalDetails: 'AANVULLENDE DETAILS',

    // Field Labels
    eventTitle: 'Titel',
    description: 'Beschrijving',
    category: 'Categorie',
    startDate: 'Startdatum',
    startTime: 'Starttijd',
    endDate: 'Einddatum',
    endTime: 'Eindtijd',
    country: 'Land',
    postalCode: 'Postcode',
    streetAddress: 'Adres',
    city: 'Stad',
    helpNeeded: 'Hulp nodig',
    eventImage: 'Evenementafbeelding',
    uploadImage: 'Afbeelding uploaden',
    changeImage: 'Afbeelding wijzigen',
    removeImage: 'Afbeelding verwijderen',
    eventLink: 'Evenementlink',
    coOrganizers: 'Mede-organisatoren',
    volunteering: 'Vrijwilligerswerk',
    volunteerRoles: 'Vrijwilligersrollen en details',
    volunteerNeeded: 'Vrijwilligers nodig',
    volunteerDetails: 'Wat voor vrijwilligers heb je nodig?',
    disclaimer: 'Disclaimer',

    // Placeholders
    titlePlaceholder: 'Titel van het evenement',
    descriptionPlaceholder:
      'Beschrijf je evenement - waar het over gaat, wat te verwachten, wie er moet komen...',
    selectCategory: 'Selecteer een categorie',
    categoryPlaceholder: 'Selecteer een categorie',
    pickDateTime: 'Kies datum/tijd',
    pickStartDateTime: 'Kies startdatum/tijd',
    pickEndDateTime: 'Kies einddatum/tijd',
    countryPlaceholder: 'Selecteer een land',
    selectCountry: 'Selecteer een land',
    postalCodePlaceholder: 'Postcode',
    searchPostalCode: 'Zoek op postcode of gemeente...',
    streetAddressPlaceholder: 'Straat en huisnummer',
    // Address autocomplete
    addressSearchPlaceholder: 'Zoek een adres…',
    addressSearching: 'Zoeken…',
    addressNoResults: 'Geen overeenkomende adressen gevonden',
    addressError: 'Adressen zoeken mislukt. Probeer opnieuw.',
    addressUnavailable: 'Adres zoeken is momenteel niet beschikbaar. Je kunt nog steeds opslaan.',
    clearStreetAddressAccessibilityLabel: 'Adres wissen',
    cityPlaceholder: 'Stad',
    eventLinkPlaceholder: 'https://www.voorbeeld.com',
    selectCoOrganizers: 'Selecteer mede-organiserende groepen',
    volunteerDetailsPlaceholder: 'Beschrijf welke hulp je nodig hebt...',
    volunteerRolesPlaceholder:
      'Voorbeeld:\n\nMANIEREN OM TE HELPEN\n\n  WATERVERDELING\n    Rol: Water uitdelen.\n    Aankomst: 13:30\n    Ontmoetingspunt: Station B\nGeen aanmelding nodig, kom gewoon langs!',
    disclaimerPlaceholder:
      'Belangrijke veiligheidsinformatie, toegankelijkheidsdetails, wat mee te nemen...',

    // Helper text
    categoryHelper: 'Helpt mensen je evenement te ontdekken via filters',
    endTimeHelper: 'Laat leeg als de duur van het evenement flexibel is',
    locationHelper:
      'Geef een specifieke locatie zodat deelnemers het evenement gemakkelijk kunnen vinden',
    imageHelper: 'Voeg tot 5 afbeeldingen toe — de eerste is de omslagfoto van je evenement',
    eventLinkHelper: 'Deel een link naar je evenementpagina, inschrijfformulier of meer informatie',
    coOrganizersHelper: 'Organisaties die samenwerken aan dit evenement',
    maxCoOrganizers: 'Je kunt maximaal {{max}} mede-organisatoren toevoegen.',
    volunteerHelper: 'Laat vrijwilligers weten hoe ze je evenement kunnen ondersteunen',
    disclaimerHelper:
      'Belangrijke informatie die deelnemers moeten weten (veiligheid, toegankelijkheid, vereisten, etc.)',

    // Checkbox labels
    needHelpCheckbox: 'Ik heb hulp nodig bij dit evenement',

    // Labels
    selected: 'Geselecteerd',
    mainImageBadge: 'Hoofd',

    // Progress & Actions
    requiredFieldsProgress: 'Verplichte velden ingevuld: {{completed}}/{{total}}',
    createButton: 'Evenement aanmaken',
    updateButton: 'Evenement bijwerken',
    cancelButton: 'Annuleren',
    savingEvent: 'Evenement opslaan...',
    updatingEvent: 'Evenement bijwerken...',
    creating: 'Evenement aanmaken...',
    updating: 'Evenement bijwerken...',
    createSuccess: 'Evenement succesvol aangemaakt!',
    updateSuccess: 'Evenement succesvol bijgewerkt!',
    createError: 'Kon evenement niet aanmaken',
    updateError: 'Kon evenement niet bijwerken',

    // Validation Messages
    validationError: 'Gelieve alle verplichte velden in te vullen',
    invalidDate: 'Ongeldige datum of tijd',
    pastDate: 'Evenement kan niet in het verleden starten',
    endBeforeStart: 'Eindtijd moet na starttijd zijn',
    titleRequired: 'Evenementtitel is verplicht',
    descriptionRequired: 'Beschrijving is verplicht',
    categoryRequired: 'Selecteer een categorie',
    startTimeRequired: 'Starttijd is verplicht',

    // Template
    selectFromTemplate: 'Of selecteer uit een sjabloon',
    useTemplate: 'Sjabloon gebruiken',
    selectPastEvent: 'Of kies een eerder evenement',
    usePastEvent: 'Eerder evenement gebruiken',
    templateError: 'Sjabloonfout',
    templateErrorMessage:
      'Kon sjabloongegevens niet laden. Je kunt doorgaan met het maken van je evenement vanaf nul.',
    // Additional validation
    fillMandatoryFields: 'Vul alle verplichte velden in.',
    organizationsLoading: 'Wacht tot de organisaties zijn geladen voordat je indient.',
    invalidUrlFormat: 'Website URL moet beginnen met www., http:// of https://',
    // Accessibility
    closeAccessibilityLabel: 'Sluit evenement aanmaken scherm',
    progressAccessibilityLabel: 'Formuliervoortgang: {{percentage}}% voltooid',
    removeImageAccessibilityLabel: 'Geselecteerde afbeelding verwijderen',
    addImageAccessibilityLabel: 'Een afbeelding toevoegen aan je evenement',
    imageAccessibilityHint: 'Opent fotobibliotheek om een afbeelding te selecteren',
    moveImageLeftAccessibilityLabel: 'Afbeelding naar voren verplaatsen',
    moveImageRightAccessibilityLabel: 'Afbeelding naar achteren verplaatsen',
    clearPostalCodeAccessibilityLabel: 'Postcodeselectie wissen',
    clearCoOrganizersAccessibilityLabel: 'Mede-organisatoren selectie wissen',

    // Error messages for data loading
    postalCodeLoadError: 'Kon postcodes niet laden. Probeer het opnieuw.',
    permissionRequired: 'Toestemming vereist',
    photoPermissionMessage:
      'Geef toegang tot de fotobibliotheek om afbeeldingen aan je evenement toe te voegen.',
    imagePickerError: 'Kon afbeelding niet selecteren. Probeer het opnieuw.',
    maxImagesReached: 'Je kunt maximaal {{max}} afbeeldingen per evenement toevoegen.',
    missingFieldsError: 'Vul de volgende verplichte velden in: {{fields}}',
  },

  // ============================================
  // My Events Management
  // ============================================
  myEvents: {
    title: 'Mijn evenementen',
    upcoming: 'Aankomend',
    past: 'Afgelopen',
    all: 'Alle',
    drafts: 'Concepten',
    emptyUpcoming: 'Geen aankomende evenementen',
    emptyUpcomingMessage: 'Je hebt nog geen aankomende evenementen. Maak er nu een!',
    emptyPast: 'Geen afgelopen evenementen',
    emptyPastMessage: 'Je hebt nog geen afgelopen evenementen.',
    emptyAll: 'Geen evenementen',
    emptyAllMessage: 'Je hebt nog geen evenementen aangemaakt.',
    createFirst: 'Eerste evenement aanmaken',
    loadingEvents: 'Evenementen laden...',
    noEvents: 'Geen evenementen gevonden',
    editEvent: 'Bewerken',
    viewEvent: 'Bekijken',
    deleteEvent: 'Verwijderen',
    duplicateEvent: 'Dupliceren',
    saveAsTemplate: 'Opslaan als sjabloon',

    // List Headers
    listHeaderUpcoming: 'Jouw aankomende evenementen',
    listHeaderPast: 'Jouw afgelopen evenementen',
    listHeaderAll: 'Al jouw evenementen',

    // Subtitles
    eventsScheduled: '{{count}} evenementen gepland',
    completedEvents: '{{count}} voltooide evenementen',
  },

  // ============================================
  // Event Templates
  // ============================================
  templates: {
    title: 'Evenementsjablonen',
    emptyTitle: 'Nog geen sjablonen',
    emptyDescription: 'Maak herbruikbare sjablonen om sneller evenementen aan te maken',
    createButton: 'Sjabloon aanmaken',
    fromPastEvent: 'Van een eerder evenement',
    fromScratch: 'Vanaf nul',
    useTemplate: 'Sjabloon gebruiken',
    editTemplate: 'Sjabloon bewerken',
    deleteTemplate: 'Sjabloon verwijderen',
    deleteConfirm: 'Weet je zeker dat je dit sjabloon wilt verwijderen?',
    deleteSuccess: 'Sjabloon succesvol verwijderd',
    deleteError: 'Kon sjabloon niet verwijderen',
    saveSuccess: 'Sjabloon succesvol opgeslagen',
    saveError: 'Kon sjabloon niet opslaan',
    updateSuccess: 'Sjabloon succesvol bijgewerkt',
    updateError: 'Kon sjabloon niet bijwerken',
    templateName: 'Sjabloonnaam',
    templateNamePlaceholder: 'Voer sjabloonnaam in',
    selectTemplate: 'Selecteer een sjabloon',
    noTemplates: 'Geen sjablonen beschikbaar',
    loadingTemplates: 'Sjablonen laden...',
    createFromEvent: 'Aanmaken van evenement',
    templateSaved: 'Opgeslagen als sjabloon',
    // Additional keys for event-templates screen
    noTemplatesAvailable: 'Geen sjablonen beschikbaar',
    selectionEmptyDescription:
      'Je hebt nog geen sjablonen. Maak er nu een om sneller evenementen aan te maken.',
    createNewTemplate: 'Nieuw sjabloon aanmaken',
    loadError: 'Kon sjablonen niet laden',
    chooseTemplate: 'Kies een sjabloon',
    loadingTemplate: 'Sjabloon laden...',
  },

  // ============================================
  // Account & Settings
  // ============================================
  account: {
    title: 'Accountgegevens',
    fullName: 'Volledige naam',
    email: 'E-mail',
    emailPlaceholder: 'je.email@voorbeeld.be',
    status: 'Status',
    accountStatus: 'Accountstatus',
    organization: 'Organisatie',
    statusActive: 'Actief',
    statusInactive: 'Inactief',
    statusPending: 'In behandeling',
    memberSince: 'Lid sinds',
    role: 'Rol',
    roleOwner: 'Eigenaar',
    roleMember: 'Lid',
    roleUser: 'Gebruiker',
    roleOrganizer: 'Organisator',
    roleAdmin: 'Beheerder',
    language: 'Taal',
    selectLanguage: 'Selecteer taal',
    notifications: 'Meldingen',
    emailNotifications: 'E-mailmeldingen',
    pushNotifications: 'Pushmeldingen',
    privacy: 'Privacy',
    deleteTitle: 'Mijn account verwijderen',
    deleteWarning: 'Het verwijderen van je account zal:',
    deleteWarningItems: {
      loginInfo: 'Je inloggegevens verwijderen',
      accountInfo: 'Je accountgegevens verwijderen',
      eventsData: 'Al je evenementgegevens verwijderen',
      images: "Alle afbeeldingen/foto's van je evenementen verwijderen",
    },
    deleteConfirmation: 'Voer je e-mail in om te bevestigen',
    deletePasswordConfirmation: 'Voer je wachtwoord in om te bevestigen',
    confirmButton: 'Mijn account verwijderen',
    enterEmailConfirm: 'Voer je e-mail in om te bevestigen',
    incorrectEmail: 'Onjuist e-mailadres. Probeer het opnieuw',
    incorrectPassword: 'Onjuist wachtwoord. Probeer het opnieuw.',
    passwordRequired: 'Voer je wachtwoord in om te bevestigen',
    deleteSuccess: 'Account succesvol verwijderd',
    deleteInProgress: 'Account verwijderen...',
    deleteError: 'Kon account niet verwijderen',
    emailMismatch: 'E-mail komt niet overeen',
    sessions: 'Actieve sessies',
    currentSession: 'Huidige sessie',
    otherSessions: 'Andere sessies',
    endSession: 'Sessie beëindigen',
    endAllSessions: 'Alle sessies beëindigen',
  },

  // ============================================
  // Error Messages
  // ============================================
  errors: {
    generic: 'Er is een fout opgetreden',
    network: 'Netwerkfout. Controleer je internetverbinding.',
    notFound: 'Niet gevonden',
    serverError: 'Serverfout. Probeer het later opnieuw.',
    validation: 'Validatiefout. Controleer je invoer.',
    unauthorized: 'Niet geautoriseerd. Meld je aan om door te gaan.',
    forbidden: 'Toegang geweigerd',
    timeout: 'Verzoek verlopen. Probeer het opnieuw.',
    unknown: 'Onbekende fout',
    organizationsLoadFailed: 'Kon organisaties niet laden. Probeer het opnieuw.',
    tryAgain: 'Probeer het opnieuw',
    contactSupport: 'Neem contact op met ondersteuning',
    rateLimit: {
      title: 'Te veel verzoeken',
      message: 'Je hebt te veel verzoeken gedaan. Wacht even en probeer het opnieuw.',
      loginMessage: 'Te veel inlogpogingen. Wacht 15 minuten voordat je het opnieuw probeert.',
      forgotPasswordMessage:
        'Te veel wachtwoord reset verzoeken. Wacht een uur voordat je het opnieuw probeert.',
      deleteAccountMessage:
        'Te veel pogingen om account te verwijderen. Wacht een uur voordat je het opnieuw probeert.',
      accountLockedMessage: 'Te veel mislukte inlogpogingen. Probeer het later opnieuw.',
    },
    formErrors: {
      required: 'Dit veld is verplicht',
      invalidEmail: 'Ongeldig e-mailadres',
      invalidDate: 'Ongeldige datum',
      invalidTime: 'Ongeldige tijd',
      invalidUrl: 'Ongeldige URL',
      tooShort: 'Te kort (minimaal {{min}} tekens)',
      tooLong: 'Te lang (maximaal {{max}} tekens)',
      passwordMismatch: 'Wachtwoorden komen niet overeen',
      invalidFormat: 'Ongeldig formaat',
    },
    eventErrors: {
      loadFailed: 'Kon evenementen niet laden',
      createFailed: 'Kon evenement niet aanmaken',
      updateFailed: 'Kon evenement niet bijwerken',
      deleteFailed: 'Kon evenement niet verwijderen',
      notFound: 'Evenement niet gevonden',
      noPermission: 'Je hebt geen toestemming om dit evenement te bewerken',
      pastEvent: 'Kan geen evenement in het verleden aanmaken',
    },
  },

  // ============================================
  // Calendar Integration
  // ============================================
  calendar: {
    permissionsNotGranted: 'Kalendertoegang niet toegestaan',
    permissionsMessage:
      'Sta ProtestBase toe om toegang te krijgen tot je kalender om evenementen toe te voegen.',
    addSuccess: 'Evenement toegevoegd aan kalender',
    addError: 'Kon niet toevoegen aan kalender',
    openError: 'Kon kalender niet openen. Probeer het opnieuw.',
    eventSaved: 'Evenement succesvol opgeslagen!',
    openSettings: 'Instellingen openen',
    selectCalendar: 'Selecteer kalender',
    defaultCalendar: 'Standaardkalender',
    reminder: 'Herinnering',
    reminderOptions: {
      none: 'Geen',
      atTime: 'Op tijdstip evenement',
      '5min': '5 minuten ervoor',
      '15min': '15 minuten ervoor',
      '30min': '30 minuten ervoor',
      '1hour': '1 uur ervoor',
      '1day': '1 dag ervoor',
    },
  },

  // ============================================
  // Help & Support
  // ============================================
  help: {
    title: 'Hulp Gezocht',
    subtitle: 'De organisator zoekt vrijwilligers om te helpen bij dit evenement',
    volunteerNeeded: 'De organisator zoekt vrijwilligers',
    whatsNeeded: 'Wat er nodig is',
    noDetails:
      'Geen aanvullende details verstrekt. Neem contact op met de organisator voor meer informatie.',
    contactOrganizer: 'Neem contact op met de organisator',
    gotIt: 'Begrepen',
    howToUse: 'Hoe te gebruiken',
    faq: 'Veelgestelde vragen',
    reportIssue: 'Probleem melden',
    contactUs: 'Neem contact op',
    documentation: 'Documentatie',
    tutorials: 'Handleidingen',
  },

  // ============================================
  // Session Management
  // ============================================
  session: {
    expired: 'Sessie verlopen',
    expiredMessage: 'Je sessie is verlopen. Meld je opnieuw aan.',
    invalidSession: 'Ongeldige sessie',
    multipleDevices: 'Meerdere apparaten gedetecteerd',
    continueHere: 'Hier doorgaan',
    signInAgain: 'Opnieuw aanmelden',
    sessionEnded: 'Sessie beëindigd',
    allSessionsEnded: 'Alle sessies beëindigd',
    securityAlert: 'Beveiligingswaarschuwing',
    securityAlertMessage: 'Je sessie is beëindigd om veiligheidsredenen. Meld je opnieuw aan.',
    signedInElsewhere: 'Ingelogd op een ander apparaat',
    signedInElsewhereMessage:
      'Je account is ingelogd op een ander apparaat. Voor de veiligheid is slechts één actieve sessie tegelijk toegestaan.',
  },

  // ============================================
  // About Screen
  // ============================================
  about: {
    title: 'Over ProtestBase',
    thankYou: 'Bedankt voor het downloaden van ProtestBase, de protestkalender!',
    appDescription: 'ProtestBase is een kalender-app ontworpen om te helpen:',
    helpActivists:
      'Activisten om protesten, stakingen en workshops gemakkelijk en veilig te vinden.',
    helpOrganizations:
      'Organisaties om hun activisten op de hoogte te houden van de laatste evenementinformatie.',
    howToJoin: 'Hoe kan ik lid worden als organisatie?',
    howToJoinDescription: 'Als je deel uitmaakt van een organisatie, kun je het',
    onboardingForm: 'onboardingformulier',
    howToJoinDescriptionContinued:
      'invullen en wij nemen contact met je op om het onboardingproces te starten - we moeten verifiëren dat je toestemming hebt van de organisatie om een ProtestBase-account aan te maken. Zodra je account is goedgekeurd, kun je vrij evenementen toevoegen aan de ProtestBase-kalender.',
    feedbackMatters: 'Jouw feedback is belangrijk',
    feedbackDescriptionStart:
      'We horen graag van je! Als je ideeën, suggesties hebt of problemen opmerkt, gebruik dan',
    feedbackForm: 'ons feedbackformulier.',
    feedbackDescriptionEnd: 'Jouw input helpt de toekomst van ProtestBase vorm te geven.',
    privacyPriority: 'Jouw privacy is onze prioriteit',
    privacyOrganizations:
      'Voor organisaties: We bewaren alleen je accountgegevens en evenementgegevens. We delen je gegevens niet met derden, en dat zullen we nooit doen.',
    privacyUsers:
      'Voor gebruikers: We verzamelen geen persoonlijke gegevens van gebruikers die niet inloggen. Alle gegevens die je opslaat (zoals je protestkalender) worden lokaal op je telefoon opgeslagen en zijn van jou.',
    aboutCreators: 'Over de makers',
    creatorsDescription:
      'ProtestBase is opgericht door twee in Brussel gevestigde activisten die geloven in de kracht van collectieve actie. Ook al protesteren we allemaal voor verschillende dingen, onze strijd is met elkaar verbonden en door elkaar te versterken kunnen we de wereld veranderen.',
    joinUs: 'Doe mee aan het bouwen van een beter ProtestBase',
    joinUsDescription:
      'Samen kunnen we een tool creëren die protest ondersteunt, gemeenschap bevordert en onze democratische rechten en waarden hoog houdt. Bedankt dat je deel uitmaakt van de ProtestBase-gemeenschap. Laten we collectieve actie toegankelijker en impactvoller maken!',
    version: 'Versie',
    buildNumber: 'Build nummer',
    website: 'Website',
    contact: 'Contact',
    privacy: 'Privacybeleid',
    terms: 'Gebruiksvoorwaarden',
  },

  // ============================================
  // Report Event
  // ============================================
  report: {
    title: 'Evenement melden',
    reason: 'Reden',
    selectReason: 'Selecteer een reden',
    reasons: {
      spam: 'Spam of misleidend',
      inappropriate: 'Ongepast',
      violence: 'Geweld of gevaarlijk',
      harassment: 'Intimidatie of pesten',
      hateSpeech: 'Haatzaaiende taal',
      misinformation: 'Verkeerde informatie',
      copyright: 'Auteursrechtschending',
      other: 'Andere',
    },
    description: 'Beschrijving',
    descriptionPlaceholder: 'Geef meer details over je melding...',
    submitButton: 'Melding verzenden',
    cancelButton: 'Annuleren',
    submitSuccess: 'Melding succesvol verzonden',
    submitError: 'Kon melding niet verzenden',
    thankYou: 'Bedankt voor je melding',
    reviewMessage: 'We zullen je melding bekijken en passende actie ondernemen.',
    underConstruction: 'Deze pagina is in ontwikkeling.',
  },

  // ============================================
  // Version Check & Maintenance Screens
  // ============================================
  version: {
    updateRequired: {
      title: 'Update vereist',
      message:
        'Er is een nieuwe versie van ProtestBase beschikbaar. Gelieve te updaten om de app te blijven gebruiken.',
      button: 'Nu updaten',
    },
    updatePrompt: {
      title: 'Update beschikbaar',
      message: 'Er is een nieuwe versie van ProtestBase beschikbaar met verbeteringen en bugfixes.',
      updateButton: 'Nu updaten',
      laterButton: 'Later',
    },
    maintenance: {
      title: 'In onderhoud',
      titlePrefix: 'We zijn er ',
      titleHighlight: 'zo weer',
      message:
        'ProtestBase is tijdelijk niet beschikbaar omdat we de beveiliging van onze gegevens en diensten verbeteren. Even geduld, we zijn terug voordat je je protestbord af hebt.',
      badge: 'Snel terug',
    },
    connectionError: {
      title: 'Verbindingsprobleem',
      message:
        'We konden de servers van ProtestBase niet bereiken. Controleer je internetverbinding en probeer het opnieuw.',
      button: 'Opnieuw proberen',
      badge: 'Controleer je verbinding',
    },
    // Additional keys for version checking
    checking: 'Versie controleren...',
    upToDate: 'Je app is up-to-date',
    newVersionAvailable: 'Nieuwe versie beschikbaar',
  },

  // ============================================
  // Integrity - App-integriteit / installatieverificatie
  // ============================================
  integrity: {
    failed: {
      title: 'We konden deze app niet verifiëren',
      message:
        'ProtestBase kon niet bevestigen dat dit apparaat een echte, ongewijzigde versie van de app draait. Dit gebeurt meestal op gerootete toestellen, sideloaded installaties of niet-ondersteunde emulators.',
      button: 'Opnieuw proberen',
      badge: 'Verificatie mislukt',
    },
    retryable: {
      title: 'Tijdelijk verificatieprobleem',
      message:
        'We konden de verificatie van dit apparaat niet voltooien. Dit is meestal tijdelijk — probeer het zo dadelijk opnieuw.',
      button: 'Opnieuw proberen',
      badge: 'Verificatieprobleem',
    },
    deviceStateUnsupported: {
      title: 'Apparaatbeveiligingsstatus niet ondersteund',
      message:
        'ProtestBase kan niet draaien op apparaten met een ontgrendelde bootloader, een niet-geverifieerd besturingssysteem, of verlopen of ingetrokken apparaatcertificaten. Denk je dat dit een fout is? Neem dan contact met ons op.',
      badge: 'Apparaat geblokkeerd',
    },
    appConfig: {
      title: 'Configuratieprobleem met de app',
      message:
        'Er klopt iets niet aan deze installatie — meestal moet de app opnieuw worden geïnstalleerd vanuit de officiële store. Verwijder ProtestBase en installeer het opnieuw, en probeer het dan nog eens.',
      badge: 'Opnieuw installeren',
    },
    devSetup: {
      title: 'Setup voor ontwikkelaar vereist',
      message:
        'EXPO_PUBLIC_DEV_INTEGRITY_BYPASS ontbreekt in je lokale omgeving. Voeg het toe aan .env.local met de waarde die de backend gebruikt en herstart Metro.',
      button: 'Opnieuw proberen',
      badge: 'Setup vereist',
    },
    unsupportedDevice: {
      title: 'Dit apparaat wordt niet ondersteund',
      message:
        'ProtestBase gebruikt hardwarebeveiligingsfuncties die op dit apparaat niet beschikbaar zijn. iOS 14 of Android 9 (of nieuwer) is vereist.',
      badge: 'Apparaat niet ondersteund',
    },
  },

  // ============================================
  // Become Organizer
  // ============================================
  becomeOrganizer: {
    title: 'Word organisator',
    subtitle: 'Begin met het organiseren van evenementen en het opbouwen van je gemeenschap',
    descriptionStart: 'Wil je je eigen evenementen organiseren en promoten? Vul ons',
    applicationForm: 'aanvraagformulier',
    descriptionEnd: 'in om te beginnen.',
    createEventRequirement: 'Je moet deel uitmaken van een organisatie om evenementen te maken.',
    benefits: 'Voordelen van organisator worden',
    benefitsList: {
      createEvents: 'Onbeperkt evenementen aanmaken',
      templates: 'Toegang tot evenementsjablonen',
      analytics: 'Evenementstatistieken en analyses',
      community: 'Gemeenschapsondersteuning',
      verification: 'Geverifieerde organisator badge',
    },
    requirements: 'Vereisten',
    requirementsList: {
      account: 'Actief ProtestBase account',
      email: 'Geverifieerd e-mailadres',
      guidelines: 'Akkoord met gemeenschapsrichtlijnen',
    },
    applyButton: 'Aanvragen om organisator te worden',
    applicationSubmitted: 'Aanvraag verzonden',
    applicationMessage:
      'We zullen je aanvraag bekijken en binnen 2-3 werkdagen contact met je opnemen.',
    alreadyOrganizer: 'Je bent al een organisator',
    guidelines: 'Organisator richtlijnen',
    termsAcceptance: 'Ik ga akkoord met de organisator voorwaarden',
  },

  // ============================================
  // Share & Social
  // ============================================
  share: {
    shareEvent: 'Evenement delen',
    shareMessage: 'Bekijk dit evenement op ProtestBase: {{title}}',
    shareSubject: 'Evenement: {{title}}',
    shareVia: 'Delen via',
    copyLink: 'Link kopiëren',
    linkCopied: 'Link gekopieerd naar klembord',
    shareError: 'Kon evenement niet delen',
    whatsapp: 'Delen via WhatsApp',
    messenger: 'Delen via Messenger',
    email: 'Delen via e-mail',
    sms: 'Delen via SMS',
    more: 'Meer opties',
    cta: 'Doe mee aan dit evenement op ProtestBase!',
    errorTitle: 'Fout',
    eventNotFound: 'Evenement niet gevonden of onvolledige gegevens.',
    shareFailed: 'Delen van evenement mislukt. Probeer het opnieuw.',
  },

  // ============================================
  // Notifications - Saved-event day-of reminders
  // ============================================
  notifications: {
    channelName: 'Opgeslagen evenementen',
    actions: {
      directions: 'Routebeschrijving',
      remind1h: 'Herinnering 1 u vooraf',
      viewEvent: 'Evenement bekijken',
      viewAgenda: 'Mijn agenda van vandaag bekijken',
      remindEach1h: 'Herinnering 1 u voor elk',
    },
    dayOf: {
      title: 'Het is vandaag',
      digestTitle: '{{count}} protesten vandaag',
      body: '{{name}} · {{time}} — {{place}}.',
      bodyNoPlace: '{{name}} · {{time}}.',
      digestItem: '{{name}} om {{time}}',
      more: {
        one: '· en {{count}} andere',
        other: '· en {{count}} andere',
      },
    },
    remind1h: {
      title: 'Over 1 uur',
      body: '{{name}} begint over 1 uur — {{place}}.',
      bodyNoPlace: '{{name}} begint over 1 uur.',
    },
    permissionNotice: 'Schakel meldingen in om op de dag zelf een herinnering te krijgen',
  },

  // ============================================
  // Search
  // ============================================
  search: {
    placeholder: 'Zoeken...',
    recent: 'Recente zoekopdrachten',
    clearRecent: 'Recente wissen',
    noResults: 'Geen resultaten gevonden',
    noResultsFor: 'Geen resultaten voor "{{query}}"',
    suggestions: 'Suggesties',
    searching: 'Zoeken...',
    searchEvents: 'Evenementen zoeken',
    searchOrganizers: 'Organisatoren zoeken',
    searchLocations: 'Locaties zoeken',
  },

  // ============================================
  // Date & Time Formatting
  // ============================================
  dateTime: {
    today: 'Vandaag',
    tomorrow: 'Morgen',
    yesterday: 'Gisteren',
    thisWeek: 'Deze week',
    nextWeek: 'Volgende week',
    thisMonth: 'Deze maand',
    nextMonth: 'Volgende maand',
    days: {
      monday: 'Maandag',
      tuesday: 'Dinsdag',
      wednesday: 'Woensdag',
      thursday: 'Donderdag',
      friday: 'Vrijdag',
      saturday: 'Zaterdag',
      sunday: 'Zondag',
    },
    daysShort: {
      mon: 'Ma',
      tue: 'Di',
      wed: 'Wo',
      thu: 'Do',
      fri: 'Vr',
      sat: 'Za',
      sun: 'Zo',
    },
    months: {
      january: 'Januari',
      february: 'Februari',
      march: 'Maart',
      april: 'April',
      may: 'Mei',
      june: 'Juni',
      july: 'Juli',
      august: 'Augustus',
      september: 'September',
      october: 'Oktober',
      november: 'November',
      december: 'December',
    },
    monthsShort: {
      jan: 'Jan',
      feb: 'Feb',
      mar: 'Mrt',
      apr: 'Apr',
      may: 'Mei',
      jun: 'Jun',
      jul: 'Jul',
      aug: 'Aug',
      sep: 'Sep',
      oct: 'Okt',
      nov: 'Nov',
      dec: 'Dec',
    },
    at: 'om',
    from: 'van',
    to: 'tot',
    duration: 'Duur',
    hours: {
      one: '{{count}} uur',
      other: '{{count}} uur',
    },
    minutes: {
      one: '{{count}} minuut',
      other: '{{count}} minuten',
    },
  },

  // ============================================
  // Location & Maps
  // ============================================
  location: {
    currentLocation: 'Huidige locatie',
    useCurrentLocation: 'Gebruik huidige locatie',
    locationPermissionDenied: 'Locatietoegang geweigerd',
    locationPermissionMessage:
      'Sta ProtestBase toe om toegang te krijgen tot je locatie om evenementen bij jou in de buurt te vinden.',
    enableLocation: 'Locatie inschakelen',
    getDirections: 'Routebeschrijving',
    openInMaps: 'Openen in Maps',
    distance: 'Afstand',
    nearby: 'Bij jou in de buurt',
    km: 'km',
    meters: 'm',
  },

  // ============================================
  // Empty States
  // ============================================
  empty: {
    noEvents: 'Geen evenementen',
    noSavedEvents: 'Geen opgeslagen evenementen',
    noUpcomingEvents: 'Geen aankomende evenementen',
    noPastEvents: 'Geen afgelopen evenementen',
    noTemplates: 'Geen sjablonen',
    noResults: 'Geen resultaten',
    noNotifications: 'Geen meldingen',
    startExploring: 'Begin met verkennen',
    createYourFirst: 'Maak je eerste {{item}}',
    somethingWentWrong: 'Er is iets misgegaan',
  },

  // ============================================
  // Accessibility
  // ============================================
  accessibility: {
    menu: 'Menu',
    closeMenu: 'Menu sluiten',
    openMenu: 'Menu openen',
    back: 'Terug',
    search: 'Zoeken',
    filter: 'Filteren',
    settings: 'Instellingen',
    profile: 'Profiel',
    notifications: 'Meldingen',
    loading: 'Laden',
    refreshing: 'Vernieuwen',
    showMore: 'Meer tonen',
    showLess: 'Minder tonen',
    expand: 'Uitklappen',
    collapse: 'Inklappen',
    selected: 'Geselecteerd',
    unselected: 'Niet geselecteerd',
    required: 'Verplicht',
    optional: 'Optioneel',
  },

  // ============================================
  // Terms and Conditions
  // ============================================
  termsAndConditions: {
    title: 'Algemene voorwaarden voor ProtestBase',
    lastUpdated: 'Laatst bijgewerkt: 21/04/2025',

    // Introduction
    intro1:
      'Welkom bij ProtestBase! We zijn blij dat je er bent. Deze Algemene Voorwaarden ("Voorwaarden") regelen je gebruik van ProtestBase, een protestkalender-app. De app is ontworpen om het je gemakkelijk te maken protesten en de organisaties die ze organiseren te vinden. Door de App te gebruiken, ga je akkoord met deze Voorwaarden. Als je het niet eens bent, gebruik de App dan niet.',
    intro2:
      'Onze missie is om vreedzaam protest en collectieve actie te ondersteunen, en we zijn toegewijd aan het creëren van een veilige, gastvrije en vrolijke ruimte voor iedereen. Laten we beginnen!',

    // Section 1: Acceptance of Terms
    section1Title: '1. Aanvaarding van de voorwaarden',
    section1Intro:
      'Door ProtestBase te gebruiken, bevestig je dat je aan de volgende vereisten voldoet:',
    section1Bullet1:
      'Als je jonger bent dan 16 jaar, heb je deze Voorwaarden met een ouder of voogd doorgenomen en hun toestemming verkregen.',
    section1Bullet2:
      'Als je een account aanmaakt als organisatie, ben je minimaal 18 jaar oud en heb je de wettelijke bevoegdheid en toestemming om je organisatie te vertegenwoordigen.',

    // Section 2: Your Rights as an EU Citizen
    section2Title: '2. Jouw rechten als EU-burger',
    section2Intro:
      'Bij ProtestBase staan we stevig achter het democratische recht om te protesteren. Als EU-burger word je beschermd door de volgende rechten onder het EU-Handvest van de Grondrechten:',
    section2Article11Title: 'Artikel 11: Vrijheid van meningsuiting en informatie',
    section2Article11Text:
      'Eenieder heeft recht op vrijheid van meningsuiting. Dit recht omvat de vrijheid een mening te hebben en informatie en ideeën te ontvangen en te verspreiden zonder inmenging van openbaar gezag en ongeacht grenzen.',
    section2Article12Title: 'Artikel 12: Vrijheid van vergadering en vereniging',
    section2Article12Text:
      'Eenieder heeft recht op vrijheid van vreedzame vergadering en vrijheid van vereniging op alle niveaus, in het bijzonder op politiek, vakverenigings- en maatschappelijk gebied. Dit omvat het recht om vakverenigingen op te richten en zich daarbij aan te sluiten ter bescherming van zijn belangen.',
    section2Conclusion:
      'ProtestBase is ontworpen om deze rechten te ondersteunen door gebruikers te helpen vreedzame protesten te vinden en eraan deel te nemen. We geloven in de kracht van collectieve actie en streven ernaar protest voor iedereen toegankelijk te maken.',

    // Section 3: For Users (Without Log-In)
    section3Title: '3. Voor gebruikers (zonder in te loggen)',
    section3Intro:
      'Als je ProtestBase als gast gebruikt (zonder in te loggen), is dit wat je moet weten:',
    section3_1Title: '3.1. Gegevensprivacy',
    section3_1Bullet1:
      'We respecteren je privacy. We verzamelen geen persoonlijke gegevens van gebruikers die niet inloggen.',
    section3_1Bullet2:
      'Alle protesten die je opslaat of waarmee je interactie hebt, worden alleen lokaal op je apparaat opgeslagen.',
    section3_2Title: '3.2. Evenementen of organisaties melden',
    section3_2Bullet1:
      'Als je een evenement of organisatie tegenkomt die lokale wetten overtreedt of onveilige evenementen organiseert, kun je dit direct via de App melden.',
    section3_2Bullet2:
      'We zullen alle meldingen bekijken en passende actie ondernemen, wat kan betekenen dat het evenement of de organisatie uit de App wordt verwijderd.',
    section3_3Title: '3.3. Jouw verantwoordelijkheid',
    section3_3Bullet1:
      'Hoewel we ernaar streven accurate en actuele informatie te bieden, kan ProtestBase de veiligheid of legaliteit van evenementen in de App niet garanderen.',
    section3_3Bullet2:
      'Het is jouw verantwoordelijkheid om ervoor te zorgen dat je deelname aan elk protest wettig en veilig is voor jezelf en degenen om je heen.',

    // Section 4: For Organisations (With Log-In)
    section4Title: '4. Voor organisaties (met inloggen)',
    section4Intro:
      'Als je een organisatie bent die ProtestBase gebruikt om je evenementen te promoten, is dit wat voor jou van toepassing is:',
    section4_1Title: '4.1. Accountregistratie',
    section4_1Bullet1: 'Om evenementen op ProtestBase te plaatsen, moet je een login aanvragen.',
    section4_1Bullet2:
      'Je moet minimaal 18 jaar oud zijn of de wettelijke bevoegdheid hebben om je organisatie te vertegenwoordigen.',
    section4_1Bullet3:
      'We kunnen aanvullende informatie vragen om te verifiëren dat je organisatie legitiem is.',
    section4_2Title: '4.2. Gegevensprivacy voor organisaties',
    section4_2Bullet1:
      'In tegenstelling tot gastgebruikers hebben organisaties niet hetzelfde niveau van privacy omdat we je identiteit moeten verifiëren en de legitimiteit van je organisatie moeten waarborgen.',
    section4_2Bullet2:
      'Door een account aan te maken, ga je ermee akkoord accurate en actuele informatie over je organisatie te verstrekken.',
    section4_3Title: '4.3. Verantwoordelijkheid voor inhoud',
    section4_3Bullet1:
      'Je bent als enige verantwoordelijk voor de inhoud die je op ProtestBase plaatst, inclusief evenementdetails, beschrijvingen en eventueel gelinkt materiaal.',
    section4_3Bullet2: 'Je gaat ermee akkoord geen inhoud te plaatsen die:',
    section4_3Nested1: 'Lokale wetten overtreedt of geweld promoot.',
    section4_3Nested2: 'Vals, misleidend of schadelijk is.',
    section4_3Nested3: 'Inbreuk maakt op de rechten van anderen.',
    section4_3Bullet3:
      'Dit omvat het promoten van racisme, zionisme, suprematie, sektarisme, neoliberalisme, kolonialisme, imperialisme of sektes. ProtestBase wil mensen verenigen rond maatschappelijke kwesties, niet verdelen.',
    section4_4Title: '4.4. Zorgen voor veiligheid',
    section4_4Bullet1:
      'Als organisator heb je de plicht om de veiligheid van demonstranten bij je evenementen te waarborgen.',
    section4_4Bullet2: 'Dit omvat:',
    section4_4Nested1:
      'Duidelijke informatie verstrekken over het doel van het evenement, de locatie en veiligheidsmaatregelen.',
    section4_4Nested2: 'Voldoen aan alle toepasselijke wetten en regelgeving.',
    section4_4Nested3:
      "Stappen ondernemen om risico's te minimaliseren en een vreedzame omgeving te waarborgen.",

    // Section 5: Disclaimer of Responsibility
    section5Title: '5. Disclaimer van verantwoordelijkheid',
    section5Intro:
      'ProtestBase is een platform voor het ontdekken en promoten van protesten, maar we kunnen niet verantwoordelijk worden gehouden voor:',
    section5Bullet1: 'De acties van individuen of organisaties die de App gebruiken.',
    section5Bullet2:
      'Enige schade, letsel of juridische problemen die voortvloeien uit deelname aan of het organiseren van een protest.',
    section5Bullet3: 'De nauwkeurigheid of legaliteit van evenementen in de App.',
    section5Conclusion: 'Door ProtestBase te gebruiken, erken en accepteer je deze beperkingen.',

    // Section 6: Safety First
    section6Title: '6. Veiligheid voorop',
    section6Intro:
      'We geven diep om de veiligheid van demonstranten. Hoewel we niet kunnen controleren wat er bij evenementen gebeurt, moedigen we organisatoren en deelnemers aan om:',
    section6Bullet1: 'Voorrang te geven aan vreedzaam en wettig protest.',
    section6Bullet2: 'Lokale wetten en regelgeving te volgen.',
    section6Bullet3: 'Op elkaar te letten en verantwoordelijk te handelen.',

    // Section 7: Changes to These Terms
    section7Title: '7. Wijzigingen in deze voorwaarden',
    section7Text:
      'We kunnen deze Voorwaarden van tijd tot tijd bijwerken. Als we significante wijzigingen aanbrengen, zullen we je via de App of per e-mail op de hoogte stellen. Je voortgezet gebruik van ProtestBase nadat de wijzigingen van kracht worden, betekent dat je de bijgewerkte Voorwaarden accepteert.',

    // Section 8: Governing Law
    section8Title: '8. Toepasselijk recht',
    section8Text:
      'Deze Voorwaarden worden beheerst door de wetten van de Europese Unie en België. Alle geschillen die voortvloeien uit deze Voorwaarden zullen worden beslecht door de rechtbanken van België.',

    // Section 9: Contact Us
    section9Title: '9. Neem contact met ons op',
    section9Intro:
      'Als je vragen hebt of ondersteuning nodig hebt, neem dan contact met ons op via:',

    // Conclusion
    conclusion:
      'Bedankt voor het gebruik van ProtestBase! Samen kunnen we collectieve actie toegankelijker, vrediger en impactvoller maken.',
  },

  // ============================================
  // Not Found - 404 screen
  // ============================================
  notFound: {
    headerTitle: 'Oeps!',
    title: 'Dit scherm bestaat niet.',
    goHome: 'Ga naar het startscherm!',
  },

  // ============================================
  // Draft - Event draft management
  // ============================================
  draft: {
    checkingDraft: 'Controleren op opgeslagen concept...',
    resumeTitle: 'Concept hervatten?',
    resumeMessage:
      'Je hebt een niet-opgeslagen evenementconcept. Wil je verder gaan waar je gebleven was?',
    resumeDraft: 'Concept hervatten',
    startFresh: 'Opnieuw beginnen',
    closeTitle: 'Niet-opgeslagen wijzigingen',
    closeMessage: 'Je hebt niet-opgeslagen wijzigingen. Wat wil je doen?',
    discard: 'Verwijderen',
    saveDraft: 'Concept opslaan',
    keepEditing: 'Blijven bewerken',
    saveWarningTitle: 'Probleem met automatisch opslaan',
    saveWarningMessage:
      'Je concept kon niet automatisch worden opgeslagen. Je wijzigingen kunnen verloren gaan als je dit scherm verlaat. Probeer handmatig op te slaan of controleer de opslag van je apparaat.',
  },

  // ============================================
  // Drafts - Backend draft events (save-now-publish-later).
  // NOTE: distinct from the `draft` namespace above (local form-autosave).
  // ============================================
  drafts: {
    editTitle: 'Concept bewerken',
    saveAsDraft: 'Opslaan als concept',
    savedConfirmation: 'Concept opgeslagen.',
    save: 'Concept opslaan',
    publish: 'Publiceren',
    published: 'Evenement gepubliceerd.',
    publishIssuesTitle: 'Nog niet klaar om te publiceren',
    issueDescription: 'Voeg een beschrijving toe.',
    issueCategory: 'Kies minstens één categorie.',
    issueLocation: 'Voeg een locatie toe (stad of adres).',
    issueStartTime: 'Kies een startdatum en -tijd in de toekomst.',
    issueIncomplete: 'Sommige verplichte gegevens ontbreken.',
    delete: 'Concept verwijderen',
    deleted: 'Concept verwijderd.',
    deleteConfirmTitle: 'Concept verwijderen?',
    deleteConfirmMessage:
      'Dit concept wordt definitief verwijderd. Deze actie kan niet ongedaan worden gemaakt.',
  },

  // ============================================
  // Privacy Center - Privacy transparency screen
  // ============================================
  privacyCenter: {
    // Header
    title: 'Jouw privacy, beschermd',
    subtitle:
      'Voor ons is privacy een recht, geen optie. Hier zie je hoe we die van jou beschermen.',

    // What we don't collect section
    notCollectedTitle: 'Wat we niet verzamelen',
    noIpAddresses: 'IP-adressen - we tracken je verbinding niet',
    noTrackingCookies: 'Tracking cookies - geen analytics, geen fingerprinting',
    noPersonalData: 'Persoonlijke gegevens - geen account nodig',
    noBehavioralData: 'Gedragsgegevens - we weten niet wat je bekijkt of bewaart',

    // What stays on device section
    onDeviceTitle: 'Wat op je gsm blijft',
    onDeviceDescription:
      'Als je een event opslaat of je voorkeuren instelt, blijft dat op je gsm. We zien niks, slaan niks op, en synchroniseren niks.',
    viewCounterNote: 'De view-teller? Volledig anoniem, geen info over jou.',

    // Where we operate section
    locationTitle: 'Waar we werken',
    locationDescription: 'Onze servers bevinden zich in Europa en zijn volledig AVG-conform.',

    // Transparency section
    transparencyTitle: 'Transparantie',
    transparencyDescription:
      'Onze broncode is publiek beschikbaar zodat je alles zelf kunt checken. Vertrouw, maar check.',

    // For organizations section
    forOrgsTitle: 'Voor organisaties',
    forOrgsDescription:
      'Heb je een orga-account om events te beheren? Dan houden we je logins bij (standaard beveiliging). Al de rest hierboven geldt voor gebruikers zonder account.',

    // Permissions section
    permissionsTitle: 'App-machtigingen',
    permissionsDescription: 'ProtestBase vraagt alleen toestemming als het echt nodig is:',
    photoReadPermission: "Foto's (Lezen)",
    photoReadDescription: "Om foto's toe te voegen aan events die je maakt",
    calendarPermission: 'Kalender',
    calendarDescription: 'Om events aan je kalender toe te voegen',
    notificationsPermission: 'Meldingen',
    notificationsDescription: 'Om je te herinneren op de dag van events die je hebt opgeslagen',

    // Permission status labels
    statusGranted: 'Toegestaan',
    statusDenied: 'Geweigerd',
    statusUndetermined: 'Nog niet gevraagd',
    openSettings: 'Open Instellingen',
    manageAllPermissions: 'Beheer machtigingen in Instellingen',
  },

  // ============================================
  // Privacy Info Modal - Saved events privacy info
  // ============================================
  privacyInfo: {
    title: 'Uw privacy is belangrijk',
    subtitle: 'Zo beschermen wij uw gegevens wanneer u evenementen opslaat',
    localTitle: 'Alleen lokaal opgeslagen',
    localBody:
      'Alle opgeslagen evenementen worden uitsluitend op uw apparaat bewaard. We uploaden uw opgeslagen evenementen nooit naar onze servers.',
    anonymousTitle: 'Volledig anoniem',
    anonymousBody:
      'We tellen het totale aantal keer dat een evenement is opgeslagen, maar we weten nooit wie wat heeft opgeslagen. Uw activiteit is 100% privé.',
    noAccountTitle: 'Geen account nodig',
    noAccountBody:
      'Blader en sla evenementen op zonder een account aan te maken. Uw gegevens blijven altijd bij u.',
    gotIt: 'Begrepen',
    closeAccessibility: 'Privacy-informatie sluiten',
  },

  // ============================================
  // Permissions - Pre-permission dialogs
  // ============================================
  permissions: {
    photoLibraryPreTitle: 'Foto toevoegen',
    photoLibraryPreMessage:
      "ProtestBase heeft toegang tot je foto's nodig om afbeeldingen aan je evenementen toe te voegen. Je foto's blijven op je gsm.",
    calendarPreTitle: 'Toevoegen aan kalender',
    calendarPreMessage:
      'ProtestBase heeft toegang tot je kalender nodig om dit evenement toe te voegen. We kunnen je andere afspraken niet zien.',
    photoSavePreTitle: 'Afbeelding opslaan',
    photoSavePreMessage:
      "ProtestBase heeft toegang nodig om deze afbeelding in je foto's op te slaan.",
    allowAccess: 'Toestaan',
    notNow: 'Niet nu',
  },
};

// Export as both default and named export for flexibility
export default nl;
export { nl };
