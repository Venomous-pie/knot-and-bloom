export const calculateDiscountPercentage = (
  basePrice: string | number | bigint,
  discountedPrice?: string | number | bigint | null
): number => {
  if (!discountedPrice) return 0;

  const base = Number(basePrice);
  const discounted = Number(discountedPrice);

  if (base <= 0 || discounted >= base) return 0;

  return Math.round(((base - discounted) / base) * 100);
};
