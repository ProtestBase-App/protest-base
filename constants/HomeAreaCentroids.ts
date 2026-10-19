/**
 * Static geographic centers for home-area tokens, used to recenter the Maps tab
 * on the area the user picked in More → Home area.
 *
 * Why this table exists: the bundled postal datasets carry only administrative
 * labels, no coordinates. The Maps recenter used to average the coordinates of
 * *protests inside the area*, so picking a city with no nearby protests centered
 * the map on the region-wide protest cluster instead of the city (e.g. "Antwerp"
 * showed the Ghent area). Centering on a real per-area coordinate fixes that and
 * matches the screen's promise ("…and center the map there").
 *
 * Coverage is a curated set (regions + provinces + major municipalities), not
 * every area. A picked municipality that isn't listed falls back to its province
 * center, then its region center (see `resolveHomeAreaCenter` in
 * `utils/homeArea.ts`) — "roughly right" instead of "somewhere else entirely".
 * Province centers use the province capital's coordinates. France is complete
 * (every région and département), from the backend's dataset.
 *
 * Token scheme mirrors `utils/locationFilterOptions.ts`:
 *   r:be:<slug>     region        m:be:<minCode>  municipality (min member code)
 *   p:be:<slug>     BE province   m:nl:<minCode>  NL sub-municipality
 *   p:nl:<slug>     NL province   p:lu:<slug>     LU canton
 *   m:lu:<slug>     LU commune (slug: some LU codes belong to two communes)
 *   r:fr:<slug>     FR région     p:fr:<code>     FR département (e.g. p:fr:2a)
 *
 * Municipality min-code tokens were verified against the bundled BE_EN / NL
 * datasets (they are language-independent). Coordinates are [lng, lat] to match
 * the map camera and event coordinates used across the app.
 */
