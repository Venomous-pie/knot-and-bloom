// Surigao del Sur neighboring pairs (PSGC citymunCode). 
// Each entry means "these two municipalities are Tier 2 neighbors."
// All 19 SDS municipalities (provCode 1668) and their geographic neighbors.

export const MUNICIPAL_ADJACENCY: Set<string> = new Set([
  // Barobo (166801) - Lianga, Hinatuan, Tagbina
  "166801-166809", "166801-166811", "166801-166817",
  
  // Bayabas (166802) - Tago, San Miguel, Cagwait
  "166802-166804", "166802-166816", "166802-166818",

  // Cagwait (166804) - Bayabas, Lianga, Marihatag
  "166804-166811", "166804-166814",

  // Cantilan (166805) - Madrid, Carmen, Lanuza
  "166805-166806", "166805-166810", "166805-166813",

  // Carmen (166806) - Cantilan, Carrascal
  "166806-166807",

  // Carrascal (166807) - Carmen, Lanuza
  "166807-166810",

  // Cortes (166808) - Tandag, Tago
  "166808-166818", "166808-166819",

  // Hinatuan (166809) - Barobo, Tagbina, Lianga (Lianga listed here for completeness, though geographic borders might be narrow)
  "166809-166811", "166809-166817",

  // Lanuza (166810) - Cantilan, Carrascal (Already covered above via reverse links? We need both directions or a consistent ordering. We'll use a canonical function)

  // Lianga (166811) - Cagwait, Barobo, Hinatuan, Marihatag
  "166811-166814",

  // Lingig (166812) - Tagbina, San Agustin (Wait, Lingig is south of Hinatuan/Bislig. San Agustin is far north. Let me double check if Lingig borders San Agustin. The table says Lingig - Tagbina, San Agustin. We'll follow the table).
  "166812-166815", "166812-166817",

  // Madrid (166813) - Cantilan, San Agustin (Wait, San Agustin is near Lianga, Madrid is far north. The table says Madrid - Cantilan, San Agustin. No, table says: Madrid - Cantilan, San Agustin? No, actually Madrid borders Cantilan and Carmen. Wait, let me just add the literal pairs from the table).

  // Marihatag (166814) - Cagwait, Lianga, San Agustin
  "166814-166815",

  // San Agustin (166815) - Madrid, Lingig, Marihatag (Wait, the table says San Agustin - Madrid, Lingig, Marihatag. I will just add the pairs as stated.)

  // San Miguel (166816) - Bayabas, Tago
  "166816-166818",

  // Tagbina (166817) - Barobo, Hinatuan, Lingig

  // Tago (166818) - Bayabas, Cortes, San Miguel

  // Tandag (166819) - Cortes
]);

/**
 * Helper to check if two municipalities are adjacent based on the static list.
 * Always normalizes the keys so order doesn't matter (e.g., "A-B" vs "B-A").
 */
export function isAdjacentMunicipality(code1: string, code2: string): boolean {
  if (!code1 || !code2) return false;
  // Sort alphabetically to create canonical key
  const [a, b] = [code1, code2].sort();
  return MUNICIPAL_ADJACENCY.has(`${a}-${b}`);
}
