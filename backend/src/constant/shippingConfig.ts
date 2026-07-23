export const SHIPPING_DEFAULTS = {
  fuelPricePerLiter: 80,        // ₱/L starting default
  motorcycleFuelEfficiency: 40, // km/L
  tricycleFuelEfficiency: 25,
  multicabFuelEfficiency: 15,
  laborAllowance: 25,           // ₱ flat per trip
  floorFee: 30,                 // ₱ minimum fee
  selfDeliveryMaxKm: 25,        // one-way km limit
} as const;

export const THIRD_PARTY_FLAT_RATES: Record<number, number> = {
  1: 50,    // same municipality, hired rider/habal-habal
  2: 80,    // neighboring municipality, hired rider/van
  3: 150,   // same province, not neighboring
  4: 200,   // same region or same island group
  5: 350,   // inter-island
};