export const HOME_AREA_CENTROIDS: Record<string, [number, number]> = {
  // --- Belgium: regions ---
  'r:be:flanders': [4.2, 51.05],
  'r:be:wallonia': [4.85, 50.3],
  'r:be:brussels': [4.3517, 50.8503],

  // --- Belgium: provinces (province capital) ---
  'p:be:antwerp': [4.4025, 51.2194], // Antwerp
  'p:be:east-flanders': [3.7174, 51.0543], // Ghent
  'p:be:flemish-brabant': [4.7005, 50.8798], // Leuven
  'p:be:hainaut': [3.9557, 50.4542], // Mons
  'p:be:liege': [5.5797, 50.6326], // Liège
  'p:be:limburg': [5.3378, 50.9307], // Hasselt
  'p:be:luxembourg': [5.8167, 49.6833], // Arlon
  'p:be:namur': [4.872, 50.4674], // Namur
  'p:be:walloon-brabant': [4.6118, 50.7167], // Wavre
  'p:be:west-flanders': [3.2247, 51.2093], // Bruges

  // --- Belgium: major municipalities ---
  'm:be:2000': [4.4025, 51.2194], // Antwerp
  'm:be:9000': [3.7174, 51.0543], // Ghent
  'm:be:8000': [3.2247, 51.2093], // Bruges
  'm:be:1000': [4.3517, 50.8503], // Brussels
  'm:be:6000': [4.4446, 50.4108], // Charleroi
  'm:be:3600': [5.5006, 50.965], // Genk
  'm:be:3500': [5.3378, 50.9307], // Hasselt
  'm:be:8500': [3.2649, 50.8279], // Kortrijk
  'm:be:3000': [4.7005, 50.8798], // Leuven
  'm:be:4000': [5.5797, 50.6326], // Liège
  'm:be:2800': [4.4776, 51.0259], // Mechelen
  'm:be:7000': [3.9557, 50.4542], // Mons
  'm:be:5000': [4.872, 50.4674], // Namur
  'm:be:8800': [3.1229, 50.9469], // Roeselare
  'm:be:9100': [4.1437, 51.165], // Sint-Niklaas
  'm:be:7500': [3.3891, 50.6071], // Tournai
  'm:be:4800': [5.8622, 50.5911], // Verviers
  'm:be:1300': [4.6118, 50.7167], // Wavre
  'm:be:9300': [4.0402, 50.9378], // Aalst
  'm:be:8400': [2.9287, 51.2247], // Oostende
  'm:be:4100': [5.5006, 50.5847], // Seraing

  // --- Netherlands: provinces (province capital) ---
  'p:nl:zuid-holland': [4.3007, 52.0705], // The Hague
  'p:nl:noord-holland': [4.6462, 52.3874], // Haarlem
  'p:nl:noord-brabant': [5.3037, 51.6978], // 's-Hertogenbosch
  'p:nl:gelderland': [5.8987, 51.9851], // Arnhem
  'p:nl:utrecht': [5.1214, 52.0907], // Utrecht
  'p:nl:overijssel': [6.083, 52.5168], // Zwolle
  'p:nl:limburg': [5.691, 50.8514], // Maastricht
  'p:nl:groningen': [6.5665, 53.2194], // Groningen
  'p:nl:fryslan': [5.8086, 53.2012], // Leeuwarden
  'p:nl:drenthe': [6.5649, 52.9925], // Assen
  'p:nl:flevoland': [5.4714, 52.5185], // Lelystad
  'p:nl:zeeland': [3.6136, 51.4988], // Middelburg

  // --- Netherlands: major sub-municipalities ---
  'm:nl:2292': [4.3007, 52.0705], // 's-Gravenhage (The Hague)
  'm:nl:5211': [5.3037, 51.6978], // 's-Hertogenbosch
  'm:nl:1011': [4.9041, 52.3676], // Amsterdam
  'm:nl:3011': [4.4777, 51.9244], // Rotterdam
  'm:nl:3451': [5.1214, 52.0907], // Utrecht
  'm:nl:5611': [5.4697, 51.4416], // Eindhoven
  'm:nl:9479': [6.5665, 53.2194], // Groningen
  'm:nl:5011': [5.0913, 51.5555], // Tilburg
  'm:nl:1309': [5.2647, 52.3508], // Almere
  'm:nl:4811': [4.7683, 51.5719], // Breda
  'm:nl:6511': [5.8372, 51.8126], // Nijmegen
  'm:nl:3888': [5.9699, 52.2112], // Apeldoorn
  'm:nl:2011': [4.6462, 52.3874], // Haarlem
  'm:nl:6811': [5.8987, 51.9851], // Arnhem
  'm:nl:3811': [5.3878, 52.1561], // Amersfoort
  'm:nl:8011': [6.083, 52.5168], // Zwolle
  'm:nl:6211': [5.691, 50.8514], // Maastricht
  'm:nl:2311': [4.497, 52.1601], // Leiden
  'm:nl:3311': [4.6901, 51.8133], // Dordrecht
  'm:nl:7511': [6.8937, 52.2215], // Enschede
  'm:nl:8832': [5.8086, 53.2012], // Leeuwarden
  'm:nl:9401': [6.5649, 52.9925], // Assen
  'm:nl:1336': [5.4714, 52.5185], // Lelystad
  'm:nl:4331': [3.6136, 51.4988], // Middelburg

  // --- Luxembourg: cantons (canton capital) ---
  // Coordinates from the ACT "localités avec coordonnées" file (CC0), via
  // local/tools/generate-lu-postal-data.mjs.
  'p:lu:capellen': [5.9883, 49.6428], // Capellen
  'p:lu:clervaux': [6.0255, 50.0562], // Clervaux
  'p:lu:diekirch': [6.1531, 49.8707], // Diekirch
  'p:lu:echternach': [6.4136, 49.8148], // Echternach
  'p:lu:esch-sur-alzette': [5.979, 49.4971], // Esch-sur-Alzette
  'p:lu:grevenmacher': [6.4372, 49.6803], // Grevenmacher
  'p:lu:luxembourg': [6.1338, 49.6116], // Luxembourg
  'p:lu:mersch': [6.1066, 49.7504], // Mersch
  'p:lu:redange': [5.8856, 49.763], // Redange
  'p:lu:remich': [6.3677, 49.5489], // Remich
  'p:lu:vianden': [6.2045, 49.9343], // Vianden
  'p:lu:wiltz': [5.9372, 49.9623], // Wiltz

  // --- Luxembourg: major communes ---
  'm:lu:luxembourg': [6.1338, 49.6116], // Luxembourg
  'm:lu:esch-sur-alzette': [5.979, 49.4971], // Esch-sur-Alzette
  'm:lu:differdange': [5.8928, 49.5209], // Differdange
  'm:lu:dudelange': [6.0879, 49.4856], // Dudelange
  'm:lu:hesperange': [6.154, 49.5705], // Hesperange
  'm:lu:petange': [5.8735, 49.5567], // Pétange
  'm:lu:sanem': [5.9283, 49.5482], // Sanem
  'm:lu:mamer': [6.0255, 49.6284], // Mamer
  'm:lu:diekirch': [6.1531, 49.8707], // Diekirch
  'm:lu:bettembourg': [6.1057, 49.5212], // Bettembourg
  'm:lu:echternach': [6.4136, 49.8148], // Echternach
  'm:lu:mersch': [6.1066, 49.7504], // Mersch
  'm:lu:grevenmacher': [6.4372, 49.6803], // Grevenmacher
  'm:lu:kaerjeng': [5.8944, 49.5825], // Käerjeng
  'm:lu:ettelbruck': [6.1056, 49.8498], // Ettelbruck

  // --- France: régions ---
  // The backend dataset's `center` (the population-weighted mean of the communes),
  // via local/tools/generate-fr-postal-data.mjs; the same for the départements.
  'r:fr:auvergne-rhone-alpes': [4.8782, 45.6298], // Auvergne-Rhône-Alpes
  'r:fr:bourgogne-franche-comte': [5.1428, 47.2177], // Bourgogne-Franche-Comté
  'r:fr:bretagne': [-2.8426, 48.1667], // Bretagne
  'r:fr:centre-val-de-loire': [1.5694, 47.6386], // Centre-Val de Loire
  'r:fr:corse': [9.1071, 42.2112], // Corse
  'r:fr:grand-est': [6.259, 48.6973], // Grand Est
  'r:fr:hauts-de-france': [2.8166, 50.2408], // Hauts-de-France
  'r:fr:ile-de-france': [2.3558, 48.836], // Île-de-France
  'r:fr:normandie': [0.235, 49.258], // Normandie
  'r:fr:nouvelle-aquitaine': [-0.1619, 45.0851], // Nouvelle-Aquitaine
  'r:fr:occitanie': [2.4619, 43.5938], // Occitanie
  'r:fr:pays-de-la-loire': [-1.0579, 47.3579], // Pays de la Loire
  'r:fr:provence-alpes-cote-d-azur': [5.9047, 43.5564], // Provence-Alpes-Côte d'Azur

  // --- France: départements ---
  'p:fr:01': [5.3593, 46.1084], // Ain
  'p:fr:02': [3.4584, 49.5719], // Aisne
  'p:fr:03': [3.1554, 46.3355], // Allier
  'p:fr:04': [6.0169, 44.0044], // Alpes-de-Haute-Provence
  'p:fr:05': [6.2094, 44.6173], // Hautes-Alpes
  'p:fr:06': [7.1596, 43.6816], // Alpes-Maritimes
  'p:fr:07': [4.5726, 44.8092], // Ardèche
  'p:fr:08': [4.7104, 49.7225], // Ardennes
  'p:fr:09': [1.5577, 43.0207], // Ariège
  'p:fr:10': [4.0648, 48.3139], // Aube
  'p:fr:11': [2.574, 43.1748], // Aude
  'p:fr:12': [2.5857, 44.3192], // Aveyron
  'p:fr:13': [5.2961, 43.4075], // Bouches-du-Rhône
  'p:fr:14': [-0.3272, 49.1595], // Calvados
  'p:fr:15': [2.57, 45.0073], // Cantal
  'p:fr:16': [0.1172, 45.6914], // Charente
  'p:fr:17': [-0.8914, 45.9038], // Charente-Maritime
  'p:fr:18': [2.4258, 47.084], // Cher
  'p:fr:19': [1.7052, 45.2657], // Corrèze
  'p:fr:21': [4.973, 47.311], // Côte-d'Or
  'p:fr:22': [-2.8064, 48.5156], // Côtes-d'Armor
  'p:fr:23': [1.951, 46.1341], // Creuse
  'p:fr:24': [0.6991, 45.0755], // Dordogne
  'p:fr:25': [6.3565, 47.2548], // Doubs
  'p:fr:26': [4.9478, 44.8231], // Drôme
  'p:fr:27': [1.085, 49.1346], // Eure
  'p:fr:28': [1.4046, 48.4742], // Eure-et-Loir
  'p:fr:29': [-4.2001, 48.2664], // Finistère
  'p:fr:2a': [8.8567, 41.8595], // Corse-du-Sud
  'p:fr:2b': [9.3323, 42.5275], // Haute-Corse
  'p:fr:30': [4.3231, 43.9321], // Gard
  'p:fr:31': [1.375, 43.5532], // Haute-Garonne
  'p:fr:32': [0.5173, 43.693], // Gers
  'p:fr:33': [-0.5788, 44.8404], // Gironde
  'p:fr:34': [3.6688, 43.5456], // Hérault
  'p:fr:35': [-1.6796, 48.1752], // Ille-et-Vilaine
  'p:fr:36': [1.6366, 46.7881], // Indre
  'p:fr:37': [0.6843, 47.3404], // Indre-et-Loire
  'p:fr:38': [5.4924, 45.3478], // Isère
  'p:fr:39': [5.6541, 46.7744], // Jura
  'p:fr:40': [-0.9434, 43.825], // Landes
  'p:fr:41': [1.3792, 47.5805], // Loir-et-Cher
  'p:fr:42': [4.2902, 45.6028], // Loire
  'p:fr:43': [3.9233, 45.1618], // Haute-Loire
  'p:fr:44': [-1.6963, 47.2717], // Loire-Atlantique
  'p:fr:45': [2.165, 47.9154], // Loiret
  'p:fr:46': [1.5971, 44.6262], // Lot
  'p:fr:47': [0.52, 44.3449], // Lot-et-Garonne
  'p:fr:48': [3.4662, 44.5566], // Lozère
  'p:fr:49': [-0.6013, 47.376], // Maine-et-Loire
  'p:fr:50': [-1.4095, 49.1701], // Manche
  'p:fr:51': [4.1268, 49.101], // Marne
  'p:fr:52': [5.1681, 48.2175], // Haute-Marne
  'p:fr:53': [-0.7114, 48.1072], // Mayenne
  'p:fr:54': [6.1119, 48.8403], // Meurthe-et-Moselle
  'p:fr:55': [5.3634, 48.9736], // Meuse
  'p:fr:56': [-2.9168, 47.7634], // Morbihan
  'p:fr:57': [6.4479, 49.1553], // Moselle
  'p:fr:58': [3.3049, 47.0889], // Nièvre
  'p:fr:59': [3.1398, 50.555], // Nord
  'p:fr:60': [2.4622, 49.3593], // Oise
  'p:fr:61': [0.0276, 48.6163], // Orne
  'p:fr:62': [2.4227, 50.5351], // Pas-de-Calais
  'p:fr:63': [3.174, 45.7722], // Puy-de-Dôme
  'p:fr:64': [-0.9105, 43.3608], // Pyrénées-Atlantiques
  'p:fr:65': [0.1117, 43.1776], // Hautes-Pyrénées
  'p:fr:66': [2.8413, 42.6567], // Pyrénées-Orientales
  'p:fr:67': [7.6659, 48.6178], // Bas-Rhin
  'p:fr:68': [7.3205, 47.8387], // Haut-Rhin
  'p:fr:69': [4.8125, 45.7736], // Rhône
  'p:fr:70': [6.2046, 47.6326], // Haute-Saône
  'p:fr:71': [4.6455, 46.6291], // Saône-et-Loire
  'p:fr:72': [0.2006, 47.9844], // Sarthe
  'p:fr:73': [6.1218, 45.5781], // Savoie
  'p:fr:74': [6.2972, 46.0647], // Haute-Savoie
  'p:fr:75': [2.347, 48.8589], // Paris
  'p:fr:76': [0.8393, 49.5472], // Seine-Maritime
  'p:fr:77': [2.766, 48.7217], // Seine-et-Marne
  'p:fr:78': [1.9921, 48.8711], // Yvelines
  'p:fr:79': [-0.3741, 46.5282], // Deux-Sèvres
  'p:fr:80': [2.2635, 49.9413], // Somme
  'p:fr:81': [2.1141, 43.7759], // Tarn
  'p:fr:82': [1.2856, 44.0382], // Tarn-et-Garonne
  'p:fr:83': [6.1746, 43.281], // Var
  'p:fr:84': [5.013, 43.9941], // Vaucluse
  'p:fr:85': [-1.4085, 46.6982], // Vendée
  'p:fr:86': [0.4026, 46.6152], // Vienne
  'p:fr:87': [1.2204, 45.8556], // Haute-Vienne
  'p:fr:88': [6.518, 48.188], // Vosges
  'p:fr:89': [3.4808, 47.9382], // Yonne
  'p:fr:90': [6.8842, 47.6268], // Territoire de Belfort
  'p:fr:91': [2.3293, 48.6383], // Essonne
  'p:fr:92': [2.2574, 48.8564], // Hauts-de-Seine
  'p:fr:93': [2.4543, 48.9101], // Seine-Saint-Denis
  'p:fr:94': [2.4424, 48.7947], // Val-de-Marne
  'p:fr:95': [2.2488, 49.0164], // Val-d'Oise
};

