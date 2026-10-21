export const countries = [
  {
    label: {
      en: 'Belgium',
      fr: 'Belgique',
      nl: 'België',
    },
    value: 'belgium',
  },
  {
    label: {
      en: 'Netherlands',
      fr: 'Pays-Bas',
      nl: 'Nederland',
    },
    value: 'netherlands',
  },
  {
    label: {
      en: 'Luxembourg',
      fr: 'Luxembourg',
      nl: 'Luxemburg',
    },
    value: 'luxembourg',
  },
  // Offered only once the backend serves France (see PostalCodeProvider's
  // `franceEnabled`); listed here so stored French events always get their name.
  {
    label: {
      en: 'France',
      fr: 'France',
      nl: 'Frankrijk',
    },
    value: 'france',
  },
];
