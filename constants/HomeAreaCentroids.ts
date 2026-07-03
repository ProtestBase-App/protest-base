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
 * Province centers use the province capital's coordinates.
 *
 * Token scheme mirrors `utils/locationFilterOptions.ts`:
 *   r:be:<slug>     region        m:be:<minCode>  municipality (min member code)
 *   p:be:<slug>     BE province   m:nl:<minCode>  NL sub-municipality
 *   p:nl:<slug>     NL province
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
  if (token.startsWith('p:')) return 9;
  if (token.startsWith('r:')) return token === 'r:be:brussels' ? 10.5 : 8;
  return null;
}
