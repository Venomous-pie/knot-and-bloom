import type { GenerateSKUInput, GenerateVariantSKUInput, ProductDescriptionInput } from '../types/productTypes.js';
export declare function generateProductDescription(product: ProductDescriptionInput): Promise<string | null>;
export declare function generateProductSKU(input: GenerateSKUInput): Promise<string>;
export declare function generateVariantSKU(input: GenerateVariantSKUInput): Promise<string>;
export declare function generateOptionValues(optionName: string): Promise<string[]>;
//# sourceMappingURL=GenerateService.d.ts.map