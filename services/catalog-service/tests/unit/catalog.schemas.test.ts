import { describe, it, expect } from 'vitest';
import { BulkUpdateVariantsSchema, CreateProductSchema, CreateVariantSchema, UpdateBrandSchema, UpdateVariantSchema } from '../../src/schemas/catalog.schemas';

describe('Catalog Schemas', () => {
    describe('CreateProductSchema', () => {
        it('should validate a valid product payload with all USP fields', () => {
            const validPayload = {
                name: 'Premium Linen Shirt',
                slug: 'premium-linen-shirt',
                brandId: '123e4567-e89b-12d3-a456-426614174000',
                categoryId: '123e4567-e89b-12d3-a456-426614174001',
                fabricType: 'Linen',
                gsmWeight: 180,
                weaveType: 'Plain',
                breathabilityRating: 'High',
                careInstructions: 'Machine wash cold',
                fabricOrigin: 'India',
                variants: [
                    {
                        sku: 'LINEN-001',
                        basePrice: 1499,
                        qty: 10
                    }
                ]
            };

            const result = CreateProductSchema.safeParse(validPayload);
            expect(result.success).toBe(true);
        });

        it('should fail validation if USP fields are missing', () => {
            const invalidPayload = {
                name: 'Basic Cotton Tee',
                slug: 'basic-cotton-tee',
                brandId: '123e4567-e89b-12d3-a456-426614174000',
                categoryId: '123e4567-e89b-12d3-a456-426614174001',
                // Missing fabric_type, gsm_weight, etc.
                variants: []
            };

            const result = CreateProductSchema.safeParse(invalidPayload);
            expect(result.success).toBe(false);
            if (!result.success) {
                const errors = result.error.errors.map(e => e.path[0]);
                expect(errors).toContain('fabricType');
                expect(errors).toContain('gsmWeight');
            }
        });
        
        it('should fail if slug is not URL-friendly', () => {
             const invalidPayload = {
                name: 'Shirt 123',
                slug: 'Shirt 123!', // Invalid formatting
                brandId: '123e4567-e89b-12d3-a456-426614174000',
                categoryId: '123e4567-e89b-12d3-a456-426614174001',
                fabricType: 'Cotton',
                gsmWeight: 150,
                weaveType: 'Jersey',
                breathabilityRating: 'Medium',
                careInstructions: 'Wash normally',
                fabricOrigin: 'India',
                variants: [
                    {
                        sku: 'TEE-001',
                        basePrice: 699,
                        qty: 4
                    }
                ]
            };
            const result = CreateProductSchema.safeParse(invalidPayload);
            expect(result.success).toBe(false);
        });

        it('should fail if variants are missing', () => {
            const invalidPayload = {
                name: 'Premium Linen Shirt',
                slug: 'premium-linen-shirt',
                brandId: '123e4567-e89b-12d3-a456-426614174000',
                categoryId: '123e4567-e89b-12d3-a456-426614174001',
                fabricType: 'Linen',
                gsmWeight: 180,
                weaveType: 'Plain',
                breathabilityRating: 'High',
                careInstructions: 'Machine wash cold',
                fabricOrigin: 'India',
            };

            const result = CreateProductSchema.safeParse(invalidPayload);
            expect(result.success).toBe(false);
        });
    });

    describe('BulkUpdateVariantsSchema', () => {
        it('should validate bulk variant updates', () => {
            const payload = {
                variants: [
                    {
                        variantId: '123e4567-e89b-12d3-a456-426614174099',
                        qty: 20,
                        basePrice: 1599
                    }
                ]
            };

            const result = BulkUpdateVariantsSchema.safeParse(payload);
            expect(result.success).toBe(true);
        });
    });

    describe('Variant CRUD schemas', () => {
        it('should validate single variant creation payload', () => {
            const payload = {
                size: 'M',
                colour: 'Navy',
                sizeLabel: 'M (38-40)',
                basePrice: 1499,
                saleActive: false
            };

            const result = CreateVariantSchema.safeParse(payload);
            expect(result.success).toBe(true);
        });

        it('should reject update payloads that try to change immutable fields', () => {
            const payload = {
                size: 'L'
            };

            const result = UpdateVariantSchema.safeParse(payload);
            expect(result.success).toBe(false);
        });

        it('should require salePrice when saleActive=true on create', () => {
            const payload = {
                size: 'M',
                colour: 'Navy',
                sizeLabel: 'M (38-40)',
                basePrice: 1499,
                saleActive: true
            };

            const result = CreateVariantSchema.safeParse(payload);
            expect(result.success).toBe(false);
        });
    });

    describe('Brand schemas', () => {
        it('should reject empty brand update payloads', () => {
            const result = UpdateBrandSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });
});