/**
 * Camera zoom to pair with a home-area recenter, by token tier. A municipality
 * gets a city-level zoom; provinces/regions zoom out so the whole area frames
 * (Brussels is a city-sized region, so it keeps a tighter zoom). Returns null
 * for an unknown/raw token so the caller can use its own default.
 */
export function homeAreaZoomForToken(token: string | null): number | null {
  if (!token) return null;
  if (token.startsWith('m:')) return 11.5;
  // Luxembourg cantons are a fraction of a Belgian or Dutch province.
  if (token.startsWith('p:lu:')) return 10;
  // French départements and régions are several times their Belgian counterparts;
  // Paris and its inner ring are city-sized départements.
  if (token.startsWith('p:fr:')) return FRENCH_CITY_DEPARTEMENT_ZOOM[token] ?? 8.5;
  if (token.startsWith('r:fr:')) return token === 'r:fr:ile-de-france' ? 8 : 6.5;
  if (token.startsWith('p:')) return 9;
  if (token.startsWith('r:')) return token === 'r:be:brussels' ? 10.5 : 8;
  return null;
}

const FRENCH_CITY_DEPARTEMENT_ZOOM: Record<string, number> = {
  'p:fr:75': 11, // Paris
  'p:fr:92': 10, // Hauts-de-Seine
  'p:fr:93': 10, // Seine-Saint-Denis
  'p:fr:94': 10, // Val-de-Marne
};
