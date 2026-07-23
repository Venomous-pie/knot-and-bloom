// Maps regCode -> 'LUZON' | 'VISAYAS' | 'MINDANAO' for Tier 5 (inter-island) detection.

export const REGION_TO_ISLAND_GROUP: Record<string, 'LUZON' | 'VISAYAS' | 'MINDANAO'> = {
  '01': 'LUZON',     // Ilocos Region
  '02': 'LUZON',     // Cagayan Valley
  '03': 'LUZON',     // Central Luzon
  '04': 'LUZON',     // CALABARZON
  '17': 'LUZON',     // MIMAROPA
  '05': 'LUZON',     // Bicol Region
  '06': 'VISAYAS',   // Western Visayas
  '07': 'VISAYAS',   // Central Visayas
  '08': 'VISAYAS',   // Eastern Visayas
  '09': 'MINDANAO',  // Zamboanga Peninsula
  '10': 'MINDANAO',  // Northern Mindanao
  '11': 'MINDANAO',  // Davao Region
  '12': 'MINDANAO',  // SOCCSKSARGEN
  '13': 'LUZON',     // NCR
  '14': 'LUZON',     // CAR
  '15': 'MINDANAO',  // ARMM / BARMM
  '16': 'MINDANAO',  // Caraga
};

/**
 * Checks if two regions belong to the same island group.
 */
export function isSameIslandGroup(regCode1: string, regCode2: string): boolean {
  if (!regCode1 || !regCode2) return false;
  const group1 = REGION_TO_ISLAND_GROUP[regCode1];
  const group2 = REGION_TO_ISLAND_GROUP[regCode2];
  
  if (!group1 || !group2) return false; // If unknown region, assume they are different
  
  return group1 === group2;
}
