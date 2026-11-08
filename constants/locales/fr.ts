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
    nearMe: 'Près de moi',
  },

  // ============================================
  // Home area - « Près de moi » sans GPS
  // ============================================
  homeArea: {
    title: 'Ma zone',
    settingsRow: 'Ma zone',
    scopeChip: 'Ma zone',
    pickerPlaceholder: 'Rechercher une ville, province ou région…',
    clear: 'Effacer ma zone',
    empty:
      'Choisissez votre zone pour afficher d’abord les actions à proximité et y centrer la carte. Sans GPS — votre choix reste sur cet appareil.',
  },

  // ============================================
  // Filters - Filter screens and options
  // ============================================
  filters: {
    title: 'Filtres',
    country: 'Pays',
    countryAll: 'Tous',
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
    loadingOrganizations: 'Chargement des organisations…',
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
    saving: 'Enregistrement…',
    publishing: 'Publication…',
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
  // Connectivity - Offline awareness
  // ============================================
  connectivity: {
    banner: 'Vous êtes hors ligne. Contenu enregistré affiché.',
    actionUnavailableOffline:
      'Vous êtes hors ligne. Connectez-vous à Internet pour effectuer cette action.',
    cannotRefreshOffline:
      "Impossible d'actualiser hors ligne. Les événements déjà chargés sont affichés.",
  },

  // ============================================
  // Template - Event template management
  // ============================================
  template: {
    // Titles
    createTitle: 'Nouveau modèle',
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
    namePlaceholder: 'ex. : Veillée mensuelle pour le logement',
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
    dataTooLong: 'Ce modèle est trop long pour être enregistré. Raccourcissez la description.',
    volunteerDescMissing: 'Veuillez décrire comment les bénévoles peuvent aider.',
    saveFromEventTitle: 'Enregistrer comme modèle',
    saveFromEventDesc: 'Réutiliser les détails de cet événement',
    keepGroup: 'Garder',
    datesNeverSaved: 'Les dates ne sont jamais enregistrées dans un modèle.',
    partText: 'Titre et texte',
    partLocation: 'Lieu',
    nameHelp: 'Seule votre organisation voit ce nom.',
    dateAsked: 'Date et heure',
    dateAskedHint: 'Vous les choisissez en utilisant le modèle',

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
    startGroup: 'Commencer',
    templatesGroup: 'Vos modèles',
    resume: 'Reprendre',
    unfinished: 'Inachevé',
    untitled: 'Événement sans titre',
    blankTitle: 'Planifier une nouvelle action',
    blankSubtitle: "Partir d'un événement vierge",
    templateTitle: 'Utiliser un modèle',
    templateSubtitle: "Pré-remplir avec les détails d'un événement enregistré",
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
    discardTitle: 'Abandonner les modifications ?',
    discardMessage:
      'Vous avez des modifications non enregistrées. Si vous quittez maintenant, elles seront perdues.',
    keepEditing: 'Continuer les modifications',
    discardConfirm: 'Abandonner',
    // Under the date field of a date-only event. Picking a clock time is what
    // turns it into a normal timed event — there is no toggle.
    allDayHint: 'Aucune heure de début. Choisissez-en une pour donner une heure à cet événement.',
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
    accountDisabledMessage:
      "Ce compte a été désactivé. Si vous pensez qu'il s'agit d'une erreur, contactez ProtestBase.",
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
    troubleSigningInTitle: 'Un problème pour vous connecter ?',
    troubleSigningInBody: 'Réinitialisez votre mot de passe pour vous reconnecter.',
    migrationBannerTitle: 'Réinitialisation du mot de passe requise',
    migrationBannerMessage:
      'Nous avons récemment migré nos systèmes pour améliorer la sécurité. Votre ancien mot de passe ne fonctionnera plus.',
    migrationBannerAction: 'Réinitialiser le mot de passe',
  },

  // ============================================
  // Two-step verification: sign-in step, setup, step-up
  // ============================================
  mfa: {
    challengeTitle: 'Validation en deux étapes',
    challengeIntro: "Saisissez le code à 6 chiffres de votre application d'authentification.",
    recoveryIntro:
      "Saisissez un de vos codes de secours. Chaque code ne fonctionne qu'une seule fois.",
    passkeyOnly:
      "Ce compte se connecte avec une clé d'accès, que cette version de l'application ne prend pas encore en charge. Saisissez plutôt un de vos codes de secours.",
    codeLabel: 'Code',
    codePlaceholder: '123456',
    recoveryCodeLabel: 'Code de secours',
    recoveryCodePlaceholder: 'ABCDE-23456',
    verify: 'Valider',
    useRecoveryCode: 'Utiliser plutôt un code de secours',
    useAuthenticator: "Utiliser plutôt le code de l'application",
    backToSignIn: 'Retour à la connexion',
    invalidCodeFormat:
      "Saisissez les 6 chiffres affichés dans votre application d'authentification.",
    invalidRecoveryFormat:
      'Un code de secours compte 10 lettres et chiffres, par exemple ABCDE-23456.',
    wrongCode: 'Ce code est incorrect ou a expiré.',
    attemptsLeft: {
      one: 'Il reste 1 essai.',
      other: 'Il reste {{count}} essais.',
    },
    blocked:
      "Ce compte est temporairement bloqué après trop de codes incorrects, peut-être saisis par une autre personne qui l'utilise. Réessayez plus tard.",
    lockedFor: {
      one: "Ce compte est bloqué après trop de codes incorrects, peut-être saisis par une autre personne qui l'utilise. Réessayez dans 1 minute.",
      other:
        "Ce compte est bloqué après trop de codes incorrects, peut-être saisis par une autre personne qui l'utilise. Réessayez dans {{count}} minutes.",
    },
    expiredTitle: 'Connexion expirée',
    expiredMessage: 'Cette connexion a pris trop de temps. Reconnectez-vous.',
    setupExpiredMessage:
      "Cette configuration a pris trop de temps. Reconnectez-vous pour recommencer. Si vous avez ajouté ProtestBase à votre application d'authentification, supprimez cette entrée : ses codes ne fonctionneront pas.",
    alreadyEnrolledTitle: 'Déjà activée',
    alreadyEnrolledMessage:
      "La validation en deux étapes vient d'être activée pour ce compte, peut-être par une autre personne qui l'utilise. Reconnectez-vous avec un code de l'application d'authentification utilisée pour cette activation, ou avec un code de secours. Si vous avez ajouté ProtestBase à votre application ici, supprimez cette entrée : ses codes ne fonctionneront pas.",
    recoveryCodesLowTitle: 'Peu de codes de secours',
    recoveryCodesLow: {
      zero: "Vous avez utilisé votre dernier code de secours. Désormais, vous ne pourrez vous connecter qu'avec votre application d'authentification.",
      one: "Il vous reste 1 code de secours. Une fois utilisé, vous ne pourrez vous connecter qu'avec votre application d'authentification.",
      other:
        "Il vous reste {{count}} codes de secours. Une fois utilisés, vous ne pourrez vous connecter qu'avec votre application d'authentification.",
    },
    recoveryCodesLowPasskey: {
      zero: "Vous avez utilisé votre dernier code de secours, et cette application ne prend pas encore en charge votre clé d'accès. Pour vous reconnecter ici, créez de nouveaux codes de secours sur le site de ProtestBase.",
      one: "Il vous reste 1 code de secours, et cette application ne prend pas encore en charge votre clé d'accès. Créez de nouveaux codes de secours sur le site de ProtestBase avant de l'utiliser.",
      other:
        "Il vous reste {{count}} codes de secours, et cette application ne prend pas encore en charge votre clé d'accès. Créez de nouveaux codes de secours sur le site de ProtestBase avant qu'ils ne soient épuisés.",
    },
    enrollTitle: 'Activer la validation en deux étapes',
    enrollIntro:
      "ProtestBase demande désormais, à la connexion, un code fourni par une application d'authentification. À configurer une fois sur ce téléphone. Si votre application contient déjà une entrée ProtestBase pour ce compte, issue d'une configuration précédente, supprimez-la : ses codes ne fonctionneront pas.",
    stepAddTitle: "1. Ajoutez ProtestBase à votre application d'authentification",
    openAuthenticator: "Ajouter à l'application d'authentification",
    openAuthenticatorHelp:
      "Ce bouton ouvre l'application que votre téléphone utilise pour les codes de vérification. Si ProtestBase n'y apparaît pas, ou si vous utilisez une autre application, ajoutez-le avec la clé de configuration ci-dessous.",
    noAuthenticatorTitle: "Aucune application d'authentification",
    noAuthenticatorMessage:
      "Aucune application de ce téléphone n'a pu ouvrir le lien de configuration. Installez une application d'authentification, ou ajoutez-y ProtestBase avec la clé de configuration ci-dessous.",
    manualKeyLabel: 'Clé de configuration',
    manualKeyHelp:
      "Appuyez longuement sur la clé pour la copier, puis collez-la là où votre application d'authentification permet de saisir une clé manuellement.",
    stepCodeTitle: '2. Saisissez le code à 6 chiffres affiché par votre application',
    confirm: 'Confirmer',
    setupFailed: 'Impossible de lancer la configuration. Vérifiez votre connexion et réessayez.',
    recoveryCodesTitle: 'Enregistrez vos codes de secours',
    recoveryCodesIntro:
      "Si vous perdez votre application d'authentification, chaque code vous permet de vous connecter une fois. Gardez-les en lieu sûr, par exemple dans un gestionnaire de mots de passe : ils ne seront plus affichés.",
    shareRecoveryCodes: 'Partager les codes',
    recoveryCodesShareTitle: 'Codes de secours ProtestBase',
    savedRecoveryCodes: 'Je les ai enregistrés',
    reauthTitle: "Confirmez qu'il s'agit bien de vous",
    reauthIntro:
      "Pour supprimer votre compte, saisissez le code à 6 chiffres de votre application d'authentification.",
    reauthRecoveryIntro: 'Pour supprimer votre compte, saisissez un de vos codes de secours.',
    reauthExpired: 'Le délai est dépassé. Saisissez un nouveau code.',
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
    // Shown instead of a clock time when the event is date-only (all_day).
    allDay: 'Toute la journée',
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
    notFoundTitle: "Cette organisation n'existe plus",
    notFoundBody: "Elle a été supprimée, son profil n'est donc plus disponible.",
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
    uploadImage: 'Photos',
    addCoverPhoto: 'Ajouter une photo de couverture',
    eventLink: "Lien de l'événement",
    coOrganizers: 'Co-organisateurs',
    volunteering: 'Bénévoles',
    volunteerRoles: 'Comment aider ?',
    disclaimer: 'Bon à savoir',

    // Placeholders
    titlePlaceholder: "Titre de l'événement",
    descriptionPlaceholder: "De quoi s'agit-il, qui devrait venir ?",
    selectCategory: 'Sélectionnez une catégorie',
    categoryPlaceholder: 'Sélectionnez une catégorie',
    pickDateTime: 'Choisir date/heure',
    pickStartDateTime: 'Choisir date/heure de début',
    pickEndDateTime: 'Choisir date/heure de fin',
    countryPlaceholder: 'Sélectionnez un pays',
    selectCountry: 'Sélectionnez un pays',
    postalCodePlaceholder: 'Code postal',
    searchPostalCode: 'Rechercher par code postal ou commune...',
    localityLabel: 'Localité',
    searchLocality: 'Rechercher une localité...',
    communeLabel: 'Commune',
    searchCommune: 'Rechercher une commune ou un code postal...',
    searchNoResults: 'Aucun résultat',
    searchMinLength: 'Saisissez au moins {{count}} caractères',
    streetAddressPlaceholder: 'Nom et numéro de rue',
    // Address autocomplete
    addressSearchPlaceholder: 'Rechercher une adresse…',
    addressSearching: 'Recherche…',
    addressNoResults: 'Aucune adresse correspondante',
    addressError: 'Échec de la recherche d’adresses. Veuillez réessayer.',
    addressUnavailable:
      'La recherche d’adresses est indisponible pour le moment. Vous pouvez quand même enregistrer.',
    clearStreetAddressAccessibilityLabel: 'Effacer l’adresse',
    // Postal confirmation card (filled state)
    postalFilledFromAddress: 'Rempli automatiquement à partir de l’adresse',
    postalChange: 'Modifier',
    changePostalAccessibilityLabel: 'Modifier le code postal',
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
      "Commencez par l'adresse — le code postal se remplit automatiquement. Vous pouvez aussi le définir manuellement.",
    locationHelperLu: "Recherchez l'adresse, ou choisissez la localité ci-dessous.",
    locationHelperFr: "Choisissez la commune, ou recherchez l'adresse.",
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
    needHelpCheckbox: 'Nous cherchons des bénévoles',

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
    invalidUrlFormat: 'Saisissez un lien valide, comme example.com.',
    disclaimerTooLong: 'Limitez ce texte à {{max}} caractères.',
    volunteerTooLong: 'Limitez ce texte à {{max}} caractères.',
    linkTooLong: 'Limitez le lien à {{max}} caractères.',
    fromTemplate: 'Du modèle : {{name}}',
    pickTheDate: "Choisissez la date et l'heure",
    onlyThingLeft: 'Il ne reste que ça',
    starts: 'Début',
    ends: 'Fin',
    noSetEnd: 'Sans heure de fin',
    endsAnotherDay: 'Finit un autre jour',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    hours: {
      one: '1 h',
      other: '{{count}} h',
    },
    publishCheckTitle: 'Publier cet événement ?',
    publishCheckBody: 'Il devient public tout de suite sur Explorer, Carte et Calendrier.',
    publishNow: 'Publier maintenant',
    timePlaceholder: 'Heure',
    brusselsTime: '{{time}}, heure de Bruxelles',
    namePlaceholder: 'Nommez votre action',
    byOrganization: 'par {{name}}',
    addDateTime: "Ajouter la date et l'heure",
    addPlace: 'Ajouter un lieu',
    link: 'Lien',
    where: 'Où',
    when: 'Quand',
    addMore: 'Ajouter',
    whenRange: '{{start}} à {{end}}',
    fixBeforePublishing: {
      one: '1 point à corriger avant de publier',
      other: '{{count}} points à corriger avant de publier',
    },
    fixBeforeSaving: {
      one: "1 point à corriger avant d'enregistrer",
      other: "{{count}} points à corriger avant d'enregistrer",
    },

    // Progress & Actions
    progressText: 'Champs obligatoires complétés',
    stillNeeded: 'Il manque : {{fields}}',
    allRequiredFilled: 'Tous les champs obligatoires sont remplis',
    neededFields: {
      title: 'titre',
      description: 'description',
      category: 'catégorie',
      date: 'date',
    },
    saveAsDraft: 'Brouillon',
    publish: 'Publier',
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
    imagePickerError: "Échec de la sélection de l'image. Veuillez réessayer.",
    imageProcessingError: {
      one: "Nous n'avons pas pu traiter une photo, elle n'a donc pas été ajoutée. Essayez-en une autre.",
      other:
        "Nous n'avons pas pu traiter {{count}} photos, elles n'ont donc pas été ajoutées. Essayez-en d'autres.",
    },
    maxImagesReached: "Vous pouvez ajouter jusqu'à {{max}} images.",
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

    // Upcoming timeline (organizer redesign)
    today: "Aujourd'hui",
    nowLabel: 'Live',
    nextUp: 'À suivre',
    startsIn: {
      minutes: 'commence dans {{count}} min',
      hours: 'commence dans {{count}} h',
      days: {
        one: 'commence dans {{count}} jour',
        other: 'commence dans {{count}} jours',
      },
    },
    nextUpSimultaneous: '{{count}} événements à {{time}}',
    // French keeps the noun singular after zero, but the default i18n-js
    // pluralizer maps 0 to 'other' — the explicit 'zero' variant wins.
    eventCount: {
      zero: '{{count}} événement',
      one: '{{count}} événement',
      other: '{{count}} événements',
    },
    noLocationSet: 'aucun lieu défini',
    addLocation: 'Ajouter un lieu',
    viewsPill: {
      zero: '{{formatted}} vue',
      one: '{{formatted}} vue',
      other: '{{formatted}} vues',
    },
    emptyUpcomingHelp: "Les événements que vous publiez apparaîtront ici jusqu'à leur fin.",
    viewPastEvents: 'Voir les événements passés',

    // Subtitles
    eventsScheduled: '{{count}} événements programmés',
    completedEvents: '{{count}} événements terminés',
  },

  // ============================================
  // Templates - Event template management
  // ============================================
  templates: {
    editTemplate: 'Modifier le modèle',
    deleteTemplate: 'Supprimer le modèle',
    confirmDelete:
      'Êtes-vous sûr de vouloir supprimer ce modèle ? Cette action ne peut pas être annulée.',
    loadingTemplates: 'Chargement des modèles',
    loadError: 'Échec du chargement des modèles',
    loadingTemplate: 'Chargement du modèle...',

    // Launchpad redesign (June 2026)
    subtitle: 'Créez un nouvel événement en quelques secondes',
    newTemplateTile: 'Nouveau modèle',
    newTemplateTileSub: 'Enregistrez les détails une fois, réutilisez-les à chaque fois',
    newEventAction: 'Nouvel événement',
    duplicate: 'Dupliquer',
    copySuffix: '{{name}} (copie)',
    tileMenu: 'Options du modèle',
    reusePastEvent: 'Réutiliser un événement passé',
    orReusePastEvent: 'Ou réutilisez un événement passé',
    use: 'Utiliser',
    placeholderCard: 'Vos modèles enregistrés apparaîtront ici',
    hintDefault: 'Touchez un modèle pour créer un événement avec ses détails préremplis.',
    hintEmpty: 'Utiliser un événement passé crée automatiquement un modèle.',
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
    },
    deleteImpact: {
      checking: 'Vérification de votre organisation…',
      ownContent: 'La suppression des événements et modèles que vous avez créés, avec leurs photos',
      orgDeleted:
        'La suppression de {{name}}, avec tous ses événements, brouillons compris, leurs photos et ses modèles, car vous en êtes le dernier membre',
      orgKept:
        'Le maintien de {{name}} pour ses autres membres, avec tous ses événements, leurs photos et ses modèles, y compris ceux que vous avez créés',
      nameReplaced:
        "L'affichage de {{name}} à la place de votre nom sur les événements que vous avez créés",
      ownerTransfer: 'Le transfert de la propriété de {{name}} à son membre le plus ancien',
      orgUnknown:
        "La suppression de votre organisation, avec tous ses événements, leurs photos et ses modèles, si vous en êtes le dernier membre. Si elle a d'autres membres, elle leur reste, avec tout son contenu, et son nom remplace le vôtre",
      sharedHint:
        'Pour retirer de {{name}} vos événements à venir et vos brouillons, supprimez-les avant de supprimer votre compte. Les événements passés ne peuvent pas être supprimés : ils restent au nom de {{name}}.',
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
    unreachable: 'Déconnecté',
    unreachableMessage:
      'ProtestBase était injoignable pour garder votre session ouverte. Vos brouillons et vos événements enregistrés sont toujours sur ce téléphone. Reconnectez-vous une fois de retour en ligne.',
    securityAlert: 'Alerte de sécurité',
    securityAlertMessage:
      'Votre session a été interrompue pour des raisons de sécurité. Veuillez vous reconnecter.',
    signedInElsewhere: 'Connexion depuis un autre appareil',
    signedInElsewhereMessage:
      'Votre compte a été connecté depuis un autre appareil. Par sécurité, une seule session active est autorisée à la fois.',
    accountDisabled: 'Compte désactivé',
    accountDisabledMessage:
      "Ce compte a été désactivé, vous avez donc été déconnecté. Vous pouvez continuer à utiliser ProtestBase en tant qu'invité. Si vous pensez qu'il s'agit d'une erreur, contactez ProtestBase.",
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
    lastUpdated: 'Dernière mise à jour : 8 novembre 2026',

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
      "Nous respectons votre vie privée. Vous n'avez pas besoin de compte, et nous ne vous demandons ni votre nom, ni votre adresse e-mail, ni votre localisation pour parcourir les événements.",
    section3_1Bullet2:
      'Les manifestations que vous enregistrez, aimez ou suivez sont stockées sur votre appareil. Notre Politique de confidentialité explique précisément ce qui parvient à nos serveurs et pourquoi.',
    privacyPolicyLink: 'Lire notre Politique de confidentialité',
    section3_2Title: "3.2. Signalement d'événements ou d'organisations",
    section3_2Bullet1:
      'Si vous rencontrez un événement ou une organisation qui enfreint les lois locales ou organise des événements dangereux, vous pouvez nous le signaler par e-mail à :',
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
      'Pour vérifier que votre organisation est légitime, nous avons besoin de certaines informations sur vous et sur votre organisation. Notre Politique de confidentialité explique ce que nous conservons, pendant combien de temps et comment supprimer votre compte.',
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
    replaceTitle: 'Remplacer votre événement inachevé ?',
    replaceMessage:
      'Vous avez un événement inachevé sur ce téléphone. En commencer un nouveau le supprime.',
    replaceConfirm: 'Nouveau',
    photosMissingTitle: 'Des photos ont disparu',
    photosMissingMessage:
      'Votre téléphone a effacé des photos de cet événement. Ajoutez-les à nouveau.',
    checkingDraft: 'Vérification du brouillon enregistré...',
    resumeTitle: 'Reprendre le brouillon ?',
    resumeMessage:
      "Vous avez un brouillon d'événement non enregistré. Voulez-vous reprendre où vous vous êtes arrêté ?",
    resumeDraft: 'Reprendre le brouillon',
    startFresh: 'Recommencer',
    closeTitle: 'Modifications non enregistrées',
    closeMessage: 'Vous avez des modifications non enregistrées. Que souhaitez-vous faire ?',
    discard: 'Supprimer',
    saveDraft: 'Garder et fermer',
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

    // Drafts list redesign (June 2026)
    draftCount: {
      zero: '{{count}} brouillon',
      one: '{{count}} brouillon',
      other: '{{count}} brouillons',
    },
    // Plural object: the adjective agrees with the draft count ("1 brouillon ·
    // visible…" / "2 brouillons · visibles…"); en/nl are number-invariant.
    onlyVisibleToYou: {
      one: 'visible uniquement par vous',
      other: 'visibles uniquement par vous',
    },
    untitled: 'Brouillon sans titre',
    editedJustNow: "Modifié à l'instant",
    editedMinutesAgo: 'Modifié il y a {{count}} min',
    editedHoursAgo: 'Modifié il y a {{count}} h',
    editedYesterday: 'Modifié hier',
    editedDaysAgo: 'Modifié il y a {{count}} jours',
    editedWeeksAgo: {
      one: 'Modifié il y a {{count}} semaine',
      other: 'Modifié il y a {{count}} semaines',
    },
    readyToPublish: 'Prêt à publier',
    missingFields: 'Manquant : {{fields}}',
    fieldDescription: 'description',
    fieldCategory: 'catégorie',
    fieldLocation: 'lieu',
    fieldDate: 'date',
    pastDateWarning: 'Date passée — choisissez une nouvelle date pour publier',
    continueEditing: 'Continuer la modification',
    sortHint:
      'Les brouillons sont triés par dernière modification. Balayez une carte pour la supprimer.',
    emptyTitle: 'Aucun brouillon',
    emptyHelp:
      'Commencez à créer un événement et enregistrez-le comme brouillon pour le terminer plus tard.',

    // Filtres côté serveur + origine du brouillon (août 2026)
    searchPlaceholder: 'Rechercher parmi {{count}} brouillons',
    sourceManual: 'Manuel',
    sourceAutomation: 'Automatisation',
    badgeNew: 'Nouveau',
    filteredCount: {
      one: '{{count}} brouillon correspondant',
      other: '{{count}} brouillons correspondants',
    },
    noResultsTitle: 'Aucun brouillon correspondant',
    noResultsHelp:
      'Essayez une autre recherche ou effacez les filtres pour voir tous les brouillons.',
    clearFilters: 'Effacer les filtres',
    alreadyPublished: 'Déjà publié ailleurs',

    // Refonte de la liste des brouillons (août 2026)
    filterAll: 'Tous {{count}}',
    filterReady: 'Prêts {{count}}',
    filterPastDate: 'Date passée {{count}}',
    filterNeedsWork: 'À compléter {{count}}',
    sortLabel: 'Trier',
    sortLastEdited: 'Dernière modification',
    sortDate: 'Date',
    sortConfidence: 'Correspondance',
    sourceLabel: 'Origine',
    pastDateShort: 'La date est passée — il faut une nouvelle date',
    confidenceLabel: '{{score}} % de correspondance',
    batchReady: '{{count}} prêts à publier',
    batchSubtitle: 'Vérifiés et complets',
    batchPublishAll: 'Tout publier',
    batchPastDated: '{{count}} avec une date passée',
    batchPastSubtitle: 'Impossibles à publier en l\u2019état',
    batchRemovePast: 'Supprimer',
    batchDeleteConfirmTitle: 'Supprimer {{count}} brouillons datés dans le passé ?',
    batchDeleteConfirmMessage:
      'Ceci supprime définitivement tous les brouillons dont la date est passée, dans toute votre liste — pas seulement ceux affichés. Cette action est irréversible.',
    batchDeleteConfirmCta: 'Supprimer définitivement',
    batchDeleteResult: '{{deleted}} supprimés sur {{total}}.',
    batchDeleteNone: 'Plus aucun brouillon daté dans le passé à supprimer.',
    batchCappedNotice: 'Suppression des {{count}} premiers — relancez pour les suivants.',
    batchConfirmTitle: 'Publier {{count}} brouillons ?',
    batchConfirmMessage:
      'Ces brouillons sont complets et datés dans le futur. Ils deviennent publics maintenant.',
    batchResult: '{{published}} publiés sur {{total}}.',
    batchStoppedRateLimit: 'Arrêt anticipé — trop de requêtes. Les autres sont inchangés.',
    batchStoppedBackground:
      "Arrêt lorsque l'application est passée en arrière-plan. Les autres sont inchangés.",
    swipeHint: 'Balayez une ligne pour publier ou supprimer',
    accessibilityPublish: 'Publier le brouillon',
    accessibilityRowHint: "Ouvre l'éditeur. Actions : publier, supprimer.",
    accessibilityRowHintNotReady: "Ouvre l'éditeur. Action : supprimer.",

    // Mode tri
    triageTitle: 'FILE DE TRI',
    triageHeadline: '{{count}} brouillons à décider',
    triageHelper: '{{past}} ont une date passée. {{ready}} sont prêts à partir.',
    triageStart: 'Commencer le tri',
    triagePublishReady: 'Publier {{count}}',
    triageSkipHint: 'balayez vers le haut pour passer',
    triageOpenEditor: "Ouvrir l'éditeur complet",
    triageCorroborated: 'Ce que le robot a corroboré',
    triageChecksRan: '{{ran}} vérifications sur {{total}}',
    triageNotScored: 'Vous avez créé ce brouillon — aucun score de correspondance',
    triageDatePassed: '{{date}} est passée',
    triagePickDate: 'Choisir…',
    triageCappedByDate: "La date n'a pas été trouvée sur la page source.",
    triageReadFullDescription: 'Lire la description complète',
    triageRelativeHint: 'dans {{count}} jours',
    checkFound: 'trouvé',
    checkPartly: 'partiellement',
    checkNotFound: 'introuvable',
    checkNotChecked: 'non vérifié',
    fieldStartDate: 'Date',
    fieldStartTime: 'Heure',
    fieldTitle: 'Titre',
    fieldCity: 'Ville',
    deletedToast: '« {{title}} » supprimé',
    deletedToastHelper: 'Retiré de vos brouillons',
    undo: 'Annuler',
    queueClearedTitle: 'File terminée',
    queueClearedHelper: 'Chaque brouillon de la file a été traité.',
    summaryPublished: 'Publiés',
    summaryRescheduled: 'Reprogrammés, puis publiés',
    summaryDeleted: 'Supprimés',
    summarySkipped: 'Reportés',
    backToDrafts: 'Retour aux brouillons',
    reviewSkipped: 'Revoir les {{count}} reportés',
    queueRemaining: '{{count}} brouillons restants dans votre liste.',
  },

  // ============================================
  // Duplicates - garde anti-doublon du backend (409 DUPLICATE_EVENT)
  // ============================================
  duplicates: {
    createTitle: 'Cet événement ressemble à un événement existant',
    publishTitle: 'Ce brouillon ressemble à un événement existant',
    createIntro: {
      one: 'Un événement déjà sur ProtestBase ressemble à celui que vous créez.',
      other: '{{count}} événements déjà sur ProtestBase ressemblent à celui que vous créez.',
    },
    publishIntro: {
      one: 'Un événement déjà sur ProtestBase ressemble à ce brouillon.',
      other: '{{count}} événements déjà sur ProtestBase ressemblent à ce brouillon.',
    },
    relationshipOwn: 'Vous avez déjà créé cet événement.',
    relationshipCoOrganized: 'Vous co-organisez déjà cet événement.',
    relationshipOtherOrg:
      'Déjà publié par une autre organisation. Demandez-leur de vous ajouter comme co-organisateur, ou publiez le vôtre séparément.',
    open: 'Ouvrir',
    view: 'Voir',
    createAnyway: 'Créer quand même',
    publishAnyway: 'Publier quand même',
    notOverridable:
      "Impossible de continuer tel quel. Ouvrez l'événement existant, ou modifiez le vôtre et réessayez.",
    warningNote: 'À noter : cet événement ressemble à « {{title}} ».',
    warningNoteMany: {
      one: 'À noter : cet événement ressemble à « {{title}} » et à {{count}} autre événement.',
      other: 'À noter : cet événement ressemble à « {{title}} » et à {{count}} autres événements.',
    },
    yourDate: 'Votre date : {{date}}',
    clashingDates: 'Dates concernées : {{dates}}',
    accessibilityOpen: 'Ouvrir « {{title}} »',
  },

  // ============================================
  // Series - recurring events
  // ============================================
  series: {
    repeat: {
      label: 'Répétition',
      once: 'Une seule fois',
      weekly: 'Chaque semaine',
      everyTwoWeeks: 'Toutes les 2 semaines',
      monthly: 'Chaque mois',
      weekday: 'Jour',
      weekOfMonth: 'Lequel dans le mois',
      startTime: 'Heure de début',
      endTime: 'Heure de fin',
      pickTime: "Choisir l'heure",
      timeHint:
        "Heure de Bruxelles. Une heure de fin antérieure à l'heure de début tombe le lendemain.",
      startsOn: 'À partir du',
      startsOnHint: 'La première date est le premier jour correspondant à partir de celle-ci.',
      ends: 'Fin',
      endsAfter: 'Après un nombre de fois',
      endsOn: 'À une date',
      countLabel: 'Nombre de fois',
      countPlaceholder: '2 à 31',
      untilLabel: 'Dernière date',
      pickDate: 'Choisissez une date',
      capHint: 'Une série dure au maximum 3 mois après sa première date.',
      errors: {
        startLocal: 'Choisissez une heure de début.',
        endLocal: "L'heure de fin ne peut pas être identique à l'heure de début.",
        startsOn: 'La date de début ne peut pas être dans le passé.',
        until: 'Choisissez une date de fin égale ou postérieure à la date de début.',
        count: 'Entrez un nombre de 2 à 31.',
      },
    },
    rule: {
      weekly: 'Chaque {{weekday}}',
      everyTwoWeeks: 'Un {{weekday}} sur deux',
      monthly: 'Le {{ordinal}} {{weekday}} du mois',
      until: "jusqu'au {{date}}",
    },
    weekdays: {
      monday: 'lundi',
      tuesday: 'mardi',
      wednesday: 'mercredi',
      thursday: 'jeudi',
      friday: 'vendredi',
      saturday: 'samedi',
      sunday: 'dimanche',
    },
    weekdaysShort: {
      monday: 'lun',
      tuesday: 'mar',
      wednesday: 'mer',
      thursday: 'jeu',
      friday: 'ven',
      saturday: 'sam',
      sunday: 'dim',
    },
    ordinals: {
      first: '1er',
      second: '2e',
      third: '3e',
      fourth: '4e',
      last: 'dernier',
    },
    preview: {
      heading: 'Dates',
      loading: 'Calcul des dates…',
      creates: {
        one: 'Cela crée 1 événement :',
        other: 'Cela crée {{count}} événements :',
      },
      upTo: "Jusqu'à {{count}} événements, le dernier au plus tard le {{date}}.",
      unavailable:
        "Les dates ne peuvent pas être affichées pour le moment. Elles seront vérifiées à l'enregistrement.",
    },
    badge: {
      weekly: 'Chaque semaine',
      everyTwoWeeks: 'Toutes les 2 semaines',
      monthly: 'Chaque mois',
      count: {
        one: '1 événement',
        other: '{{count}} événements',
      },
      generic: 'Événement récurrent',
      seeAll: 'Voir toutes les dates',
    },
    scope: {
      only: 'Cet événement uniquement',
      following: 'Cet événement et tous les suivants',
    },
    edit: {
      partOfSeries: "Cet événement est une date d'une série récurrente.",
      onlyNote:
        'Enregistrer pour cette date seulement ? Une modification ultérieure de « cet événement et tous les suivants » écrasera ce changement.',
      allNote:
        "Vos modifications s'appliquent à toutes les dates à venir de cette série. Leurs dates restent inchangées ; seuls les horaires peuvent changer.",
      scopeTitle: 'Appliquer vos modifications à',
      followingNote:
        'Chaque date suivante est remplacée par ce formulaire, même modifiée individuellement. Les dates restent inchangées ; seuls les horaires peuvent changer.',
      dateLocked:
        "Vous avez changé la date ou l'avez étendue sur plusieurs jours, ce qui ne fonctionne que pour cet événement : le calendrier d'une série ne peut pas changer.",
    },
    page: {
      heading: 'Toutes les dates',
      upcoming: 'À venir',
      past: 'Passées',
      noUpcoming: 'Aucune date à venir.',
      status: {
        draft: 'Brouillon',
        active: 'Publié',
        cancelled: 'Annulé',
        past: 'Passé',
      },
      manageHeading: 'Gérer cette série',
      manageNote:
        'Ces boutons agissent sur toutes les dates à venir. Les dates passées ne sont jamais modifiées.',
      editAll: 'Modifier toutes les dates à venir',
      cancelAll: 'Annuler toutes les dates à venir',
      deleteAll: 'Supprimer toutes les dates à venir',
      publishAll: 'Tout publier',
      addDates: 'Ajouter des dates',
      addDatesLabel: 'Nombre de dates à ajouter',
      windowNote: "Cette série peut durer jusqu'au {{date}} au plus tard.",
      notFound: "Cette série n'existe plus.",
      loadError: "La série n'a pas pu être chargée. Vérifiez votre connexion et réessayez.",
    },
    dialogs: {
      cancelAllTitle: 'Annuler toutes les dates à venir ?',
      cancelAllBody: {
        one: '1 date concernée. Les dates publiées seront annulées et les brouillons supprimés. Cette action est irréversible.',
        other:
          '{{count}} dates concernées. Les dates publiées seront annulées et les brouillons supprimés. Cette action est irréversible.',
      },
      deleteAllTitle: 'Supprimer toutes les dates à venir ?',
      deleteAllBody: {
        one: '1 date concernée. Elle sera supprimée définitivement. Les dates passées restent.',
        other:
          '{{count}} dates concernées. Elles seront supprimées définitivement. Les dates passées restent.',
      },
      publishAllTitle: 'Publier tous les brouillons à venir ?',
      publishAllBody: {
        one: '1 brouillon à publier. Les brouillons passés restent des brouillons.',
        other: '{{count}} brouillons à publier. Les brouillons passés restent des brouillons.',
      },
      addDatesTitle: 'Ajouter des dates',
      addDatesConfirm: 'Ajouter les dates',
      deleteScopeTitle: 'Supprimer quels brouillons ?',
      deleteScopeBody: 'Ils seront supprimés définitivement. Cette action est irréversible.',
      cancelFollowingHint:
        'Toutes les dates suivantes sont aussi annulées ; les brouillons à venir sont supprimés.',
      deleteFollowingLocked:
        'Certaines dates suivantes sont déjà publiées : seul ce brouillon peut être supprimé ici.',
    },
    messages: {
      created: {
        one: '1 événement créé.',
        other: '{{count}} événements créés.',
      },
      draftsCreated: {
        one: '1 brouillon enregistré.',
        other: '{{count}} brouillons enregistrés.',
      },
      updated: {
        one: '1 date mise à jour.',
        other: '{{count}} dates mises à jour.',
      },
      cancelled: {
        one: '1 date annulée.',
        other: '{{count}} dates annulées.',
      },
      deleted: {
        one: '1 date supprimée.',
        other: '{{count}} dates supprimées.',
      },
      published: {
        one: '1 date publiée.',
        other: '{{count}} dates publiées.',
      },
      datesAdded: {
        one: '1 date ajoutée.',
        other: '{{count}} dates ajoutées.',
      },
    },
    errors: {
      disabled: 'Les événements récurrents ne sont pas disponibles pour le moment.',
      invalid:
        'Ces réglages de répétition ne sont pas valides. Vérifiez le jour, les horaires et les dates.',
      untilBeforeStart: 'La date de fin est antérieure à la première date de la série.',
      tooFew:
        'Une série compte au moins 2 dates. Choisissez une date de fin plus tardive ou plus de répétitions.',
      tooMany:
        'Une série peut compter au maximum {{max}} dates, la dernière au plus tard le {{date}}.',
      lostRule:
        "Les réglages de répétition ne sont pas arrivés au serveur : rien n'a été créé. Réessayez.",
      notConfirmed:
        "Le serveur n'a pas confirmé la série. Vérifiez vos événements avant de réessayer.",
      notFound: "Cette série n'existe plus.",
      nothingUpcoming: "Il n'y a plus de date à venir à modifier.",
      scheduleImmutable:
        "Le calendrier d'une série ne peut pas être modifié. Annulez ou supprimez les dates à retirer, ou créez une nouvelle série.",
      ended:
        'Toutes les dates de cette série sont annulées ou passées. Créez plutôt une nouvelle série.',
      invalidFromEvent: 'Cette date ne fait plus partie de la série. Actualisez et réessayez.',
      reasonTooLong: 'La raison est trop longue (1000 caractères maximum).',
      conflict: "Quelqu'un vient d'ajouter ces dates. Actualisez pour les voir.",
      notMember: "Seuls les membres de l'organisation peuvent modifier cette série.",
      generic: "Une erreur s'est produite. Veuillez réessayer.",
    },
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
    calendarPreTitle: 'Ajouter au calendrier',
    calendarPreMessage:
      "ProtestBase a besoin d'accéder à ton calendrier pour ajouter cet événement. On ne peut pas voir tes autres événements.",
    photoSavePreTitle: "Enregistrer l'image",
    photoSavePreMessage:
      "ProtestBase a besoin d'accéder à tes photos pour enregistrer cette image.",
    allowAccess: 'Autoriser',
    notNow: 'Pas maintenant',
  },

  // ============================================
  // Weather - "Protest forecast" card on event detail
  // ============================================
  weather: {
    title: 'Météo de la manif',
    mayChange: 'Peut encore changer',
    updatedHoursAgo: 'Mis à jour il y a {{count}} h',
    // Open-Meteo's CC BY 4.0 terms require a link wherever their data is shown.
    attribution: "D'après les données d'Open-Meteo",
    attributionLinkA11y: 'Ouvrir le site Open-Meteo',
    // Shown only when the forecast does not cover the whole event.
    windowFromNow: 'De maintenant à {{time}}',
    windowForDay: 'Prévisions pour {{day}}',
    metrics: {
      temp: '{{min}}–{{max}} °C',
      tempSingle: '{{value}} °C',
      tempBelowZero: '{{min}} à {{max}} °C',
      feels: 'ressenti {{min}}–{{max}}°',
      feelsSingle: 'ressenti {{value}}°',
      feelsBelowZero: 'ressenti {{min}} à {{max}}°',
      rain: 'pluie {{value}} %',
      gusts: 'rafales {{value}} km/h',
    },
    conditions: {
      clear: 'Dégagé',
      clearNight: 'Nuit dégagée',
      cloudy: 'Nuageux',
      fog: 'Brouillard',
      drizzle: 'Bruine',
      rain: 'Pluie',
      snow: 'Neige',
      thunder: 'Orages',
      unknown: 'Prévisions',
    },
    // Never discourage attending or imply safety. Informal Belgian French
    // throughout ("tu", dracher, fort chaud, GSM…). Keys ending in _N are
    // alternative wordings of one situation; the card shows one per event.
    tips: {
      thunder: 'Orages possibles — garde un œil sur les infos des organisateur·ices.',
      thunder_rain_1: 'Orage et pluie : prends un k-way ou un poncho.',
      thunder_rain_2: "Orage et pluie : mets-toi à l'abri à temps si besoin.",
      heat_1: 'Il fait fort chaud : prends au moins une gourde.',
      heat_2: 'Il fait fort chaud : couvre-toi la tête.',
      heat_3: 'Il fait fort chaud : mets des vêtements légers en lin ou en coton.',
      freezing_1: 'Ça caille : mets des sous-vêtements thermiques.',
      freezing_2: 'Ça caille : prends une écharpe et des gants.',
      freezing_3: "Ça caille : rien ne peut t'arrêter !",
      freezing_4: 'Ça caille : prends un thermos !',
      wind_strong:
        'Fortes rafales : ta banderole risque de se transformer en voile — fixe-la bien ou vois plus petit.',
      cold_rain_1: 'Froid et pluie : ne te décourage pas — marcher, ça réchauffe.',
      cold_rain_2: "Froid et pluie : rien ne t'arrête ! Descends dans la rue !",
      cold_rain_3: 'Froid et pluie : mets de grosses chaussettes et des chaussures imperméables.',
      cold_rain_4: "Froid et pluie : n'oublie pas ton thermos.",
      cold_rain_5: 'Froid et pluie : mets un bon imperméable bien chaud.',
      cold_rain_6: 'Froid et pluie : enfile un pantalon de pluie !',
      cold_rain_7: "Froid et pluie : un keffieh peut te protéger d'une petite pluie.",
      cold_rain_8: 'Froid et pluie : avec un parapluie, tu te fais vite des ami·es.',
      wind_rain: 'Vent et pluie : prends un k-way ou un poncho.',
      sun_rain_1: 'Soleil et averses : viens paré·e à tout !',
      sun_rain_2: 'Soleil et averses : gourde + k-way + lunettes de soleil.',
      rain_1: "Ça drache : au moins, c'est bon pour les plantes.",
      rain_2: 'Ça drache : prends un k-way ou un poncho.',
      rain_3: 'Ça drache : mets des chaussures imperméables.',
      showers: 'Risque de crachin : glisse un k-way dans ton sac.',
      uv_high: 'Soleil costaud : crème solaire — seule ta détermination doit brûler.',
      sunny_warm_1: "Soleil et chaleur : n'oublie pas ta gourde — scander, ça donne soif.",
      sunny_warm_2: 'Soleil et chaleur : un keffieh peut te protéger du soleil.',
      sunny_warm_3: 'Soleil et chaleur : prends tes lunettes de soleil.',
      sunny_warm_4: 'Soleil et chaleur : attention aux coups de soleil !',
      warm: 'Il fait chaud : prends une gourde — scander, ça donne soif.',
      wind_1: "Du vent : accroche-toi, ne t'envole pas !",
      wind_2: 'Du vent : tiens bien ta banderole.',
      wind_3: 'Du vent : rien ne peut te faire vaciller.',
      cold_1: 'Froid : ne te décourage pas — marcher, ça réchauffe.',
      cold_2: 'Froid : mets un gros manteau.',
      cold_3: 'Froid : un thermos peut bien servir.',
      dark: "Il fera noir à {{time}} — un gilet réfléchissant ou la lampe de ton GSM, c'est malin.",
      sunny_1: 'Temps parfait pour manifester : aucune excuse pour ne pas venir !',
      sunny_2: 'Temps parfait pour manifester : prends tes lunettes de soleil.',
      sunny_3: 'Temps parfait pour manifester : attention aux coups de soleil !',
      perfect: 'Temps parfait pour manifester : aucune excuse pour ne pas venir !',
    },
  },
  a11y: {
    required: 'obligatoire',
    tabPosition: '{{title}}, onglet, {{position}} sur {{count}}',
    expandField: 'Agrandir ce champ',
    collapseField: 'Réduire ce champ',
    hints: {
      useRecoveryCode: "Demande un de vos codes de secours au lieu du code de l'application",
      useAuthenticatorCode: "Demande le code de votre application d'authentification",
      backToSignIn: "Revient à l'étape de l'e-mail et du mot de passe",
      openAuthenticator:
        "Ouvre une application d'authentification de ce téléphone pour y ajouter votre compte",
      shareRecoveryCodes: 'Ouvre le menu de partage avec vos codes de secours',
      cancelCodeStep: "Revient à l'étape du mot de passe",
      goBack: "Revient à l'écran précédent",
      closeScreen: 'Ferme cet écran',
      closeDialog: 'Ferme cette fenêtre',
      closeMenu: 'Ferme le menu',
      openEvent: "Ouvre le détail de l'événement",
      openFilters: 'Ouvre les filtres',
      toggleSave: 'Ajoute cet événement à vos événements sauvegardés, ou le retire',
      toggleLike: "Ajoute votre j'aime, ou le retire",
      shareEvent: 'Ouvre les options de partage',
      viewImage: "Affiche l'image en plein écran",
      removeFilter: 'Retire ce filtre',
      removeSelection: 'Retire cette sélection',
      openOrganizer: "Ouvre le profil de l'organisateur",
      manageEvent: 'Ouvre les actions pour cet événement',
      openSettings: "Ouvre les réglages de l'application sur votre appareil",
      openExternalLink: "Ouvre le lien en dehors de l'application",
      openPrivacyPolicy: 'Ouvre la politique de confidentialité dans un navigateur',
      sendEmail: 'Ouvre votre application de messagerie pour nous écrire',
      zoomInMap: 'Effectue un zoom avant sur la carte',
      zoomOutMap: 'Effectue un zoom arrière sur la carte',
      selectOnMap: 'Sélectionne cet événement sur la carte',
      applyMapFilter: 'Filtre les événements affichés sur la carte',
      showHomeArea: 'Filtre la liste sur votre zone',
      resetPassword: 'Ouvre la réinitialisation du mot de passe',
      togglePassword: 'Affiche ou masque le mot de passe',
      openAccount: 'Ouvre votre compte',
      deleteDraft: 'Supprime ce brouillon',
      undoDelete: 'Annule la suppression de ce brouillon',
      skipDraft: 'Garde ce brouillon pour plus tard',
      publishDraft: 'Publie ce brouillon',
      publishReady: 'Publie les brouillons prêts',
      removePastDrafts: 'Supprime les brouillons dont la date est passée',
      backToDrafts: 'Revient à vos brouillons',
      startTriage: 'Commence le tri de vos brouillons, un par un',
      openEditor: "Ouvre ce brouillon dans l'éditeur complet",
      pickDate: 'Ouvre le sélecteur de date',
      openRepeat: "Ouvre la fréquence de l'événement",
      deleteTemplate: 'Supprime ce modèle',
      pickDay: "Utilise ce jour pour l'événement",
      openWhen: "Ouvre la date et l'heure",
      openWhere: 'Ouvre le lieu',
      openPhotos: 'Ouvre les photos',
      resumeDraft: 'Ouvre votre événement inachevé',
      pickTime: "Ouvre le sélecteur d'heure",
      resizeField: 'Change la quantité de texte affichée',
      jumpToField: 'Va à ce champ',
      setDate: 'Utilise cette date pour le brouillon',
      clearField: 'Efface ce champ',
      useAddress: 'Remplit avec cette adresse',
      changePostal: 'Permet de choisir un autre code postal',
      selectOption: 'Sélectionne ou désélectionne cette option',
      searchAsYouType: 'Les résultats se mettent à jour pendant la saisie',
      openMonthPicker: "Ouvre le sélecteur de mois et d'année",
      goToToday: "Revient à aujourd'hui",
      goToNextEvent: 'Va au prochain jour avec des événements',
      previousMonth: 'Affiche le mois précédent',
      nextMonth: 'Affiche le mois suivant',
      previousYear: "Affiche l'année précédente",
      nextYear: "Affiche l'année suivante",
      selectMonth: 'Affiche ce mois',
      selectDay: 'Affiche les événements de ce jour',
      removeImage: 'Retire cette image',
      moveImage: "Change l'ordre des images",
      switchView: 'Passe à cette vue',
      resetFilters: 'Efface tous les filtres',
      openTemplateMenu: 'Ouvre les actions pour ce modèle',
      createTemplate: 'Commence un nouveau modèle',
      applyTemplateAction: 'Applique cette action au modèle',
      addLocation: "Ouvre l'éditeur pour ajouter le lieu",
      repeatOnDay: "Répète l'événement ce jour-là",
      createEvent: 'Commence un nouvel événement',
    },
  },
};

// Export as default and named export
export default fr;
export { fr };
