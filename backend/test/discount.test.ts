import { describe, it, expect } from '@jest/globals';
import { CalculateDiscount } from '../src/utils/discount.js';

describe('CalculateDiscount', () => {
  it('should return zero values for invalid basePrice (not finite)', () => {
    const result = CalculateDiscount({ basePrice: NaN, discountedPercentage: 20 });
    expect(result).toEqual({
      basePrice: 0,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return zero values for invalid basePrice (<= 0)', () => {
    const result = CalculateDiscount({ basePrice: 0, discountedPercentage: 20 });
    expect(result).toEqual({
      basePrice: 0,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return zero values for invalid basePrice (negative)', () => {
    const result = CalculateDiscount({ basePrice: -10, discountedPercentage: 20 });
    expect(result).toEqual({
      basePrice: 0,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPercentage is null', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: null });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPercentage is undefined', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: undefined });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPercentage is 0', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: 0 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPercentage is not finite', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: NaN });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPercentage <= 0', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: -5 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPercentage >= 100', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: 100 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should return basePrice and null discountedPrice when discountedPercentage > 100', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: 150 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: null,
      discountPercentage: 0,
    });
  });

  it('should calculate discount correctly for valid inputs', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: 20 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: 80,
      discountPercentage: 20,
    });
  });

  it('should round discountedPrice to 2 decimal places', () => {
    const result = CalculateDiscount({ basePrice: 100, discountedPercentage: 33.333 });
    expect(result).toEqual({
      basePrice: 100,
      discountedPrice: 66.67,
      discountPercentage: 33.333,
    });
  });

  it('should handle floating point basePrice and discountedPercentage', () => {
    const result = CalculateDiscount({ basePrice: 99.99, discountedPercentage: 20 });
    expect(result).toEqual({
      basePrice: 99.99,
      discountedPrice: 79.99,
      discountPercentage: 20,
    });
  });
});
