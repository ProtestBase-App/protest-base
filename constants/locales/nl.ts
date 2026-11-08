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
    nearMe: 'Bij mij in de buurt',
  },

  // ============================================
  // Home area - "Bij mij in de buurt" zonder GPS
  // ============================================
  homeArea: {
    title: 'Mijn gebied',
    settingsRow: 'Mijn gebied',
    scopeChip: 'Mijn gebied',
    pickerPlaceholder: 'Zoek een stad, provincie of regio…',
    clear: 'Mijn gebied wissen',
    empty:
      'Kies je gebied om acties in de buurt eerst te tonen en de kaart daar te centreren. Zonder GPS — je keuze blijft op dit apparaat.',
  },

  // ============================================
  // Filters - Filter screens and options
  // ============================================
  filters: {
    title: 'Filters',
    country: 'Land',
    countryAll: 'Alle',
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
    loadingOrganizations: 'Organisaties laden…',
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
    saving: 'Opslaan…',
    publishing: 'Publiceren…',
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
  // Connectivity - Offline awareness
  // ============================================
  connectivity: {
    banner: 'Je bent offline. Opgeslagen inhoud wordt getoond.',
    actionUnavailableOffline: 'Je bent offline. Maak verbinding met internet om dit te doen.',
    cannotRefreshOffline:
      'Kan niet vernieuwen zonder verbinding. De reeds geladen evenementen worden getoond.',
  },

  // ============================================
  // Template - Event template management
  // ============================================
  template: {
    // Titles
    createTitle: 'Nieuw sjabloon',
    editTitle: 'Sjabloon bewerken',

    // Subtitles and descriptions
    createSubtitle:
      'Sla je evenementdetails op als herbruikbaar sjabloon om toekomstige evenementen sneller aan te maken.',
    eventDetailsSection: 'Evenementdetails om op te slaan',
    eventDetailsHelper:
      'Vul de evenementdetails in die je wilt hergebruiken. Alle velden zijn optioneel.',
    imageHelper:
      'Voeg tot 5 afbeeldingen toe — ze worden bij dit sjabloon opgeslagen en toegevoegd aan evenementen die je ermee aanmaakt',

    // Field labels
    nameLabel: 'Sjabloonnaam *',
    descriptionLabel: 'Sjabloonbeschrijving (Optioneel)',
    namePlaceholder: 'bv. Maandelijkse wake voor wonen',
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
    dataTooLong: 'Deze sjabloon is te lang om op te slaan. Maak de beschrijving korter.',
    volunteerDescMissing: 'Beschrijf hoe vrijwilligers kunnen helpen.',
    saveFromEventTitle: 'Opslaan als sjabloon',
    saveFromEventDesc: 'De details van dit evenement hergebruiken',
    keepGroup: 'Bewaren',
    datesNeverSaved: 'Datums worden nooit in een sjabloon bewaard.',
    partText: 'Titel en tekst',
    partLocation: 'Locatie',
    nameHelp: 'Alleen je organisatie ziet deze naam.',
    dateAsked: 'Datum en tijd',
    dateAskedHint: 'Die kies je wanneer je het sjabloon gebruikt',

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
    startGroup: 'Beginnen',
    templatesGroup: 'Je sjablonen',
    resume: 'Hervatten',
    unfinished: 'Onafgewerkt',
    untitled: 'Naamloos evenement',
    blankTitle: 'Plan een nieuwe actie',
    blankSubtitle: 'Begin met een leeg evenement',
    templateTitle: 'Gebruik een sjabloon',
    templateSubtitle: 'Vooraf invullen met opgeslagen evenementdetails',
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
    discardTitle: 'Wijzigingen negeren?',
    discardMessage: 'Je hebt niet-opgeslagen wijzigingen. Als je nu weggaat, gaan ze verloren.',
    keepEditing: 'Verder bewerken',
    discardConfirm: 'Negeren',
    // Under the date field of a date-only event. Picking a clock time is what
    // turns it into a normal timed event — there is no toggle.
    allDayHint: 'Geen starttijd ingesteld. Kies er een om dit evenement een tijd te geven.',
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
    accountDisabledMessage:
      'Dit account is uitgeschakeld. Denk je dat dit een vergissing is? Neem dan contact op met ProtestBase.',
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
    troubleSigningInTitle: 'Problemen met inloggen?',
    troubleSigningInBody: 'Herstel je wachtwoord om weer in te loggen.',
    migrationBannerTitle: 'Wachtwoord opnieuw instellen vereist',
    migrationBannerMessage:
      'We hebben onlangs onze systemen gemigreerd om de beveiliging te verbeteren. Je vorige wachtwoord werkt niet meer.',
    migrationBannerAction: 'Wachtwoord herstellen',
  },

  // ============================================
  // Two-step verification: sign-in step, setup, step-up
  // ============================================
  mfa: {
    challengeTitle: 'Verificatie in twee stappen',
    challengeIntro: 'Voer de 6-cijferige code uit je authenticator-app in.',
    recoveryIntro: 'Voer een van je herstelcodes in. Elke code werkt maar één keer.',
    passkeyOnly:
      'Dit account meldt zich aan met een toegangssleutel, die deze versie van de app nog niet ondersteunt. Voer in plaats daarvan een van je herstelcodes in.',
    codeLabel: 'Code',
    codePlaceholder: '123456',
    recoveryCodeLabel: 'Herstelcode',
    recoveryCodePlaceholder: 'ABCDE-23456',
    verify: 'Verifiëren',
    useRecoveryCode: 'Liever een herstelcode gebruiken',
    useAuthenticator: 'Liever de code uit je app gebruiken',
    backToSignIn: 'Terug naar inloggen',
    invalidCodeFormat: 'Voer de 6 cijfers uit je authenticator-app in.',
    invalidRecoveryFormat: 'Een herstelcode heeft 10 letters en cijfers, zoals ABCDE-23456.',
    wrongCode: 'Deze code is onjuist of verlopen.',
    attemptsLeft: {
      one: 'Nog 1 poging.',
      other: 'Nog {{count}} pogingen.',
    },
    blocked:
      'Dit account is tijdelijk geblokkeerd na te veel onjuiste codes, misschien ingevoerd door iemand anders die het gebruikt. Probeer het later opnieuw.',
    lockedFor: {
      one: 'Dit account is geblokkeerd na te veel onjuiste codes, misschien ingevoerd door iemand anders die het gebruikt. Probeer het over 1 minuut opnieuw.',
      other:
        'Dit account is geblokkeerd na te veel onjuiste codes, misschien ingevoerd door iemand anders die het gebruikt. Probeer het over {{count}} minuten opnieuw.',
    },
    expiredTitle: 'Inloggen verlopen',
    expiredMessage: 'Het inloggen duurde te lang. Log opnieuw in.',
    setupExpiredMessage:
      'Het instellen duurde te lang. Log opnieuw in om opnieuw te beginnen. Heb je ProtestBase al aan je authenticator-app toegevoegd? Verwijder dat item: de codes ervan werken niet.',
    alreadyEnrolledTitle: 'Al ingesteld',
    alreadyEnrolledMessage:
      'Verificatie in twee stappen is net ingesteld voor dit account, misschien door iemand anders die het gebruikt. Log opnieuw in met een code uit de authenticator-app waarmee dat is ingesteld, of met een herstelcode. Heb je ProtestBase hier aan je app toegevoegd? Verwijder dat item: de codes ervan werken niet.',
    recoveryCodesLowTitle: 'Weinig herstelcodes over',
    recoveryCodesLow: {
      zero: 'Je hebt je laatste herstelcode gebruikt. Vanaf nu kun je alleen inloggen met je authenticator-app.',
      one: 'Je hebt nog 1 herstelcode. Als die gebruikt is, kun je alleen nog inloggen met je authenticator-app.',
      other:
        'Je hebt nog {{count}} herstelcodes. Als die gebruikt zijn, kun je alleen nog inloggen met je authenticator-app.',
    },
    recoveryCodesLowPasskey: {
      zero: 'Je hebt je laatste herstelcode gebruikt en deze app kan je toegangssleutel nog niet gebruiken. Maak nieuwe herstelcodes aan op de website van ProtestBase om hier weer in te loggen.',
      one: 'Je hebt nog 1 herstelcode en deze app kan je toegangssleutel nog niet gebruiken. Maak nieuwe herstelcodes aan op de website van ProtestBase voordat je die gebruikt.',
      other:
        'Je hebt nog {{count}} herstelcodes en deze app kan je toegangssleutel nog niet gebruiken. Maak nieuwe herstelcodes aan op de website van ProtestBase voordat ze op zijn.',
    },
    enrollTitle: 'Verificatie in twee stappen instellen',
    enrollIntro:
      'ProtestBase vraagt nu bij het inloggen een code uit een authenticator-app. Stel dit één keer in op deze telefoon. Staat er in je app al een ProtestBase-item voor dit account van een eerdere instelling? Verwijder het: de codes ervan werken niet.',
    stepAddTitle: '1. Voeg ProtestBase toe aan je authenticator-app',
    openAuthenticator: 'Toevoegen aan authenticator-app',
    openAuthenticatorHelp:
      'Deze knop opent de app die je telefoon gebruikt voor verificatiecodes. Verschijnt ProtestBase daar niet, of gebruik je een andere app? Voeg het dan toe met de instelsleutel hieronder.',
    noAuthenticatorTitle: 'Geen authenticator-app gevonden',
    noAuthenticatorMessage:
      'Geen enkele app op deze telefoon kon de instellink openen. Installeer een authenticator-app, of voeg ProtestBase aan je app toe met de instelsleutel hieronder.',
    manualKeyLabel: 'Instelsleutel',
    manualKeyHelp:
      'Houd de sleutel ingedrukt om hem te kopiëren en plak hem waar je authenticator-app je een sleutel handmatig laat invoeren.',
    stepCodeTitle: '2. Voer de 6-cijferige code in die je app toont',
    confirm: 'Bevestigen',
    setupFailed: 'Het instellen kon niet starten. Controleer je verbinding en probeer het opnieuw.',
    recoveryCodesTitle: 'Bewaar je herstelcodes',
    recoveryCodesIntro:
      'Als je je authenticator-app kwijtraakt, kun je met elke code één keer inloggen. Bewaar ze op een veilige plek, zoals een wachtwoordbeheerder: je krijgt ze niet opnieuw te zien.',
    shareRecoveryCodes: 'Codes delen',
    recoveryCodesShareTitle: 'ProtestBase-herstelcodes',
    savedRecoveryCodes: 'Ik heb ze bewaard',
    reauthTitle: 'Bevestig dat jij het bent',
    reauthIntro:
      'Voer de 6-cijferige code uit je authenticator-app in om je account te verwijderen.',
    reauthRecoveryIntro: 'Voer een van je herstelcodes in om je account te verwijderen.',
    reauthExpired: 'Dat duurde te lang. Voer een nieuwe code in.',
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
    // Shown instead of a clock time when the event is date-only (all_day).
    allDay: 'Hele dag',
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
    notFoundTitle: 'Deze organisatie bestaat niet meer',
    notFoundBody: 'Ze is verwijderd, dus haar profiel is niet langer beschikbaar.',
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
    uploadImage: "Foto's",
    addCoverPhoto: 'Omslagfoto toevoegen',
    changeImage: 'Afbeelding wijzigen',
    removeImage: 'Afbeelding verwijderen',
    eventLink: 'Evenementlink',
    coOrganizers: 'Mede-organisatoren',
    volunteering: 'Vrijwilligers',
    volunteerRoles: 'Hoe kunnen mensen helpen?',
    volunteerNeeded: 'Vrijwilligers nodig',
    volunteerDetails: 'Wat voor vrijwilligers heb je nodig?',
    disclaimer: 'Goed om te weten',

    // Placeholders
    titlePlaceholder: 'Titel van het evenement',
    descriptionPlaceholder: 'Waar gaat het over, wie moet er komen?',
    selectCategory: 'Selecteer een categorie',
    categoryPlaceholder: 'Selecteer een categorie',
    pickDateTime: 'Kies datum/tijd',
    pickStartDateTime: 'Kies startdatum/tijd',
    pickEndDateTime: 'Kies einddatum/tijd',
    countryPlaceholder: 'Selecteer een land',
    selectCountry: 'Selecteer een land',
    postalCodePlaceholder: 'Postcode',
    searchPostalCode: 'Zoek op postcode of gemeente...',
    localityLabel: 'Plaats',
    searchLocality: 'Zoek een plaats...',
    communeLabel: 'Gemeente',
    searchCommune: 'Zoek een gemeente of postcode...',
    searchNoResults: 'Geen resultaten',
    searchMinLength: 'Typ minstens {{count}} tekens',
    streetAddressPlaceholder: 'Straat en huisnummer',
    // Address autocomplete
    addressSearchPlaceholder: 'Zoek een adres…',
    addressSearching: 'Zoeken…',
    addressNoResults: 'Geen overeenkomende adressen gevonden',
    addressError: 'Adressen zoeken mislukt. Probeer opnieuw.',
    addressUnavailable: 'Adres zoeken is momenteel niet beschikbaar. Je kunt nog steeds opslaan.',
    clearStreetAddressAccessibilityLabel: 'Adres wissen',
    // Postal confirmation card (filled state)
    postalFilledFromAddress: 'Automatisch ingevuld op basis van het adres',
    postalChange: 'Wijzigen',
    changePostalAccessibilityLabel: 'Postcode wijzigen',
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
      'Begin met het adres — de postcode wordt automatisch ingevuld. Je kunt deze ook handmatig instellen.',
    locationHelperLu: 'Zoek het adres, of kies hieronder de plaats.',
    locationHelperFr: 'Kies de gemeente, of zoek het adres.',
    imageHelper: 'Voeg tot 5 afbeeldingen toe — de eerste is de omslagfoto van je evenement',
    eventLinkHelper: 'Deel een link naar je evenementpagina, inschrijfformulier of meer informatie',
    coOrganizersHelper: 'Organisaties die samenwerken aan dit evenement',
    maxCoOrganizers: 'Je kunt maximaal {{max}} mede-organisatoren toevoegen.',
    volunteerHelper: 'Laat vrijwilligers weten hoe ze je evenement kunnen ondersteunen',
    disclaimerHelper:
      'Belangrijke informatie die deelnemers moeten weten (veiligheid, toegankelijkheid, vereisten, etc.)',

    // Checkbox labels
    needHelpCheckbox: 'We zoeken vrijwilligers',

    // Labels
    selected: 'Geselecteerd',
    mainImageBadge: 'Hoofd',

    // Progress & Actions
    stillNeeded: 'Nog nodig: {{fields}}',
    allRequiredFilled: 'Alle verplichte velden zijn ingevuld',
    neededFields: {
      title: 'titel',
      description: 'beschrijving',
      category: 'categorie',
      date: 'datum',
    },
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
    invalidUrlFormat: 'Voer een geldige link in, zoals example.com.',
    disclaimerTooLong: 'Houd dit op maximaal {{max}} tekens.',
    volunteerTooLong: 'Houd dit op maximaal {{max}} tekens.',
    saveAsDraft: 'Concept',
    publish: 'Publiceren',
    linkTooLong: 'Houd de link op maximaal {{max}} tekens.',
    fromTemplate: 'Uit sjabloon: {{name}}',
    pickTheDate: 'Kies de datum en tijd',
    onlyThingLeft: 'Het enige wat nog ontbreekt',
    starts: 'Begint',
    ends: 'Eindigt',
    noSetEnd: 'Geen vast einde',
    endsAnotherDay: 'Eindigt op een andere dag',
    previousMonth: 'Vorige maand',
    nextMonth: 'Volgende maand',
    hours: {
      one: '1 u',
      other: '{{count}} u',
    },
    publishCheckTitle: 'Dit evenement publiceren?',
    publishCheckBody: 'Het is meteen openbaar op Verkennen, Kaart en Kalender.',
    publishNow: 'Nu publiceren',
    timePlaceholder: 'Tijd',
    brusselsTime: '{{time}}, Brusselse tijd',
    namePlaceholder: 'Geef je actie een naam',
    byOrganization: 'door {{name}}',
    addDateTime: 'Datum en tijd toevoegen',
    addPlace: 'Een plaats toevoegen',
    link: 'Link',
    where: 'Waar',
    when: 'Wanneer',
    addMore: 'Meer toevoegen',
    whenRange: '{{start}} tot {{end}}',
    fixBeforePublishing: {
      one: '1 punt om op te lossen voor je publiceert',
      other: '{{count}} punten om op te lossen voor je publiceert',
    },
    fixBeforeSaving: {
      one: '1 punt om op te lossen voor je opslaat',
      other: '{{count}} punten om op te lossen voor je opslaat',
    },
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
    imagePickerError: 'Kon afbeelding niet selecteren. Probeer het opnieuw.',
    maxImagesReached: 'Je kunt maximaal {{max}} afbeeldingen toevoegen.',
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

    // Upcoming timeline (organizer redesign)
    today: 'Vandaag',
    nowLabel: 'Nu',
    nextUp: 'Hierna',
    startsIn: {
      minutes: 'begint over {{count}} min',
      hours: 'begint over {{count}} u',
      days: {
        one: 'begint over {{count}} dag',
        other: 'begint over {{count}} dagen',
      },
    },
    nextUpSimultaneous: '{{count}} evenementen om {{time}}',
    eventCount: {
      one: '{{count}} evenement',
      other: '{{count}} evenementen',
    },
    noLocationSet: 'geen locatie ingesteld',
    addLocation: 'Locatie toevoegen',
    viewsPill: {
      one: '{{formatted}} weergave',
      other: '{{formatted}} weergaven',
    },
    emptyUpcomingHelp: 'Evenementen die je publiceert verschijnen hier totdat ze zijn afgelopen.',
    viewPastEvents: 'Bekijk afgelopen evenementen',

    // Subtitles
    eventsScheduled: '{{count}} evenementen gepland',
    completedEvents: '{{count}} voltooide evenementen',
  },

  // ============================================
  // Event Templates
  // ============================================
  templates: {
    fromScratch: 'Vanaf nul',
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
    loadError: 'Kon sjablonen niet laden',
    loadingTemplate: 'Sjabloon laden...',
    // en/fr use confirmDelete for this dialog; nl only had the shorter
    // deleteConfirm, which silently fell back to English.
    confirmDelete:
      'Weet je zeker dat je dit sjabloon wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.',

    // Launchpad redesign (June 2026)
    subtitle: 'Start een nieuw evenement in enkele seconden',
    newTemplateTile: 'Nieuw sjabloon',
    newTemplateTileSub: 'Sla details één keer op en hergebruik ze elke keer',
    newEventAction: 'Nieuw evenement',
    duplicate: 'Dupliceren',
    copySuffix: '{{name}} (kopie)',
    tileMenu: 'Sjabloonopties',
    reusePastEvent: 'Een eerder evenement hergebruiken',
    orReusePastEvent: 'Of hergebruik een eerder evenement',
    use: 'Gebruiken',
    placeholderCard: 'Je opgeslagen sjablonen verschijnen hier',
    hintDefault: 'Tik op een sjabloon om een evenement met vooraf ingevulde details aan te maken.',
    hintEmpty: 'Een eerder evenement gebruiken maakt er automatisch een sjabloon van.',
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
    },
    deleteImpact: {
      checking: 'Je organisatie wordt gecontroleerd…',
      ownContent: "De evenementen en sjablonen die je hebt gemaakt verwijderen, met hun foto's",
      orgDeleted:
        "{{name}} verwijderen, met alle evenementen, concepten inbegrepen, hun foto's en de sjablonen, omdat je het laatste lid bent",
      orgKept:
        "{{name}} behouden voor de andere leden, met alle evenementen, hun foto's en de sjablonen, ook die je zelf hebt gemaakt",
      nameReplaced: '{{name}} tonen in plaats van je naam bij de evenementen die je hebt gemaakt',
      ownerTransfer: 'Het langst aangesloten lid van {{name}} eigenaar maken',
      orgUnknown:
        "Je organisatie verwijderen, met alle evenementen, hun foto's en de sjablonen, als je het laatste lid bent. Heeft ze andere leden, dan blijft ze bij hen, met alles erin, en vervangt haar naam de jouwe",
      sharedHint:
        'Wil je je komende evenementen en concepten uit {{name}} halen? Verwijder ze dan voordat je je account verwijdert. Voorbije evenementen kunnen niet worden verwijderd: ze blijven staan onder {{name}}.',
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
    unknownError: 'Er is een onbekende fout opgetreden.',
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
    unreachable: 'Afgemeld',
    unreachableMessage:
      'ProtestBase was niet bereikbaar om je aangemeld te houden. Je concepten en bewaarde evenementen staan nog op deze telefoon. Meld je opnieuw aan zodra je weer online bent.',
    sessionEnded: 'Sessie beëindigd',
    allSessionsEnded: 'Alle sessies beëindigd',
    securityAlert: 'Beveiligingswaarschuwing',
    securityAlertMessage: 'Je sessie is beëindigd om veiligheidsredenen. Meld je opnieuw aan.',
    signedInElsewhere: 'Ingelogd op een ander apparaat',
    signedInElsewhereMessage:
      'Je account is ingelogd op een ander apparaat. Voor de veiligheid is slechts één actieve sessie tegelijk toegestaan.',
    accountDisabled: 'Account uitgeschakeld',
    accountDisabledMessage:
      'Dit account is uitgeschakeld, daarom ben je afgemeld. Je kunt ProtestBase als gast blijven gebruiken. Denk je dat dit een vergissing is? Neem dan contact op met ProtestBase.',
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
    getDirections: 'Routebeschrijving',
    openInMaps: 'Openen in Maps',
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
    lastUpdated: 'Laatst bijgewerkt: 8 november 2026',

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
      'We respecteren je privacy. Je hebt geen account nodig, en om evenementen te bekijken vragen we niet naar je naam, je e-mailadres of je locatie.',
    section3_1Bullet2:
      'De protesten die je opslaat, leuk vindt of volgt, worden op je apparaat bewaard. Ons Privacybeleid legt precies uit wat er bij onze servers terechtkomt en waarom.',
    privacyPolicyLink: 'Lees ons Privacybeleid',
    section3_2Title: '3.2. Evenementen of organisaties melden',
    section3_2Bullet1:
      'Als je een evenement of organisatie tegenkomt die lokale wetten overtreedt of onveilige evenementen organiseert, kun je dit melden door een e-mail te sturen naar:',
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
      'Om te controleren of je organisatie legitiem is, hebben we wat informatie over jou en je organisatie nodig. Ons Privacybeleid legt uit wat we bewaren, hoe lang en hoe je je account verwijdert.',
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
    replaceTitle: 'Je onafgewerkte evenement vervangen?',
    replaceMessage:
      'Je hebt een onafgewerkt evenement op deze telefoon. Een nieuw beginnen verwijdert het.',
    replaceConfirm: 'Nieuw beginnen',
    photosMissingTitle: "Sommige foto's zijn weg",
    photosMissingMessage: "Je telefoon heeft foto's van dit evenement gewist. Voeg ze opnieuw toe.",
    checkingDraft: 'Controleren op opgeslagen concept...',
    resumeTitle: 'Concept hervatten?',
    resumeMessage:
      'Je hebt een niet-opgeslagen evenementconcept. Wil je verder gaan waar je gebleven was?',
    resumeDraft: 'Concept hervatten',
    startFresh: 'Opnieuw beginnen',
    closeTitle: 'Niet-opgeslagen wijzigingen',
    closeMessage: 'Je hebt niet-opgeslagen wijzigingen. Wat wil je doen?',
    discard: 'Verwijderen',
    saveDraft: 'Bewaren en sluiten',
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

    // Drafts list redesign (June 2026)
    draftCount: {
      one: '{{count}} concept',
      other: '{{count}} concepten',
    },
    onlyVisibleToYou: 'alleen zichtbaar voor jou',
    untitled: 'Naamloos concept',
    editedJustNow: 'Zojuist bewerkt',
    editedMinutesAgo: '{{count}} min geleden bewerkt',
    editedHoursAgo: '{{count}} u geleden bewerkt',
    editedYesterday: 'Gisteren bewerkt',
    editedDaysAgo: '{{count}} dagen geleden bewerkt',
    editedWeeksAgo: {
      one: '{{count}} week geleden bewerkt',
      other: '{{count}} weken geleden bewerkt',
    },
    readyToPublish: 'Klaar om te publiceren',
    missingFields: 'Ontbreekt: {{fields}}',
    fieldDescription: 'beschrijving',
    fieldCategory: 'categorie',
    fieldLocation: 'locatie',
    fieldDate: 'datum',
    pastDateWarning: 'Datum is verstreken — kies een nieuwe datum om te publiceren',
    continueEditing: 'Verder bewerken',
    sortHint: 'Concepten zijn gesorteerd op laatst bewerkt. Veeg een kaart om te verwijderen.',
    emptyTitle: 'Geen concepten',
    emptyHelp: 'Begin een evenement te maken en sla het op als concept om het later af te werken.',

    // Server-side filters + herkomst van het concept (aug. 2026)
    searchPlaceholder: 'Zoek in {{count}} concepten',
    sourceManual: 'Handmatig',
    sourceAutomation: 'Automatisering',
    badgeNew: 'Nieuw',
    filteredCount: {
      one: '{{count}} overeenkomend concept',
      other: '{{count}} overeenkomende concepten',
    },
    noResultsTitle: 'Geen overeenkomende concepten',
    noResultsHelp: 'Probeer een andere zoekopdracht of wis de filters om alle concepten te zien.',
    clearFilters: 'Filters wissen',
    alreadyPublished: 'Al elders gepubliceerd',

    // Herontwerp conceptenlijst (aug. 2026)
    filterAll: 'Alle {{count}}',
    filterReady: 'Klaar {{count}}',
    filterPastDate: 'Datum verstreken {{count}}',
    filterNeedsWork: 'Nog afwerken {{count}}',
    sortLabel: 'Sorteren',
    sortLastEdited: 'Laatst bewerkt',
    sortDate: 'Datum',
    sortConfidence: 'Overeenkomst',
    sourceLabel: 'Herkomst',
    pastDateShort: 'De datum is verstreken — er is een nieuwe datum nodig',
    confidenceLabel: '{{score}}% overeenkomst',
    batchReady: '{{count}} klaar om te publiceren',
    batchSubtitle: 'Nagekeken en volledig',
    batchPublishAll: 'Alles publiceren',
    batchPastDated: '{{count}} met een verstreken datum',
    batchPastSubtitle: 'Kunnen zo niet gepubliceerd worden',
    batchRemovePast: 'Verwijderen',
    batchDeleteConfirmTitle: '{{count}} concepten met verstreken datum verwijderen?',
    batchDeleteConfirmMessage:
      'Dit verwijdert definitief elk concept met een datum in het verleden, in je hele lijst — niet alleen wat je nu ziet. Dit kan niet ongedaan worden gemaakt.',
    batchDeleteConfirmCta: 'Definitief verwijderen',
    batchDeleteResult: '{{deleted}} van {{total}} verwijderd.',
    batchDeleteNone: 'Geen concepten met verstreken datum meer om te verwijderen.',
    batchCappedNotice: 'De eerste {{count}} worden verwijderd — voer het opnieuw uit voor de rest.',
    batchConfirmTitle: '{{count}} concepten publiceren?',
    batchConfirmMessage:
      'Deze concepten zijn volledig en hebben een datum in de toekomst. Ze worden nu openbaar.',
    batchResult: '{{published}} van {{total}} gepubliceerd.',
    batchStoppedRateLimit: 'Vroegtijdig gestopt — te veel verzoeken. De rest blijft ongewijzigd.',
    batchStoppedBackground:
      'Gestopt toen de app naar de achtergrond ging. De rest blijft ongewijzigd.',
    swipeHint: 'Veeg over een rij om te publiceren of te verwijderen',
    accessibilityPublish: 'Concept publiceren',
    accessibilityRowHint: 'Opent de editor. Acties: publiceren, verwijderen.',
    accessibilityRowHintNotReady: 'Opent de editor. Actie: verwijderen.',

    // Triagemodus
    triageTitle: 'TRIAGEWACHTRIJ',
    triageHeadline: '{{count}} concepten vragen een beslissing',
    triageHelper:
      '{{past}} hebben een datum in het verleden. {{ready}} zijn klaar om te versturen.',
    triageStart: 'Start triage',
    triagePublishReady: '{{count}} publiceren',
    triageSkipHint: 'veeg omhoog om over te slaan',
    triageOpenEditor: 'Volledige editor openen',
    triageCorroborated: 'Wat de crawler kon bevestigen',
    triageChecksRan: '{{ran}} van {{total}} uitgevoerd',
    triageNotScored: 'Je hebt dit concept zelf gemaakt — geen overeenkomstscore',
    triageDatePassed: '{{date}} is verstreken',
    triagePickDate: 'Kiezen…',
    triageCappedByDate: 'De datum is niet op de bronpagina gevonden.',
    triageReadFullDescription: 'Volledige beschrijving lezen',
    triageRelativeHint: 'over {{count}} dagen',
    checkFound: 'gevonden',
    checkPartly: 'gedeeltelijk',
    checkNotFound: 'niet gevonden',
    checkNotChecked: 'niet gecontroleerd',
    fieldStartDate: 'Datum',
    fieldStartTime: 'Tijd',
    fieldTitle: 'Titel',
    fieldCity: 'Stad',
    deletedToast: '“{{title}}” verwijderd',
    deletedToastHelper: 'Verwijderd uit je concepten',
    undo: 'Ongedaan maken',
    queueClearedTitle: 'Wachtrij afgewerkt',
    queueClearedHelper: 'Elk concept in de wachtrij heeft een beslissing.',
    summaryPublished: 'Gepubliceerd',
    summaryRescheduled: 'Verzet en gepubliceerd',
    summaryDeleted: 'Verwijderd',
    summarySkipped: 'Uitgesteld',
    backToDrafts: 'Terug naar concepten',
    reviewSkipped: 'Bekijk de {{count}} overgeslagen',
    queueRemaining: '{{count}} concepten over in je lijst.',
  },

  // ============================================
  // Duplicates - dubbelcheck van de backend (409 DUPLICATE_EVENT)
  // ============================================
  duplicates: {
    createTitle: 'Dit lijkt op een bestaand evenement',
    publishTitle: 'Dit concept lijkt op een bestaand evenement',
    createIntro: {
      one: 'Één evenement op ProtestBase lijkt op het evenement dat je aanmaakt.',
      other: '{{count}} evenementen op ProtestBase lijken op het evenement dat je aanmaakt.',
    },
    publishIntro: {
      one: 'Één evenement op ProtestBase lijkt op dit concept.',
      other: '{{count}} evenementen op ProtestBase lijken op dit concept.',
    },
    relationshipOwn: 'Je hebt dit evenement al aangemaakt.',
    relationshipCoOrganized: 'Je bent al mede-organisator van dit evenement.',
    relationshipOtherOrg:
      'Al geplaatst door een andere organisatie. Vraag hen om je als mede-organisator toe te voegen, of plaats het jouwe apart.',
    open: 'Openen',
    view: 'Bekijken',
    createAnyway: 'Toch aanmaken',
    publishAnyway: 'Toch publiceren',
    notOverridable:
      'Dit kan zo niet doorgaan. Open het bestaande evenement, of pas het jouwe aan en probeer het opnieuw.',
    warningNote: 'Let op: dit lijkt op “{{title}}”.',
    warningNoteMany: {
      one: 'Let op: dit lijkt op “{{title}}” en {{count}} ander evenement.',
      other: 'Let op: dit lijkt op “{{title}}” en {{count}} andere evenementen.',
    },
    yourDate: 'Jouw datum: {{date}}',
    clashingDates: 'Betrokken data: {{dates}}',
    accessibilityOpen: 'Open “{{title}}”',
  },

  // ============================================
  // Series - recurring events
  // ============================================
  series: {
    repeat: {
      label: 'Herhalen',
      once: 'Eenmalig',
      weekly: 'Wekelijks',
      everyTwoWeeks: 'Om de 2 weken',
      monthly: 'Maandelijks',
      weekday: 'Dag',
      weekOfMonth: 'Welke van de maand',
      startTime: 'Starttijd',
      endTime: 'Eindtijd',
      pickTime: 'Kies een tijd',
      timeHint: 'Brusselse tijd. Een eindtijd vóór de starttijd valt op de volgende dag.',
      startsOn: 'Vanaf',
      startsOnHint: 'De eerste datum is de eerste passende dag vanaf deze datum.',
      ends: 'Eindigt',
      endsAfter: 'Na een aantal keer',
      endsOn: 'Op een datum',
      countLabel: 'Aantal keer',
      countPlaceholder: '2 tot 31',
      untilLabel: 'Laatste datum',
      pickDate: 'Kies een datum',
      capHint: 'Een reeks loopt hoogstens 3 maanden na haar eerste datum.',
      errors: {
        startLocal: 'Kies een starttijd.',
        endLocal: 'De eindtijd mag niet gelijk zijn aan de starttijd.',
        startsOn: 'De startdatum mag niet in het verleden liggen.',
        until: 'Kies een einddatum op of na de startdatum.',
        count: 'Vul een getal van 2 tot 31 in.',
      },
    },
    rule: {
      weekly: 'Elke {{weekday}}',
      everyTwoWeeks: 'Om de twee weken op {{weekday}}',
      monthly: 'Elke {{ordinal}} {{weekday}} van de maand',
      until: 'tot {{date}}',
    },
    weekdays: {
      monday: 'maandag',
      tuesday: 'dinsdag',
      wednesday: 'woensdag',
      thursday: 'donderdag',
      friday: 'vrijdag',
      saturday: 'zaterdag',
      sunday: 'zondag',
    },
    weekdaysShort: {
      monday: 'ma',
      tuesday: 'di',
      wednesday: 'wo',
      thursday: 'do',
      friday: 'vr',
      saturday: 'za',
      sunday: 'zo',
    },
    ordinals: {
      first: 'eerste',
      second: 'tweede',
      third: 'derde',
      fourth: 'vierde',
      last: 'laatste',
    },
    preview: {
      heading: 'Data',
      loading: 'Data berekenen…',
      creates: {
        one: 'Dit maakt 1 evenement aan:',
        other: 'Dit maakt {{count}} evenementen aan:',
      },
      upTo: 'Tot {{count}} evenementen, de laatste ten laatste op {{date}}.',
      unavailable:
        'De data kunnen nu niet worden getoond. Ze worden gecontroleerd bij het opslaan.',
    },
    badge: {
      weekly: 'Elke week',
      everyTwoWeeks: 'Om de 2 weken',
      monthly: 'Elke maand',
      count: {
        one: '1 evenement',
        other: '{{count}} evenementen',
      },
      generic: 'Terugkerend evenement',
      seeAll: 'Alle data bekijken',
    },
    scope: {
      only: 'Alleen dit evenement',
      following: 'Dit en alle volgende evenementen',
    },
    edit: {
      partOfSeries: 'Dit evenement is één datum van een terugkerende reeks.',
      onlyNote:
        'Alleen voor deze datum opslaan? Een latere bewerking van ‘dit en alle volgende evenementen’ overschrijft dit.',
      allNote:
        'Je wijzigingen gelden voor alle komende data van deze reeks. Hun data blijven zoals gepland; alleen de tijden kunnen veranderen.',
      scopeTitle: 'Je wijzigingen toepassen op',
      followingNote:
        'Elke latere datum wordt overschreven met dit formulier, ook als die apart bewerkt is. De data blijven zoals gepland; alleen de tijden kunnen veranderen.',
      dateLocked:
        'Je hebt de datum gewijzigd of het evenement meerdere dagen laten duren. Dat kan alleen voor dit evenement: de planning van een reeks kan niet veranderen.',
    },
    page: {
      heading: 'Alle data',
      upcoming: 'Komend',
      past: 'Voorbij',
      noUpcoming: 'Geen komende data.',
      status: {
        draft: 'Concept',
        active: 'Gepubliceerd',
        cancelled: 'Geannuleerd',
        past: 'Voorbij',
      },
      manageHeading: 'Deze reeks beheren',
      manageNote:
        'Deze knoppen gelden voor alle komende data. Voorbije data worden nooit gewijzigd.',
      editAll: 'Alle komende data bewerken',
      cancelAll: 'Alle komende data annuleren',
      deleteAll: 'Alle komende data verwijderen',
      publishAll: 'Alles publiceren',
      addDates: 'Data toevoegen',
      addDatesLabel: 'Aantal data om toe te voegen',
      windowNote: 'Deze reeks kan hoogstens tot {{date}} lopen.',
      notFound: 'Deze reeks bestaat niet meer.',
      loadError:
        'De reeks kon niet worden geladen. Controleer je verbinding en probeer het opnieuw.',
    },
    dialogs: {
      cancelAllTitle: 'Alle komende data annuleren?',
      cancelAllBody: {
        one: '1 betrokken datum. Gepubliceerde data worden geannuleerd en concepten verwijderd. Dit kan niet ongedaan worden gemaakt.',
        other:
          '{{count}} betrokken data. Gepubliceerde data worden geannuleerd en concepten verwijderd. Dit kan niet ongedaan worden gemaakt.',
      },
      deleteAllTitle: 'Alle komende data verwijderen?',
      deleteAllBody: {
        one: '1 betrokken datum. Die wordt definitief verwijderd. Voorbije data blijven staan.',
        other:
          '{{count}} betrokken data. Ze worden definitief verwijderd. Voorbije data blijven staan.',
      },
      publishAllTitle: 'Alle komende concepten publiceren?',
      publishAllBody: {
        one: '1 concept om te publiceren. Voorbije concepten blijven concepten.',
        other: '{{count}} concepten om te publiceren. Voorbije concepten blijven concepten.',
      },
      addDatesTitle: 'Data toevoegen',
      addDatesConfirm: 'Data toevoegen',
      deleteScopeTitle: 'Welke concepten verwijderen?',
      deleteScopeBody: 'Ze worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.',
      cancelFollowingHint:
        'Alle latere data worden ook geannuleerd; komende concepten worden verwijderd.',
      deleteFollowingLocked:
        'Sommige latere data zijn al gepubliceerd, dus hier kan alleen dit concept worden verwijderd.',
    },
    messages: {
      created: {
        one: '1 evenement aangemaakt.',
        other: '{{count}} evenementen aangemaakt.',
      },
      draftsCreated: {
        one: '1 concept opgeslagen.',
        other: '{{count}} concepten opgeslagen.',
      },
      updated: {
        one: '1 datum bijgewerkt.',
        other: '{{count}} data bijgewerkt.',
      },
      cancelled: {
        one: '1 datum geannuleerd.',
        other: '{{count}} data geannuleerd.',
      },
      deleted: {
        one: '1 datum verwijderd.',
        other: '{{count}} data verwijderd.',
      },
      published: {
        one: '1 datum gepubliceerd.',
        other: '{{count}} data gepubliceerd.',
      },
      datesAdded: {
        one: '1 datum toegevoegd.',
        other: '{{count}} data toegevoegd.',
      },
    },
    errors: {
      disabled: 'Terugkerende evenementen zijn momenteel niet beschikbaar.',
      invalid:
        'Deze herhaalinstellingen zijn niet geldig. Controleer de dag, de tijden en de data.',
      untilBeforeStart: 'De einddatum ligt vóór de eerste datum van de reeks.',
      tooFew: 'Een reeks heeft minstens 2 data nodig. Kies een latere einddatum of meer keren.',
      tooMany: 'Een reeks kan hoogstens {{max}} data hebben, de laatste ten laatste op {{date}}.',
      lostRule:
        'De herhaalinstellingen hebben de server niet bereikt, dus er is niets aangemaakt. Probeer het opnieuw.',
      notConfirmed:
        'De server heeft de reeks niet bevestigd. Kijk bij je evenementen voor je het opnieuw probeert.',
      notFound: 'Deze reeks bestaat niet meer.',
      nothingUpcoming: 'Er is geen komende datum meer om te wijzigen.',
      scheduleImmutable:
        'De planning van een reeks kan niet worden gewijzigd. Annuleer of verwijder de data die weg moeten, of maak een nieuwe reeks.',
      ended: 'Alle data van deze reeks zijn geannuleerd of voorbij. Maak liever een nieuwe reeks.',
      invalidFromEvent: 'Deze datum hoort niet meer bij de reeks. Vernieuw en probeer het opnieuw.',
      reasonTooLong: 'De reden is te lang (hoogstens 1000 tekens).',
      conflict: 'Iemand heeft deze data net toegevoegd. Vernieuw om ze te zien.',
      notMember: 'Alleen leden van de organisatie kunnen deze reeks wijzigen.',
      generic: 'Er ging iets mis. Probeer het opnieuw.',
    },
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
    calendarPreTitle: 'Toevoegen aan kalender',
    calendarPreMessage:
      'ProtestBase heeft toegang tot je kalender nodig om dit evenement toe te voegen. We kunnen je andere afspraken niet zien.',
    photoSavePreTitle: 'Afbeelding opslaan',
    photoSavePreMessage:
      "ProtestBase heeft toegang nodig om deze afbeelding in je foto's op te slaan.",
    allowAccess: 'Toestaan',
    notNow: 'Niet nu',
  },

  // ============================================
  // Weather - "Protest forecast" card on event detail
  // ============================================
  weather: {
    title: 'Betogingsweer',
    mayChange: 'Kan nog veranderen',
    updatedHoursAgo: '{{count}} u geleden bijgewerkt',
    // Open-Meteo's CC BY 4.0 terms require a link wherever their data is shown.
    attribution: 'Op basis van data van Open-Meteo',
    attributionLinkA11y: 'Open de website van Open-Meteo',
    // Shown only when the forecast does not cover the whole event.
    windowFromNow: 'Vanaf nu tot {{time}}',
    windowForDay: 'Voorspelling voor {{day}}',
    metrics: {
      temp: '{{min}}–{{max}} °C',
      tempSingle: '{{value}} °C',
      tempBelowZero: '{{min}} tot {{max}} °C',
      feels: 'voelt als {{min}}–{{max}}°',
      feelsSingle: 'voelt als {{value}}°',
      feelsBelowZero: 'voelt als {{min}} tot {{max}}°',
      rain: 'regen {{value}}%',
      gusts: 'rukwinden {{value}} km/u',
    },
    conditions: {
      clear: 'Helder',
      clearNight: 'Heldere nacht',
      cloudy: 'Bewolkt',
      fog: 'Mist',
      drizzle: 'Motregen',
      rain: 'Regen',
      snow: 'Sneeuw',
      thunder: 'Onweer',
      unknown: 'Weersverwachting',
    },
    // Never discourage attending or imply safety. Informal Belgian Dutch
    // throughout ("je", drinkbus, fluohesje, gsm…). Keys ending in _N are
    // alternative wordings of one situation; the card shows one per event.
    tips: {
      thunder: 'Kans op onweer — hou de berichten van de organisatie in het oog.',
      thunder_rain_1: 'Donder en regen: neem een regenjas of poncho mee.',
      thunder_rain_2: 'Donder en regen: zorg dat je op tijd schuilt als nodig.',
      heat_1: 'Heet: neem minstens één drinkbus mee.',
      heat_2: 'Heet: zorg dat je jouw hoofd bedekt.',
      heat_3: 'Heet: draag luchtige kledij van linnen of katoen.',
      freezing_1: 'Heel koud: draag thermisch ondergoed.',
      freezing_2: 'Heel koud: neem een sjaal en handschoenen mee.',
      freezing_3: 'Heel koud: niets kan jou tegenhouden!',
      freezing_4: 'Heel koud: neem een thermos mee!',
      wind_strong:
        'Felle rukwinden: je grote spandoek wordt een zeil — maak het goed vast of hou het klein.',
      cold_rain_1: 'Koud en regen: laat je niet demotiveren — van stappen krijg je het warm.',
      cold_rain_2: 'Koud en regen: niets houdt jou tegen! Ga de straat op!',
      cold_rain_3: 'Koud en regen: draag dikke sokken en waterdichte schoenen.',
      cold_rain_4: 'Koud en regen: vergeet je thermos niet.',
      cold_rain_5: 'Koud en regen: draag een dikke regenjas.',
      cold_rain_6: 'Koud en regen: een regenbroek aandoen!',
      cold_rain_7: 'Koud en regen: een keffiyeh kan je beschermen bij lichte regen.',
      cold_rain_8: 'Koud en regen: met een paraplu maak je snel vrienden.',
      wind_rain: 'Winderig en regen: neem een regenjas of poncho mee.',
      sun_rain_1: 'Zon en regen: kom voorbereid op alles!',
      sun_rain_2: 'Zon en regen: drinkbus + regenjas + zonnebril.',
      rain_1: 'Regen: dat is goed voor de plantjes.',
      rain_2: 'Regen: neem een regenjas of poncho mee.',
      rain_3: 'Regen: neem waterdichte schoenen mee.',
      showers: 'Kans op een buitje: steek een k-way in je rugzak.',
      uv_high: 'Felle zon: smeer je in — alleen je strijdlust mag branden.',
      sunny_warm_1: 'Zonnig en warm: vergeet je drinkbus niet — van roepen krijg je dorst.',
      sunny_warm_2: 'Zonnig en warm: een keffiyeh kan je beschermen tegen de zon.',
      sunny_warm_3: 'Zonnig en warm: neem je zonnebril mee.',
      sunny_warm_4: 'Zonnig en warm: zorg dat je niet verbrandt!',
      warm: 'Warm: neem een drinkbus mee — van roepen krijg je dorst.',
      wind_1: 'Winderig: zorg dat je niet wegvliegt!',
      wind_2: 'Winderig: houd je banner goed vast.',
      wind_3: 'Winderig: niets kan jou van je stuk brengen.',
      cold_1: 'Koud: laat je niet demotiveren — van stappen krijg je het warm.',
      cold_2: 'Koud: draag een dikke jas.',
      cold_3: 'Koud: een thermos kan van pas komen.',
      dark: 'Het wordt donker om {{time}} — een fluohesje of het lampje van je gsm helpt.',
      sunny_1: 'Perfect protestweer: geen excuses om niet te komen!',
      sunny_2: 'Perfect protestweer: neem je zonnebril mee.',
      sunny_3: 'Perfect protestweer: zorg dat je niet verbrandt!',
      perfect: 'Perfect protestweer: geen excuses om niet te komen!',
    },
  },
  a11y: {
    required: 'verplicht',
    tabPosition: '{{title}}, tabblad, {{position}} van {{count}}',
    expandField: 'Dit veld groter maken',
    collapseField: 'Dit veld kleiner maken',
    hints: {
      useRecoveryCode: 'Vraagt om een van je herstelcodes in plaats van de code uit je app',
      useAuthenticatorCode: 'Vraagt om de code uit je authenticator-app',
      backToSignIn: 'Gaat terug naar de stap met e-mail en wachtwoord',
      openAuthenticator: 'Opent een authenticator-app op deze telefoon om je account toe te voegen',
      shareRecoveryCodes: 'Opent het deelmenu met je herstelcodes',
      cancelCodeStep: 'Gaat terug naar de stap met het wachtwoord',
      goBack: 'Gaat terug naar het vorige scherm',
      closeScreen: 'Sluit dit scherm',
      closeDialog: 'Sluit dit venster',
      closeMenu: 'Sluit het menu',
      openEvent: 'Opent de details van het evenement',
      openFilters: 'Opent de filters',
      toggleSave: 'Voegt dit evenement toe aan je opgeslagen evenementen, of haalt het eruit',
      toggleLike: 'Voegt je like toe, of haalt hem weg',
      shareEvent: 'Opent de deelopties',
      viewImage: 'Toont de afbeelding op volledig scherm',
      removeFilter: 'Verwijdert deze filter',
      removeSelection: 'Verwijdert deze selectie',
      openOrganizer: 'Opent het profiel van de organisator',
      manageEvent: 'Opent de acties voor dit evenement',
      openSettings: 'Opent de instellingen van de app op je toestel',
      openExternalLink: 'Opent de link buiten de app',
      openPrivacyPolicy: 'Opent het privacybeleid in een browser',
      sendEmail: 'Opent je e-mailapp om ons te schrijven',
      zoomInMap: 'Zoomt in op de kaart',
      zoomOutMap: 'Zoomt uit op de kaart',
      selectOnMap: 'Selecteert dit evenement op de kaart',
      applyMapFilter: 'Filtert de evenementen op de kaart',
      showHomeArea: 'Filtert de lijst op je gebied',
      resetPassword: 'Opent het herstellen van je wachtwoord',
      togglePassword: 'Toont of verbergt het wachtwoord',
      openAccount: 'Opent je account',
      deleteDraft: 'Verwijdert dit concept',
      undoDelete: 'Maakt het verwijderen van dit concept ongedaan',
      skipDraft: 'Bewaart dit concept voor later',
      publishDraft: 'Publiceert dit concept',
      publishReady: 'Publiceert de concepten die klaar zijn',
      removePastDrafts: 'Verwijdert de concepten waarvan de datum voorbij is',
      backToDrafts: 'Gaat terug naar je concepten',
      startTriage: 'Start het nakijken van je concepten, één voor één',
      openEditor: 'Opent dit concept in de volledige editor',
      pickDate: 'Opent de datumkiezer',
      openRepeat: 'Opent hoe vaak het evenement terugkomt',
      deleteTemplate: 'Verwijdert dit sjabloon',
      pickDay: 'Gebruikt deze dag voor het evenement',
      openWhen: 'Opent de datum en tijd',
      openWhere: 'Opent de plaats',
      openPhotos: "Opent de foto's",
      resumeDraft: 'Opent je onafgewerkte evenement',
      pickTime: 'Opent de tijdkiezer',
      resizeField: 'Wijzigt hoeveel tekst zichtbaar is',
      jumpToField: 'Gaat naar dit veld',
      setDate: 'Gebruikt deze datum voor het concept',
      clearField: 'Maakt dit veld leeg',
      useAddress: 'Vult dit adres in',
      changePostal: 'Laat je een andere postcode kiezen',
      selectOption: 'Selecteert of deselecteert deze optie',
      searchAsYouType: 'De resultaten worden bijgewerkt terwijl je typt',
      openMonthPicker: 'Opent de maand- en jaarkiezer',
      goToToday: 'Gaat terug naar vandaag',
      goToNextEvent: 'Gaat naar de volgende dag met evenementen',
      previousMonth: 'Toont de vorige maand',
      nextMonth: 'Toont de volgende maand',
      previousYear: 'Toont het vorige jaar',
      nextYear: 'Toont het volgende jaar',
      selectMonth: 'Toont deze maand',
      selectDay: 'Toont de evenementen van deze dag',
      removeImage: 'Verwijdert deze afbeelding',
      moveImage: 'Wijzigt de volgorde van de afbeeldingen',
      switchView: 'Schakelt over naar deze weergave',
      resetFilters: 'Wist alle filters',
      openTemplateMenu: 'Opent de acties voor dit sjabloon',
      createTemplate: 'Start een nieuw sjabloon',
      applyTemplateAction: 'Past deze actie toe op het sjabloon',
      addLocation: 'Opent de editor om de locatie toe te voegen',
      repeatOnDay: 'Herhaalt het evenement op deze dag',
      createEvent: 'Start een nieuw evenement',
    },
  },
};

// Export as both default and named export for flexibility
export default nl;
export { nl };
