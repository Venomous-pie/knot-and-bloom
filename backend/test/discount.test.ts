import { describe, it, expect } from '@jest/globals';
import { calculateDiscount } from '../src/utils/discount.js';

describe('calculateDiscount', () => {
  it('should return zero values for invalid basePrice (not finite)', () => {
    const result = calculateDiscount({ basePrice: NaN, discountedPrice: 50 });
    expect(result).toEqual({
      basePrice: 0,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return zero values for invalid basePrice (<= 0)', () => {
    const result = calculateDiscount({ basePrice: 0, discountedPrice: 50 });
    expect(result).toEqual({
      basePrice: 0,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return zero values for invalid basePrice (negative)', () => {
    const result = calculateDiscount({ basePrice: -10, discountedPrice: 50 });
    expect(result).toEqual({
      basePrice: 0,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPrice is null', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: null });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPrice is undefined', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: undefined });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPrice is 0', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: 0 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPrice is not finite', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: NaN });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPrice >= basePrice', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: 100 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPrice > basePrice', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: 150 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should calculate discount correctly for valid inputs', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: 80 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: 80,
      discountPercentage: 20,
    });
  });

  it('should round discount percentage correctly', () => {
    const result = calculateDiscount({ basePrice: 100, discountedPrice: 85 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: 85,
      discountPercentage: 15,
    });
  });

  it('should handle floating point basePrice and discountedPrice', () => {
    const result = calculateDiscount({ basePrice: 99.99, discountedPrice: 79.99 });
    expect(result).toEqual({
      basePrice: 99.99,
      discountedPrice: 79.99,
      discountPercentage: 20,
    });
  });
});
