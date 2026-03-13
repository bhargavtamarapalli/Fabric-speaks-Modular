import { describe, it, expect } from 'vitest';
import { CreateProductSchema } from '../../src/schemas/catalog.schemas';

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
            };
            const result = CreateProductSchema.safeParse(invalidPayload);
            expect(result.success).toBe(false);
        });
    });
});
