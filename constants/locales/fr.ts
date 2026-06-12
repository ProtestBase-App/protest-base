/**
 * French (fr) Translation File
 *
 * Complete French translations for ProtestBase application.
 * Structure mirrors English translation file for consistency.
 */

import { LocaleData } from '@/types/i18n.types';

const fr: LocaleData = {
  // ============================================
  // Tabs - Bottom tab bar labels
  // ============================================
  tabs: {
    home: 'Calendrier',
    explore: 'Explorer',
    map: 'Carte',
    more: 'Plus',
  },

  // ============================================
  // Maps - Map tab (events on a map)
  // ============================================
  maps: {
    title: 'Carte',
    actionCount: {
      one: '1 action',
      other: '{{count}} actions',
    },
    actionCountNone: 'Aucune action',
    timeAll: 'Tout',
    timeToday: "Aujourd'hui",
    timeWeek: '7 jours',
    today: "Aujourd'hui",
    actionType: "Type d'action",
    country: 'Pays',
    countryAll: 'Tous',
    postalCode: 'Code postal',
    searchPostalCode: 'Rechercher un code postal...',
    filterApplyCount: {
      one: 'Voir 1 action',
      other: 'Voir {{count}} actions',
    },
    filterApplyNone: 'Aucun résultat',
    emptyTitle: 'Aucune action avec ces filtres',
    resetFilters: 'Réinitialiser les filtres',
    mapUnavailable: "La carte n'est pas disponible sur cet appareil",
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
  },

  // ============================================
  // Filters - Filter screens and options
  // ============================================
  filters: {
    title: 'Filtres',
    location: 'Lieu',
    date: 'Date',
    organization: 'Organisation',
    category: 'Catégorie',
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    thisWeek: 'Cette semaine',
    thisWeekend: 'Ce week-end',
    thisMonth: 'Ce mois-ci',
    confirmFilters: 'Confirmer les filtres',
    searchPlaceholder: 'Tapez au moins 2 caractères pour rechercher...',
    searchOrganizations: 'Rechercher des organisations...',
    postalCodesCount: '{{count}} codes postaux',
    selectionTooBroad:
      'Sélection trop large — choisissez moins de zones ou des zones plus petites.',
  },

  // ============================================
  // Categories - Event categories
  // ============================================
  categories: {
    protest: 'Manifestation',
    act: 'Action',
    learn: 'Apprendre',
    support: 'Soutien',
    strike: 'Grève',
  },

  // ============================================
  // Common - General UI elements
  // ============================================
  common: {
    ok: 'OK',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    loading: 'Chargement...',
    loadingCurrentWord: 'Chargement. Mot actuel : {{word}}',
    error: 'Erreur',
    success: 'Succès',
    back: 'Retour',
    next: 'Suivant',
    done: 'Terminé',
    close: 'Fermer',
    confirm: 'Confirmer',
    yes: 'Oui',
    no: 'Non',
    required: 'Obligatoire',
    optional: 'Optionnel',
    search: 'Rechercher',
    filter: 'Filtrer',
    clear: 'Effacer',
    clearAll: 'Tout effacer',
    apply: 'Appliquer',
    reset: 'Réinitialiser',
    refresh: 'Actualiser',
    retry: 'Réessayer',
    submit: 'Soumettre',
    edit: 'Modifier',
    create: 'Créer',
    update: 'Mettre à jour',
    view: 'Voir',
    share: 'Partager',
    report: 'Signaler',
    help: 'Aide',
    welcome: 'Bienvenue',
    seeAll: 'Voir tout',
    viewAll: 'Voir tout',
    learnMore: 'En savoir plus',
    getStarted: 'Commencer',
    continue: 'Continuer',
    skip: 'Passer',
    tryAgain: 'Réessayer',
    goBack: 'Retour',
    dismiss: 'Ignorer',
    noResultsFound: 'Aucun résultat trouvé',
    tryAdjustingSearch: 'Essayez de modifier votre recherche',
    invalidDateError: "Date invalide. Impossible d'ajouter au calendrier.",
  },

  // ============================================
  // Template - Event template management
  // ============================================
  template: {
    // Titles
    createTitle: 'Créer un modèle',
    createFromEventTitle: "Créer un modèle à partir d'un événement",
    editTitle: 'Modifier le modèle',

    // Subtitles and descriptions
    createSubtitle:
      "Enregistrez les détails de votre événement comme modèle réutilisable pour accélérer la création d'événements futurs.",
    eventDetailsSection: "Détails de l'événement à enregistrer",
    eventDetailsHelper:
      "Remplissez les détails de l'événement que vous souhaitez réutiliser. Tous les champs sont facultatifs.",
    imageHelper:
      "Ajoutez jusqu'à 5 images — elles sont enregistrées avec ce modèle et ajoutées aux événements créés à partir de celui-ci",

    // Field labels
    nameLabel: 'Nom du modèle *',
    descriptionLabel: 'Description du modèle (Facultatif)',
    namePlaceholder: 'Donnez un nom à votre modèle (ex: Réunion mensuelle)',
    descriptionPlaceholder: 'À quoi sert ce modèle ?',

    // Buttons
    saveButton: 'Enregistrer le modèle',
    deleteButton: 'Supprimer le modèle',

    // Success messages
    createdSuccess: 'Modèle enregistré avec succès !',
    updatedSuccess: 'Modèle mis à jour avec succès !',
    deletedSuccess: 'Modèle supprimé avec succès !',

    // Error messages
    nameMissing: 'Veuillez entrer un nom de modèle.',
    volunteerDescMissing: 'Veuillez décrire comment les bénévoles peuvent aider.',

    // Delete confirmation
    deleteConfirmTitle: 'Supprimer le modèle',
    deleteConfirmMessage:
      'Êtes-vous sûr de vouloir supprimer "{{name}}" ? Cette action est irréversible.',

    // Loading states
    deleting: 'Suppression du modèle...',
  },

  // ============================================
  // Create Event Options
  // ============================================
  createEventOptions: {
    blankTitle: 'Planifier une nouvelle action',
    blankSubtitle: 'Créer un nouvel événement avec un formulaire vierge',
    templateTitle: 'Utiliser un modèle',
    templateSubtitle: "Pré-remplir avec les détails d'un événement enregistré",
    footer:
      'Les modèles font gagner du temps pour les événements récurrents aux détails similaires.',
  },

  // ============================================
  // Event Edit
  // ============================================
  eventEdit: {
    title: "Modifier l'événement",
    successMessage: 'Événement modifié avec succès !',
    mandatoryFieldsError: 'Veuillez remplir tous les champs obligatoires.',
    invalidTimeRangeError: "L'heure de fin ne peut pas être antérieure à l'heure de début",
    closeAccessibilityLabel: "Fermer l'écran de modification d'événement",
  },

  // ============================================
  // Auth - Authentication & user access
  // ============================================
  auth: {
    signIn: 'Connexion',
    signOut: 'Se déconnecter',
    signUp: "S'inscrire",
    email: 'E-mail',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    resetPassword: 'Réinitialiser le mot de passe',
    emailPlaceholder: 'Entrez votre e-mail',
    passwordPlaceholder: 'Entrez votre mot de passe',
    signInButton: 'Se connecter',
    signInSuccess: 'Connexion réussie !',
    signInError: 'Échec de la connexion. Veuillez vérifier vos identifiants.',
    logoutSuccess: 'Déconnexion réussie',
    logoutError: 'Échec de la déconnexion. Veuillez réessayer.',
    sessionExpired: 'Session expirée',
    invalidCredentials: 'E-mail ou mot de passe invalide',
    emailRequired: "L'e-mail est obligatoire",
    passwordRequired: 'Le mot de passe est obligatoire',
    invalidEmail: 'Veuillez entrer une adresse e-mail valide',
    fillAllFields: 'Veuillez remplir tous les champs',
    resetPasswordTitle: 'Réinitialiser le mot de passe',
    resetPasswordDescription:
      'Nous vous enverrons un e-mail avec les instructions pour réinitialiser votre mot de passe',
    resetPasswordPlaceholder: 'votre.email@exemple.com',
    resetPasswordSend: 'Envoyer',
    resetPasswordSending: 'Envoi...',
    resetPasswordSuccess: 'Instructions de réinitialisation envoyées à votre e-mail',
    resetPasswordError: "Échec de l'envoi des instructions. Veuillez réessayer.",
    tryAgainIn: 'Réessayer dans {{seconds}}s',
    noAccount: "Vous n'avez pas de compte ?",
    requestAccess: 'Demandez-le ici',
    resetPasswordCheckEmail: 'Vérifiez votre e-mail',
    resetPasswordHowItWorks: 'Voici comment ça fonctionne :',
    resetPasswordStep1: '1. Entrez votre e-mail ci-dessous',
    resetPasswordStep2: '2. Vérifiez votre boîte de réception pour un lien de réinitialisation',
    resetPasswordStep3: '3. Ouvrez le lien pour définir un nouveau mot de passe sur notre site web',
    resetPasswordStep4: '4. Revenez ici et connectez-vous',
    resetPasswordSentTo: 'Nous avons envoyé un lien de réinitialisation à :',
    resetPasswordNextSteps:
      'Ouvrez le lien pour définir un nouveau mot de passe sur notre site web. Une fois terminé, revenez ici et connectez-vous.',
    resetPasswordCheckSpam: "Vous ne l'avez pas reçu ? Vérifiez votre dossier spam.",
    resetPasswordGotIt: "C'est compris",
    firstTimeLogin: 'Première connexion ?',
    firstTimeTitle: 'Définir votre mot de passe',
    firstTimeHowItWorks: 'Voici comment commencer :',
    firstTimeStep1: "1. Entrez l'e-mail lié à votre compte ci-dessous",
    firstTimeStep2: '2. Vérifiez votre boîte de réception pour un lien de configuration',
    firstTimeStep3: '3. Ouvrez le lien pour créer votre mot de passe sur notre site web',
    firstTimeStep4: '4. Revenez ici et connectez-vous',
    firstTimeSentTo: 'Nous avons envoyé un lien de configuration à :',
    firstTimeNextSteps:
      'Ouvrez le lien pour créer votre mot de passe sur notre site web. Une fois terminé, revenez ici et connectez-vous.',
    migrationBannerTitle: 'Réinitialisation du mot de passe requise',
    migrationBannerMessage:
      'Nous avons récemment migré nos systèmes pour améliorer la sécurité. Votre ancien mot de passe ne fonctionnera plus.',
    migrationBannerAction: 'Réinitialiser le mot de passe',
  },

  // ============================================
  // Home - Calendar/saved events screen
  // ============================================
  home: {
    refreshFailed: "Échec de l'actualisation",
    refreshFailedMessage:
      "Impossible d'actualiser les événements. Vérifiez votre connexion et réessayez.",
    viewToggleMonth: 'Mois',
    viewToggleAgenda: 'Agenda',
    dayEventCount: {
      one: '1 manifestation',
      other: '{{count}} manifestations',
    },
    emptyDayTitle: 'Aucune manifestation ce jour',
    emptyFilteredTitle: 'Aucun résultat avec ces filtres',
    nextEventPill: 'Prochaine : {{date}}',
    multiDayBadge: {
      one: '{{count}} jour',
      other: '{{count}} jours',
    },
    dayProgress: 'Jour {{index}}/{{total}}',
    inProgressBadge: 'En cours',
    going: 'y vont',
    typesCount: '{{count}} types',
    savedOnlyTitle: 'Sauvegardés uniquement',
    savedOnlySubtitle: 'Mon calendrier personnel',
    savedChip: 'Sauvegardés',
    helpNeededSubtitle: 'Actions qui cherchent des bénévoles',
    filterApplyCount: {
      one: 'Voir 1 manifestation',
      other: 'Voir {{count}} manifestations',
    },
    filterApplyNone: 'Aucun résultat',
    openFilters: 'Ouvrir les filtres',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
  },

  // ============================================
  // Explore - Event discovery screen
  // ============================================
  explore: {
    searchPlaceholder: 'Rechercher une manifestation',
    noResults: 'Aucun événement trouvé',
    noResultsMessage:
      "Nous n'avons trouvé aucun événement correspondant à votre recherche. Essayez d'ajuster vos filtres ou vos termes de recherche.",
    filterTitle: 'Filtrer les événements',
    categories: 'Catégories',
    dateRange: 'Plage de dates',
    location: 'Lieu',
    organization: 'Organisation',
    helpTitle: 'Comment utiliser Explorer',
    helpDescription:
      'Utilisez la barre de recherche pour trouver des événements par mot-clé, ou appliquez des filtres pour affiner vos résultats par catégorie, date, lieu ou organisateur.',
    refreshFailed: "Échec de l'actualisation",
    refreshFailedMessage:
      "Impossible d'actualiser les événements. Veuillez vérifier votre connexion et réessayer.",
    saveError: 'Échec de la mise à jour des événements sauvegardés. Veuillez réessayer.',
    emptyTitle: 'Rien de prévu pour le moment',
    emptySubtitle:
      "Les organisateurs n'ont pas encore créé d'événements à venir. Revenez bientôt !",
  },

  // ============================================
  // More - Additional features hub
  // ============================================
  more: {
    // Section Headers
    resources: 'Ressources',
    account: 'Compte',
    settings: 'Paramètres',
    devTools: 'Outils de développement',

    // Action Buttons
    createEvent: 'Créer un événement',
    createNewEvent: 'Créer un nouvel événement',
    myEvents: 'Mes événements',
    draftEvents: 'Événements brouillons',
    draftEventsEmpty: 'Aucun événement brouillon pour le moment',
    eventTemplates: "Modèles d'événements",
    becomeOrganizer: 'Devenir organisateur',
    giveFeedback: 'Donner un avis',
    about: 'À propos',
    termsAndConditions: 'Conditions générales',
    termsPrivacy: 'Conditions et confidentialité',
    accountInfo: 'Informations du compte',
    deleteAccount: 'Supprimer le compte',
    logout: 'Déconnexion',
    createFakeEventDev: 'Créer un faux événement (Dev)',
    creating: 'Création...',

    // Organizer hub (More tab redesign)
    upcoming: 'À venir',
    past: 'Passés',
    drafts: 'Brouillons',
    templates: 'Modèles',
    identitySubtitleOrganizer: 'Organisateur · Compte et profil',
    identitySubtitle: 'Compte et profil',
    becomeOrganizerBody:
      'Créez des actions, mobilisez des sympathisant·es et gérez vos événements — gratuit pour les organisations de terrain.',
    alreadyOrganizing: 'Déjà organisateur ?',
    signIn: 'Se connecter',
    logoutConfirmTitle: 'Déconnexion',
    logoutConfirmMessage: 'Voulez-vous vraiment vous déconnecter ?',
    versionLabel: 'Protestbase v{{version}}',

    // Alerts
    logoutSuccess: 'Vous avez été déconnecté avec succès.',
    logoutError: 'Échec de la déconnexion. Veuillez réessayer.',
    privacyCenter: 'Centre de confidentialité',
  },

  // ============================================
  // Events - Event detail & actions
  // ============================================
  events: {
    // Event Detail Labels
    title: "Titre de l'événement",
    viewImage: "Voir l'image de l'événement",
    description: 'Description',
    date: 'Date',
    time: 'Heure',
    location: 'Lieu',
    organizer: 'Organisateur',
    organizedBy: 'Organisé par',
    organizers: 'Organisateurs',
    category: 'Catégorie',
    attendees: 'Participants',
    waysToHelp: 'Comment aider',
    coOrganizers: 'Co-organisateurs',
    attention: 'Attention',
    moreInfo: "Plus d'infos",

    // Actions
    save: 'Sauvegarder',
    saved: 'Sauvegardé',
    unsave: 'Retirer',
    share: 'Partager',
    report: "Signaler l'événement",
    addToCalendar: 'Ajouter au calendrier',
    getDirections: "Obtenir l'itinéraire",
    viewOnMap: 'Voir sur la carte',

    // Confirmations
    saveSuccess: 'Événement sauvegardé dans votre calendrier',
    unsaveSuccess: 'Événement retiré de votre calendrier',
    reportSubmitted: 'Signalement soumis avec succès',
    eventSaved: 'Événement sauvegardé',
    eventUnsaved: 'Événement retiré',

    // Delete
    deleteButton: "Supprimer l'événement",
    deleteConfirmTitle: "Supprimer l'événement",
    deleteConfirmMessage:
      'Êtes-vous sûr de vouloir supprimer "{{name}}" ? Cette action est irréversible.',
    deleting: "Suppression de l'événement...",

    // Badges & Labels
    views: 'Vues',
    helpWanted: 'Aide recherchée',

    // Redesigned event detail — sticky bar
    saveEvent: 'Sauvegarder',
    savedEvent: 'Sauvegardé',
    directions: 'Itinéraire',
    manage: 'Gérer',
    editEvent: "Modifier l'événement",
    modifyPill: 'Modifier',

    // Creator stats banner
    yourEvent: 'VOTRE ÉVÉNEMENT',
    viewCount: 'Vues',
    savesCount: 'Sauvegardes',

    // Organizer row
    viewProfile: 'Voir le profil',

    // Creator action sheet
    editDetails: 'Modifier les détails',
    editDetailsDesc: 'Titre, date, lieu, description',
    notifyParticipants: 'Notifier les participants',
    notifyParticipantsDesc: 'Envoyer une mise à jour',
    visitorPreview: 'Aperçu visiteur',
    visitorPreviewDesc: 'Voir comme un utilisateur normal',
    cancelEvent: "Annuler l'événement",
    cancelEventDesc: 'Cette action est irréversible',
    comingSoon: 'Bientôt disponible',

    // Cancellation / lifecycle banners
    cancelledBadge: 'Annulé',
    cancelledBanner: 'Cet événement a été annulé',
    cancelledReasonLabel: 'Raison',
    cancelledNoReason: 'Aucune raison indiquée',
    pastBadge: 'Événement passé',
    cancelConfirmTitle: 'Annuler cet événement ?',
    cancelConfirmMessage: "L'événement sera marqué comme annulé. Cette action est irréversible.",
    cancelAction: "Annuler l'événement",
    keepActive: "Conserver l'événement",
    cancelSuccess: 'Événement annulé',
    alreadyCancelled: 'Cet événement a déjà été annulé.',
    cancelError: "Impossible d'annuler l'événement. Veuillez réessayer.",

    // Event detail loading
    detailNotFound: 'Événement introuvable. Il a peut-être été supprimé.',
    detailNetworkError:
      'Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.',
    detailLoadError: "L'événement n'a pas pu être chargé. Veuillez réessayer.",

    // Like
    likeEvent: "J'aime",
    likedEvent: 'Aimé',
    likesCount: "J'aime",
  },

  organizer: {
    title: 'Organisateur',
    upcomingEvents: 'Événements à venir',
    seeAll: 'Voir tout',
    events: 'Événements',
    followers: 'Abonnés',
    rating: 'Note',
    about: 'À propos',
    memberSince: 'Membre depuis',
    verifiedOrganizer: 'Organisateur vérifié',
    follow: 'Suivre',
    following: '✓ Abonné(e)',
    noUpcomingEvents: 'Aucun événement à venir',
    report: 'Signaler cet organisateur',
    followComingSoon: 'Fonctionnalité bientôt disponible',

    // Rich profile
    bio: 'À propos',
    noBio: 'Aucune description disponible pour le moment.',
    website: 'Site web',
    location: 'Lieu',
    members: 'Membres',
    loadError: "Impossible de charger les détails de l'organisateur",
  },

  // ============================================
  // Create Event - Event creation form
  // ============================================
  createEvent: {
    // Organization Selection
    organization: 'Organisation',
    selectOrganization: 'Sélectionnez une organisation',
    organizationRequired: 'Veuillez sélectionner une organisation',

    // Section Headers
    basicInformation: 'INFORMATIONS DE BASE',
    dateAndTime: 'DATE ET HEURE',
    locationSection: 'LIEU',
    additionalInfo: 'Informations supplémentaires',
    mediaAndAdditionalDetails: 'MÉDIAS ET DÉTAILS SUPPLÉMENTAIRES',

    // Field Labels
    title: 'Titre',
    description: 'Description',
    category: 'Catégorie',
    startTime: 'Heure de début',
    endTime: 'Heure de fin',
    country: 'Pays',
    postalCode: 'Code postal',
    streetAddress: 'Adresse',
    organizerName: "Nom de l'organisateur",
    contactEmail: 'E-mail de contact',
    helpNeeded: 'Aide nécessaire',
    helpDescription: 'De quelle aide avez-vous besoin ?',
    uploadImage: 'Télécharger une image',
    eventLink: "Lien de l'événement",
    coOrganizers: 'Co-organisateurs',
    volunteering: 'Bénévolat',
    volunteerRoles: 'Rôles et détails des bénévoles',
    disclaimer: 'Avertissement',

    // Placeholders
    titlePlaceholder: "Titre de l'événement",
    descriptionPlaceholder:
      "Décrivez votre événement - de quoi il s'agit, à quoi s'attendre, qui devrait y assister...",
    selectCategory: 'Sélectionnez une catégorie',
    categoryPlaceholder: 'Sélectionnez une catégorie',
    pickDateTime: 'Choisir date/heure',
    pickStartDateTime: 'Choisir date/heure de début',
    pickEndDateTime: 'Choisir date/heure de fin',
    countryPlaceholder: 'Sélectionnez un pays',
    selectCountry: 'Sélectionnez un pays',
    postalCodePlaceholder: 'Code postal',
    searchPostalCode: 'Rechercher par code postal ou commune...',
    streetAddressPlaceholder: 'Nom et numéro de rue',
    // Address autocomplete
    addressSearchPlaceholder: 'Rechercher une adresse…',
    addressSearching: 'Recherche…',
    addressNoResults: 'Aucune adresse correspondante',
    addressError: 'Échec de la recherche d’adresses. Veuillez réessayer.',
    addressUnavailable:
      'La recherche d’adresses est indisponible pour le moment. Vous pouvez quand même enregistrer.',
    clearStreetAddressAccessibilityLabel: 'Effacer l’adresse',
    organizerNamePlaceholder: 'Nom de votre organisation',
    contactEmailPlaceholder: 'contact@exemple.com',
    helpDescriptionPlaceholder: "Décrivez les bénévoles ou l'aide dont vous avez besoin...",
    eventLinkPlaceholder: 'https://www.exemple.com',
    selectCoOrganizers: 'Sélectionnez les groupes co-organisateurs',
    volunteerRolesPlaceholder:
      "Exemple:\n\nCOMMENT AIDER\n\n  DISTRIBUTION D'EAU\n    Rôle: Distribuer de l'eau.\n    Arrivée: 13h30\n    Point de rencontre: Station B\nPas d'inscription nécessaire, venez simplement !",
    disclaimerPlaceholder:
      "Informations de sécurité importantes, détails d'accessibilité, ce qu'il faut apporter...",

    // Helper text
    categoryHelper: 'Aide les gens à découvrir votre événement grâce aux filtres',
    endTimeHelper: "Laissez vide si la durée de l'événement est flexible",
    locationHelper:
      "Indiquez un lieu précis pour que les participants puissent trouver l'événement facilement",
    imageHelper:
      "Ajoutez jusqu'à 5 images — la première est la photo de couverture de votre événement",
    eventLinkHelper:
      "Partagez un lien vers la page de votre événement, le formulaire d'inscription ou plus d'informations",
    coOrganizersHelper: 'Organisations qui collaborent sur cet événement',
    maxCoOrganizers: "Vous pouvez ajouter jusqu'à {{max}} co-organisateurs.",
    volunteerHelper:
      'Informez les bénévoles de la manière dont ils peuvent soutenir votre événement',
    disclaimerHelper:
      'Informations importantes que les participants doivent connaître (sécurité, accessibilité, exigences, etc.)',

    // Checkbox labels
    needHelpCheckbox: "J'ai besoin d'aide pour cet événement",

    // Labels
    selected: 'Sélectionné',
    mainImageBadge: 'Principale',

    // Validation Messages
    titleRequired: "Le titre de l'événement est obligatoire",
    descriptionRequired: 'La description est obligatoire',
    categoryRequired: 'Veuillez sélectionner une catégorie',
    startTimeRequired: "L'heure de début est obligatoire",
    countryRequired: 'Le pays est obligatoire',
    postalCodeRequired: 'Le code postal est obligatoire',
    streetAddressRequired: "L'adresse est obligatoire",
    organizerNameRequired: "Le nom de l'organisateur est obligatoire",
    contactEmailRequired: "L'e-mail de contact est obligatoire",
    contactEmailInvalid: 'Veuillez entrer une adresse e-mail valide',
    endTimeBeforeStart: "L'heure de fin doit être après l'heure de début",
    invalidUrlFormat: "L'URL du site doit commencer par www., http:// ou https://",

    // Progress & Actions
    progressText: 'Champs obligatoires complétés',
    requiredFieldsProgress: 'Champs obligatoires complétés : {{completed}}/{{total}}',
    saveAsDraft: 'Enregistrer comme brouillon',
    publish: "Publier l'événement",
    creating: "Création de l'événement...",
    updating: "Mise à jour de l'événement...",

    // Template
    templateError: 'Erreur de modèle',
    templateErrorMessage:
      'Impossible de charger les données du modèle. Vous pouvez continuer à créer votre événement depuis zéro.',
    // Additional validation
    fillMandatoryFields: 'Veuillez remplir tous les champs obligatoires.',
    organizationsLoading: 'Veuillez attendre le chargement des organisations avant de soumettre.',
    // Accessibility
    closeAccessibilityLabel: "Fermer l'écran de création d'événement",
    progressAccessibilityLabel: 'Progression du formulaire : {{percentage}}% complété',
    removeImageAccessibilityLabel: "Supprimer l'image sélectionnée",
    addImageAccessibilityLabel: 'Ajouter une image à votre événement',
    imageAccessibilityHint: 'Ouvre la bibliothèque photo pour sélectionner une image',
    moveImageLeftAccessibilityLabel: "Déplacer l'image vers l'avant",
    moveImageRightAccessibilityLabel: "Déplacer l'image vers l'arrière",
    clearPostalCodeAccessibilityLabel: 'Effacer la sélection du code postal',
    clearCoOrganizersAccessibilityLabel: 'Effacer la sélection des co-organisateurs',

    // Error messages for data loading
    postalCodeLoadError: 'Échec du chargement des codes postaux. Veuillez réessayer.',
    permissionRequired: 'Autorisation requise',
    photoPermissionMessage:
      "Veuillez autoriser l'accès à la bibliothèque photo pour ajouter des images à votre événement.",
    imagePickerError: "Échec de la sélection de l'image. Veuillez réessayer.",
    maxImagesReached: "Vous pouvez ajouter jusqu'à {{max}} images.",
    missingFieldsError: 'Veuillez remplir les champs obligatoires suivants : {{fields}}',
  },

  // ============================================
  // My Events - User's created events
  // ============================================
  myEvents: {
    // Tabs
    upcoming: 'À venir',
    past: 'Passés',
    all: 'Tous les événements',

    // Empty States
    emptyUpcoming: 'Aucun événement à venir',
    emptyUpcomingMessage: "Vous n'avez pas encore créé d'événements à venir.",
    emptyPast: 'Aucun événement passé',
    emptyPastMessage: "Vous n'avez aucun événement passé.",
    emptyAll: 'Aucun événement',
    emptyAllMessage:
      "Vous n'avez pas encore créé d'événements. Créez votre premier événement pour commencer !",

    // List Headers
    listHeaderUpcoming: 'Vos événements à venir',
    listHeaderPast: 'Vos événements passés',
    listHeaderAll: 'Tous vos événements',

    // Subtitles
    eventsScheduled: '{{count}} événements programmés',
    completedEvents: '{{count}} événements terminés',
  },

  // ============================================
  // Templates - Event template management
  // ============================================
  templates: {
    title: "Modèles d'événements",
    emptyTitle: 'Aucun modèle pour le moment',
    emptyDescription:
      "Créez des modèles d'événements réutilisables pour gagner du temps lors de l'organisation d'événements similaires.",
    createButton: 'Créer un modèle',
    fromPastEvent: "Créer à partir d'un événement passé",
    editTemplate: 'Modifier le modèle',
    deleteTemplate: 'Supprimer le modèle',
    useTemplate: 'Utiliser le modèle',
    confirmDelete:
      'Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action ne peut pas être annulée.',
    // Additional keys for event-templates screen
    noTemplatesAvailable: 'Aucun modèle disponible',
    selectionEmptyDescription:
      "Vous n'avez pas encore de modèles. Créez-en un maintenant pour accélérer la création de vos événements.",
    createNewTemplate: 'Créer un nouveau modèle',
    loadingTemplates: 'Chargement des modèles',
    loadError: 'Échec du chargement des modèles',
    chooseTemplate: 'Choisir un modèle',
    loadingTemplate: 'Chargement du modèle...',
  },

  // ============================================
  // Account - Account management
  // ============================================
  account: {
    title: 'Détails du compte',
    fullName: 'Nom complet',
    email: 'E-mail',
    status: 'Statut',
    accountStatus: 'Statut du compte',
    verified: 'Vérifié',
    unverified: 'Non vérifié',

    // Organization & Role
    organization: 'Organisation',
    role: 'Rôle',
    roleOwner: 'Propriétaire',
    roleMember: 'Membre',
    roleAdmin: 'Administrateur',

    // Delete Account
    deleteTitle: 'Supprimer mon compte',
    deleteWarning: 'La suppression de votre compte entraînera :',
    deleteWarningItems: {
      loginInfo: 'La suppression de vos informations de connexion',
      accountInfo: 'La suppression des informations de votre compte',
      eventsData: "La suppression de toutes vos données d'événements",
      images: 'La suppression de toutes les images/photos de vos événements',
    },
    deleteConfirmation: 'Entrez votre e-mail pour confirmer',
    deletePasswordConfirmation: 'Entrez votre mot de passe pour confirmer',
    confirmButton: 'Supprimer mon compte',
    enterEmailConfirm: 'Veuillez entrer votre e-mail pour confirmer',
    incorrectEmail: 'E-mail incorrect. Veuillez réessayer',
    incorrectPassword: 'Mot de passe incorrect. Veuillez réessayer.',
    passwordRequired: 'Veuillez entrer votre mot de passe pour confirmer',
    deleteSuccess: 'Compte supprimé avec succès',
  },

  // ============================================
  // Errors - Error messages
  // ============================================
  errors: {
    generic: "Une erreur s'est produite. Veuillez réessayer.",
    network: 'Erreur réseau. Veuillez vérifier votre connexion internet.',
    notFound: "La ressource demandée n'a pas été trouvée.",
    unauthorized: "Vous n'êtes pas autorisé à effectuer cette action.",
    forbidden: 'Accès interdit.',
    serverError: 'Erreur serveur. Veuillez réessayer plus tard.',
    timeout: "Délai d'attente dépassé. Veuillez réessayer.",
    validation: 'Veuillez vérifier vos entrées et réessayer.',
    permissionDenied: 'Permission refusée.',
    unknownError: "Une erreur inconnue s'est produite.",
    organizationsLoadFailed: 'Échec du chargement des organisations. Veuillez réessayer.',
    rateLimit: {
      title: 'Trop de requêtes',
      message: 'Vous avez effectué trop de requêtes. Veuillez patienter un moment et réessayer.',
      loginMessage:
        'Trop de tentatives de connexion. Veuillez attendre 15 minutes avant de réessayer.',
      forgotPasswordMessage:
        'Trop de demandes de réinitialisation de mot de passe. Veuillez attendre une heure avant de réessayer.',
      deleteAccountMessage:
        'Trop de tentatives de suppression de compte. Veuillez attendre une heure avant de réessayer.',
      accountLockedMessage:
        'Trop de tentatives de connexion échouées. Veuillez réessayer plus tard.',
    },
  },

  // ============================================
  // Alerts - Success/error alerts for operations
  // ============================================
  alerts: {
    eventCreated: 'Événement créé avec succès !',
    eventUpdated: 'Événement mis à jour avec succès !',
    eventDeleted: '"{{name}}" supprimé avec succès',
    eventDeleteError: "Échec de la suppression de l'événement. Veuillez réessayer.",
    templateCreated: 'Modèle créé avec succès !',
    templateDeleted: 'Modèle supprimé avec succès',
    templateDeleteError: 'Échec de la suppression du modèle. Veuillez réessayer.',
    settingsSaved: 'Paramètres sauvegardés avec succès',
    settingsSaveError: 'Échec de la sauvegarde des paramètres. Veuillez réessayer.',
    networkError: 'Erreur réseau. Veuillez vérifier votre connexion et réessayer.',
    unknownError: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    fakeEventCreated: 'Faux événement créé avec succès !',
    feedbackFormError: "Impossible d'ouvrir le formulaire de feedback",
    feedbackFormOpenError: "Échec de l'ouverture du formulaire de feedback",
  },

  // ============================================
  // Calendar - Calendar integration
  // ============================================
  calendar: {
    permissionsNotGranted: 'Autorisations du calendrier requises',
    permissionsMessage:
      "ProtestBase a besoin d'accéder à votre calendrier pour ajouter des événements. Veuillez accorder les autorisations du calendrier dans les paramètres de votre appareil.",
    addSuccess: 'Événement ajouté à votre calendrier avec succès',
    addError: "Échec de l'ajout de l'événement au calendrier. Veuillez réessayer.",
    openError: "Impossible d'ouvrir le calendrier. Veuillez réessayer.",
    eventSaved: 'Événement enregistré avec succès !',
  },

  // ============================================
  // Help - Help needed section
  // ============================================
  help: {
    title: 'Aide Recherchée',
    subtitle: "L'organisateur recherche des bénévoles pour aider avec cet événement",
    volunteerNeeded: 'Bénévoles recherchés',
    whatsNeeded: 'Ce qui est nécessaire',
    noDetails:
      "Aucun détail supplémentaire fourni. Veuillez contacter l'organisateur pour plus d'informations.",
    gotIt: "J'ai compris",
  },

  // ============================================
  // Notifications - Saved-event day-of reminders
  // ============================================
  notifications: {
    channelName: 'Événements sauvegardés',
    actions: {
      directions: 'Itinéraire',
      remind1h: 'Me rappeler 1 h avant',
      viewEvent: "Voir l'événement",
      viewAgenda: 'Voir mon agenda du jour',
      remindEach1h: 'Me rappeler 1 h avant chaque',
    },
    dayOf: {
      title: "C'est aujourd'hui",
      digestTitle: "{{count}} manifestations aujourd'hui",
      body: '{{name}} · {{time}} — {{place}}.',
      bodyNoPlace: '{{name}} · {{time}}.',
      digestItem: '{{name}} à {{time}}',
      more: {
        one: '· et {{count}} autre',
        other: '· et {{count}} autres',
      },
    },
    remind1h: {
      title: 'Dans 1 heure',
      body: '{{name}} commence dans 1 heure — {{place}}.',
      bodyNoPlace: '{{name}} commence dans 1 heure.',
    },
    permissionNotice: 'Activez les notifications pour être prévenu·e le jour J',
  },

  // ============================================
  // Search - Search functionality
  // ============================================
  search: {
    placeholder: 'Rechercher des événements...',
    noResults: 'Aucun résultat trouvé',
    recentSearches: 'Recherches récentes',
    clearRecent: 'Effacer les récents',
  },

  // ============================================
  // Session - Session management
  // ============================================
  session: {
    expired: 'Session expirée',
    expiredMessage: 'Votre session a expiré. Veuillez vous reconnecter pour continuer.',
    signInAgain: 'Se reconnecter',
    securityAlert: 'Alerte de sécurité',
    securityAlertMessage:
      'Votre session a été interrompue pour des raisons de sécurité. Veuillez vous reconnecter.',
    signedInElsewhere: 'Connexion depuis un autre appareil',
    signedInElsewhereMessage:
      'Votre compte a été connecté depuis un autre appareil. Par sécurité, une seule session active est autorisée à la fois.',
  },

  // ============================================
  // About - About ProtestBase
  // ============================================
  about: {
    thankYou: "Merci d'avoir téléchargé ProtestBase, le calendrier des manifestations !",
    appDescription: 'ProtestBase est une application de calendrier conçue pour aider :',
    helpActivists:
      'Les militants à trouver des manifestations, grèves et ateliers facilement et en toute sécurité.',
    helpOrganizations:
      'Les organisations à tenir leurs militants informés des dernières informations sur les événements.',
    howToJoin: "Comment rejoindre en tant qu'organisation ?",
    howToJoinDescription: "Si vous faites partie d'une organisation, vous pouvez remplir le",
    onboardingForm: "formulaire d'inscription",
    howToJoinDescriptionContinued:
      "et nous vous contacterons pour commencer le processus d'intégration - nous devrons vérifier que vous avez l'autorisation de l'organisation pour créer un compte ProtestBase. Une fois votre compte approuvé, vous pourrez librement ajouter des événements au calendrier ProtestBase.",
    feedbackMatters: 'Votre avis compte',
    feedbackDescriptionStart:
      'Nous serions ravis de vous entendre ! Si vous avez des idées, des suggestions ou si vous repérez des problèmes, veuillez utiliser',
    feedbackForm: 'notre formulaire de commentaires.',
    feedbackDescriptionEnd: "Votre contribution aidera à façonner l'avenir de ProtestBase.",
    privacyPriority: 'Votre vie privée est notre priorité',
    privacyOrganizations:
      "Pour les organisations : Nous ne conservons que les informations de votre compte et les données d'événements. Nous ne partageons pas vos données avec des tiers, et nous ne le ferons jamais.",
    privacyUsers:
      'Pour les utilisateurs : Nous ne collectons aucune donnée personnelle des utilisateurs qui ne se connectent pas. Toutes les données que vous enregistrez (comme votre calendrier de manifestations) sont stockées localement sur votre téléphone et vous appartiennent.',
    aboutCreators: 'À propos des créateurs',
    creatorsDescription:
      "ProtestBase a été fondé par deux militants basés à Bruxelles qui croient au pouvoir de l'action collective. Même si nous manifestons tous pour des causes différentes, nos luttes sont toutes connectées et en nous donnant mutuellement du pouvoir, nous pouvons changer le monde.",
    joinUs: 'Rejoignez-nous pour construire un meilleur ProtestBase',
    joinUsDescription:
      "Ensemble, nous pouvons créer un outil qui soutient les manifestations, favorise la communauté et défend nos droits et valeurs démocratiques. Merci de faire partie de la communauté ProtestBase. Rendons l'action collective plus accessible et percutante !",
  },

  // ============================================
  // Report - Report event functionality
  // ============================================
  report: {
    title: "Signaler l'événement",
    description:
      'Veuillez décrire pourquoi vous signalez cet événement. Nous examinons tous les signalements attentivement pour maintenir une communauté sûre et respectueuse.',
    placeholder: 'Décrivez le problème...',
    submitButton: 'Soumettre le signalement',
    success: "Merci pour votre signalement. Nous l'examinerons dès que possible.",
    underConstruction:
      'Cette fonctionnalité est actuellement en construction. Veuillez revenir plus tard.',
  },

  // ============================================
  // Version - App version management
  // ============================================
  version: {
    updateRequired: {
      title: 'Mise à jour requise',
      message:
        "Une nouvelle version de ProtestBase est disponible. Veuillez mettre à jour pour continuer à utiliser l'application.",
      button: 'Mettre à jour maintenant',
    },
    updatePrompt: {
      title: 'Mise à jour disponible',
      message:
        'Une nouvelle version de ProtestBase est disponible avec des améliorations et de nouvelles fonctionnalités.',
      updateButton: 'Mettre à jour',
      laterButton: 'Plus tard',
    },
    maintenance: {
      title: 'Maintenance en cours',
      titlePrefix: 'On revient ',
      titleHighlight: 'très vite',
      message:
        'ProtestBase est temporairement indisponible car nous améliorons la sécurité de nos données et services. Patience, on revient avant que vous ayez fini votre pancarte.',
      badge: 'De retour bientôt',
    },
    connectionError: {
      title: 'Problème de connexion',
      message:
        "Nous n'avons pas pu joindre les serveurs de ProtestBase. Veuillez vérifier votre connexion Internet et réessayer.",
      button: 'Réessayer',
      badge: 'Vérifiez votre connexion',
    },
  },

  // ============================================
  // Integrity - Vérification d'intégrité de l'app
  // ============================================
  integrity: {
    failed: {
      title: "Impossible de vérifier l'application",
      message:
        "ProtestBase n'a pas pu confirmer que cet appareil exécute une version authentique et non modifiée de l'application. Cela arrive généralement sur les appareils rootés, les installations non officielles ou les émulateurs non pris en charge.",
      button: 'Réessayer',
      badge: 'Vérification échouée',
    },
    retryable: {
      title: 'Problème de vérification temporaire',
      message:
        "Nous n'avons pas pu terminer la vérification de cet appareil. C'est généralement temporaire — veuillez réessayer dans un moment.",
      button: 'Réessayer',
      badge: 'Vérification échouée',
    },
    deviceStateUnsupported: {
      title: "État de sécurité de l'appareil non pris en charge",
      message:
        "ProtestBase ne peut pas s'exécuter sur des appareils avec un bootloader déverrouillé, un système d'exploitation non vérifié, ou des certificats d'appareil expirés ou révoqués. Si vous pensez qu'il s'agit d'une erreur, contactez-nous.",
      badge: 'Appareil bloqué',
    },
    appConfig: {
      title: "Problème de configuration de l'application",
      message:
        "Quelque chose dans cette installation est mal configuré — le plus souvent il faut réinstaller l'application depuis le store officiel. Désinstallez puis réinstallez ProtestBase, puis réessayez.",
      badge: 'Réinstallation nécessaire',
    },
    devSetup: {
      title: 'Configuration développeur requise',
      message:
        'EXPO_PUBLIC_DEV_INTEGRITY_BYPASS est manquant dans votre environnement local. Ajoutez-le à .env.local avec la valeur utilisée par le backend, puis redémarrez Metro.',
      button: 'Réessayer',
      badge: 'Configuration requise',
    },
    unsupportedDevice: {
      title: "Cet appareil n'est pas pris en charge",
      message:
        'ProtestBase utilise des fonctions de sécurité matérielles qui ne sont pas disponibles sur cet appareil. iOS 14 ou Android 9 (ou plus récent) est requis.',
      badge: 'Appareil non pris en charge',
    },
  },

  // ============================================
  // Form - Form validation & messages
  // ============================================
  form: {
    required: 'Ce champ est obligatoire',
    optional: 'Optionnel',
    invalidFormat: 'Format invalide',
    tooShort: 'Ce champ est trop court',
    tooLong: 'Ce champ est trop long',
    selectOption: 'Veuillez sélectionner une option',
  },

  // ============================================
  // Become Organizer - Organizer application
  // ============================================
  becomeOrganizer: {
    title: 'Devenir organisateur',
    descriptionStart:
      'Vous souhaitez organiser et promouvoir vos propres événements ? Remplissez notre',
    applicationForm: 'formulaire de candidature',
    descriptionEnd: 'pour commencer.',
    createEventRequirement: "Vous devez faire partie d'une organisation pour créer des événements.",
  },

  // ============================================
  // Terms and Conditions
  // ============================================
  termsAndConditions: {
    title: 'Conditions générales de ProtestBase',
    lastUpdated: 'Dernière mise à jour : 21/04/2025',

    // Introduction
    intro1:
      "Bienvenue sur ProtestBase ! Nous sommes ravis de vous accueillir. Ces Conditions Générales (« Conditions ») régissent votre utilisation de ProtestBase, une application de calendrier de manifestations. L'application est conçue pour vous aider à trouver facilement des manifestations et les organisations qui les organisent. En utilisant l'Application, vous acceptez ces Conditions. Si vous n'êtes pas d'accord, veuillez vous abstenir d'utiliser l'Application.",
    intro2:
      "Notre mission est de soutenir les manifestations pacifiques et l'action collective, et nous nous engageons à créer un espace sûr, accueillant et convivial pour tous. Allons-y !",

    // Section 1: Acceptance of Terms
    section1Title: '1. Acceptation des conditions',
    section1Intro:
      'En utilisant ProtestBase, vous confirmez que vous remplissez les conditions suivantes :',
    section1Bullet1:
      'Si vous avez moins de 16 ans, vous avez examiné ces Conditions avec un parent ou tuteur et obtenu son consentement.',
    section1Bullet2:
      "Si vous créez un compte en tant qu'organisation, vous avez au moins 18 ans et avez l'autorité légale et la permission de représenter votre organisation.",

    // Section 2: Your Rights as an EU Citizen
    section2Title: "2. Vos droits en tant que citoyen de l'UE",
    section2Intro:
      "Chez ProtestBase, nous soutenons fermement le droit démocratique de manifester. En tant que citoyen de l'UE, vous êtes protégé par les droits suivants en vertu de la Charte des droits fondamentaux de l'UE :",
    section2Article11Title: "Article 11 : Liberté d'expression et d'information",
    section2Article11Text:
      "Toute personne a droit à la liberté d'expression. Ce droit comprend la liberté d'opinion et la liberté de recevoir ou de communiquer des informations ou des idées sans ingérence des autorités publiques et sans considération de frontières.",
    section2Article12Title: "Article 12 : Liberté de réunion et d'association",
    section2Article12Text:
      "Toute personne a droit à la liberté de réunion pacifique et à la liberté d'association à tous les niveaux, notamment en matière politique, syndicale et civique. Cela inclut le droit de fonder et d'adhérer à des syndicats pour la défense de ses intérêts.",
    section2Conclusion:
      "ProtestBase est conçu pour soutenir ces droits en aidant les utilisateurs à trouver et participer à des manifestations pacifiques. Nous croyons au pouvoir de l'action collective et nous efforçons de rendre la manifestation accessible à tous.",

    // Section 3: For Users (Without Log-In)
    section3Title: '3. Pour les utilisateurs (sans connexion)',
    section3Intro:
      "Si vous utilisez ProtestBase en tant qu'invité (sans vous connecter), voici ce que vous devez savoir :",
    section3_1Title: '3.1. Confidentialité des données',
    section3_1Bullet1:
      'Nous respectons votre vie privée. Nous ne collectons aucune donnée personnelle des utilisateurs qui ne se connectent pas.',
    section3_1Bullet2:
      'Toutes les manifestations que vous enregistrez ou avec lesquelles vous interagissez seront uniquement stockées localement sur votre appareil.',
    section3_2Title: "3.2. Signalement d'événements ou d'organisations",
    section3_2Bullet1:
      "Si vous rencontrez un événement ou une organisation qui enfreint les lois locales ou organise des événements dangereux, vous pouvez le signaler directement via l'Application.",
    section3_2Bullet2:
      "Nous examinerons tous les signalements et prendrons les mesures appropriées, ce qui peut inclure la suppression de l'événement ou de l'organisation de l'Application.",
    section3_3Title: '3.3. Votre responsabilité',
    section3_3Bullet1:
      "Bien que nous nous efforcions de fournir des informations exactes et à jour, ProtestBase ne peut garantir la sécurité ou la légalité de tout événement répertorié dans l'Application.",
    section3_3Bullet2:
      'Il vous incombe de vous assurer que votre participation à toute manifestation est légale et sûre pour vous-même et ceux qui vous entourent.',

    // Section 4: For Organisations (With Log-In)
    section4Title: '4. Pour les organisations (avec connexion)',
    section4Intro:
      "Si vous êtes une organisation utilisant ProtestBase pour promouvoir vos événements, voici ce qui s'applique à vous :",
    section4_1Title: '4.1. Inscription du compte',
    section4_1Bullet1:
      'Pour publier des événements sur ProtestBase, vous devez demander une connexion.',
    section4_1Bullet2:
      "Vous devez avoir au moins 18 ans ou avoir l'autorité légale pour représenter votre organisation.",
    section4_1Bullet3:
      'Nous pouvons demander des informations supplémentaires pour vérifier que votre organisation est légitime.',
    section4_2Title: '4.2. Confidentialité des données pour les organisations',
    section4_2Bullet1:
      'Contrairement aux utilisateurs invités, les organisations ne bénéficient pas du même niveau de confidentialité car nous devons vérifier votre identité et garantir la légitimité de votre organisation.',
    section4_2Bullet2:
      'En créant un compte, vous acceptez de fournir des informations exactes et à jour sur votre organisation.',
    section4_3Title: '4.3. Responsabilité du contenu',
    section4_3Bullet1:
      'Vous êtes seul responsable du contenu que vous publiez sur ProtestBase, y compris les détails des événements, les descriptions et tout matériel lié.',
    section4_3Bullet2: 'Vous acceptez de ne pas publier de contenu qui :',
    section4_3Nested1: 'Enfreint les lois locales ou promeut la violence.',
    section4_3Nested2: 'Est faux, trompeur ou nuisible.',
    section4_3Nested3: "Porte atteinte aux droits d'autrui.",
    section4_3Bullet3:
      "Cela inclut la promotion du racisme, du sionisme, du suprémacisme, du sectarisme, du néolibéralisme, du colonialisme, de l'impérialisme ou des sectes. ProtestBase veut unir les gens autour des enjeux sociétaux, pas les diviser.",
    section4_4Title: '4.4. Assurer la sécurité',
    section4_4Bullet1:
      "En tant qu'organisateur, vous avez le devoir d'assurer la sécurité des manifestants lors de vos événements.",
    section4_4Bullet2: 'Cela inclut :',
    section4_4Nested1:
      "Fournir des informations claires sur l'objectif de l'événement, le lieu et les mesures de sécurité.",
    section4_4Nested2: 'Se conformer à toutes les lois et réglementations applicables.',
    section4_4Nested3:
      'Prendre des mesures pour minimiser les risques et assurer un environnement pacifique.',

    // Section 5: Disclaimer of Responsibility
    section5Title: '5. Clause de non-responsabilité',
    section5Intro:
      'ProtestBase est une plateforme pour découvrir et promouvoir des manifestations, mais nous ne pouvons être tenus responsables de :',
    section5Bullet1: "Les actions des individus ou organisations utilisant l'Application.",
    section5Bullet2:
      "Tout préjudice, blessure ou problème juridique résultant de la participation ou de l'organisation d'une manifestation.",
    section5Bullet3: "L'exactitude ou la légalité des événements répertoriés dans l'Application.",
    section5Conclusion: 'En utilisant ProtestBase, vous reconnaissez et acceptez ces limitations.',

    // Section 6: Safety First
    section6Title: '6. La sécurité avant tout',
    section6Intro:
      'Nous nous soucions profondément de la sécurité des manifestants. Bien que nous ne puissions pas contrôler ce qui se passe lors des événements, nous encourageons les organisateurs et les participants à :',
    section6Bullet1: 'Privilégier les manifestations pacifiques et légales.',
    section6Bullet2: 'Respecter les lois et réglementations locales.',
    section6Bullet3: 'Veiller les uns sur les autres et agir de manière responsable.',

    // Section 7: Changes to These Terms
    section7Title: '7. Modifications de ces conditions',
    section7Text:
      "Nous pouvons mettre à jour ces Conditions de temps en temps. Si nous apportons des modifications significatives, nous vous en informerons via l'Application ou par e-mail. Votre utilisation continue de ProtestBase après l'entrée en vigueur des modifications signifie que vous acceptez les Conditions mises à jour.",

    // Section 8: Governing Law
    section8Title: '8. Droit applicable',
    section8Text:
      "Ces Conditions sont régies par les lois de l'Union européenne et de la Belgique. Tout litige découlant de ces Conditions sera résolu devant les tribunaux de Belgique.",

    // Section 9: Contact Us
    section9Title: '9. Nous contacter',
    section9Intro: "Si vous avez des questions ou besoin d'assistance, veuillez nous contacter à :",

    // Conclusion
    conclusion:
      "Merci d'utiliser ProtestBase ! Ensemble, nous pouvons rendre l'action collective plus accessible, pacifique et impactante.",
  },

  // ============================================
  // Not Found - 404 screen
  // ============================================
  notFound: {
    headerTitle: 'Oups !',
    title: "Cette page n'existe pas.",
    goHome: "Retour à l'accueil !",
  },

  // ============================================
  // Draft - Event draft management
  // ============================================
  draft: {
    checkingDraft: 'Vérification du brouillon enregistré...',
    resumeTitle: 'Reprendre le brouillon ?',
    resumeMessage:
      "Vous avez un brouillon d'événement non enregistré. Voulez-vous reprendre où vous vous êtes arrêté ?",
    resumeDraft: 'Reprendre le brouillon',
    startFresh: 'Recommencer',
    closeTitle: 'Modifications non enregistrées',
    closeMessage: 'Vous avez des modifications non enregistrées. Que souhaitez-vous faire ?',
    discard: 'Supprimer',
    saveDraft: 'Enregistrer le brouillon',
    keepEditing: 'Continuer à modifier',
    saveWarningTitle: 'Problème de sauvegarde automatique',
    saveWarningMessage:
      "Votre brouillon n'a pas pu être enregistré automatiquement. Vos modifications pourraient être perdues si vous quittez cet écran. Veuillez essayer d'enregistrer manuellement ou vérifier le stockage de votre appareil.",
  },

  // ============================================
  // Drafts - Backend draft events (save-now-publish-later).
  // NOTE: distinct from the `draft` namespace above (local form-autosave).
  // ============================================
  drafts: {
    editTitle: 'Modifier le brouillon',
    saveAsDraft: 'Enregistrer comme brouillon',
    savedConfirmation: 'Brouillon enregistré.',
    save: 'Enregistrer le brouillon',
    publish: 'Publier',
    published: 'Événement publié.',
    publishIssuesTitle: 'Pas encore prêt à publier',
    issueDescription: 'Ajoutez une description.',
    issueCategory: 'Choisissez au moins une catégorie.',
    issueLocation: 'Ajoutez un lieu (ville ou adresse).',
    issueStartTime: 'Définissez une date de début dans le futur.',
    issueIncomplete: 'Certaines informations requises sont manquantes.',
    delete: 'Supprimer le brouillon',
    deleted: 'Brouillon supprimé.',
    deleteConfirmTitle: 'Supprimer le brouillon ?',
    deleteConfirmMessage:
      'Ce brouillon sera définitivement supprimé. Cette action est irréversible.',
  },

  // ============================================
  // Share - Event sharing
  // ============================================
  share: {
    cta: 'Rejoignez cet événement sur ProtestBase !',
    errorTitle: 'Erreur',
    eventNotFound: 'Événement introuvable ou données incomplètes.',
    shareFailed: "Échec du partage de l'événement. Veuillez réessayer.",
  },

  // ============================================
  // Privacy Center - Privacy transparency screen
  // ============================================
  privacyCenter: {
    // Header
    title: 'Ta vie privée, protégée',
    subtitle:
      "Pour nous, la vie privée c'est un droit, pas une option. Voici comment on protège la tienne.",

    // What we don't collect section
    notCollectedTitle: "Ce qu'on ne collecte pas",
    noIpAddresses: 'Adresses IP - on ne trace pas ta connexion',
    noTrackingCookies: 'Cookies de tracking - zéro analytics, zéro fingerprinting',
    noPersonalData: 'Données perso - pas besoin de compte',
    noBehavioralData: 'Données comportementales - on sait pas ce que tu regardes ou sauvegardes',

    // What stays on device section
    onDeviceTitle: 'Ce qui reste sur ton gsm',
    onDeviceDescription:
      'Quand tu sauvegardes un événement ou définis tes préférences, tout reste sur ton gsm. On voit rien, on stocke rien, on synchronise rien.',
    viewCounterNote: 'Le compteur de vues ? Complètement anonyme, aucune info sur toi.',

    // Where we operate section
    locationTitle: 'Où on opère',
    locationDescription:
      'Nos serveurs sont situés en Europe et sont entièrement conformes au RGPD.',

    // Transparency section
    transparencyTitle: 'Transparence',
    transparencyDescription:
      'Notre code source est publiquement disponible, comme ça tu peux vérifier toi-même. Fais confiance, mais vérifie.',

    // For organizations section
    forOrgsTitle: 'Pour les orgas',
    forOrgsDescription:
      "Si t'as un compte orga pour gérer des events, on garde trace de tes connexions (sécu de base). Tout ce qui précède s'applique aux utilisateurs sans compte.",

    // Permissions section
    permissionsTitle: "Autorisations de l'appli",
    permissionsDescription:
      "ProtestBase demande des autorisations uniquement quand c'est nécessaire :",
    photoReadPermission: 'Photos (Lecture)',
    photoReadDescription: 'Pour ajouter des images aux events que tu crées',
    calendarPermission: 'Agenda',
    calendarDescription: 'Pour ajouter des events à ton agenda',
    notificationsPermission: 'Notifications',
    notificationsDescription: 'Pour te rappeler le jour J des events que tu as enregistrés',

    // Permission status labels
    statusGranted: 'Autorisé',
    statusDenied: 'Refusé',
    statusUndetermined: 'Pas encore demandé',
    openSettings: 'Ouvrir les Réglages',
    manageAllPermissions: 'Gérer les autorisations dans les Réglages',
  },

  // ============================================
  // Privacy Info Modal - Saved events privacy info
  // ============================================
  privacyInfo: {
    title: 'Votre vie privée compte',
    subtitle: 'Voici comment nous protégeons vos données lorsque vous sauvegardez des événements',
    localTitle: 'Stocké localement uniquement',
    localBody:
      'Tous les événements sauvegardés sont stockés exclusivement sur votre appareil. Nous ne téléchargeons jamais vos événements sauvegardés sur nos serveurs.',
    anonymousTitle: 'Complètement anonyme',
    anonymousBody:
      'Nous suivons le nombre total de sauvegardes pour chaque événement, mais nous ne savons jamais qui a sauvegardé quoi. Votre activité est 100% privée.',
    noAccountTitle: 'Aucun compte requis',
    noAccountBody:
      'Parcourez et sauvegardez des événements sans créer de compte. Vos données restent avec vous, toujours.',
    gotIt: "J'ai compris",
    closeAccessibility: 'Fermer les informations de confidentialité',
  },

  // ============================================
  // Permissions - Pre-permission dialogs
  // ============================================
  permissions: {
    photoLibraryPreTitle: 'Ajouter une image',
    photoLibraryPreMessage:
      "ProtestBase a besoin d'accéder à tes photos pour ajouter des images à tes événements. Tes photos restent sur ton appareil.",
    calendarPreTitle: 'Ajouter au calendrier',
    calendarPreMessage:
      "ProtestBase a besoin d'accéder à ton calendrier pour ajouter cet événement. On ne peut pas voir tes autres événements.",
    photoSavePreTitle: "Enregistrer l'image",
    photoSavePreMessage:
      "ProtestBase a besoin d'accéder à tes photos pour enregistrer cette image.",
    allowAccess: 'Autoriser',
    notNow: 'Pas maintenant',
  },
};

// Export as default and named export
export default fr;
export { fr };
