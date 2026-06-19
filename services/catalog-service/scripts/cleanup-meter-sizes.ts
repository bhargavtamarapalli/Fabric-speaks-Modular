import { getDbPool, getRedisClient } from '@fs/shared';
import { VariantTemplateRepository } from '../src/repositories/variant_template.repository';
import { VariantRepository } from '../src/repositories/variant.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runCleanup() {
    const db = getDbPool();
    const redis = getRedisClient();
    const templateRepo = new VariantTemplateRepository(db);
    const variantRepo = new VariantRepository(db);
    
    const meterSizes = ['0.5m', '1m', '1.5m', '2m', '2.5m', '3m', '5m', '10m'];
    
    console.log('--- METER SIZES CLEANUP START ---');
    
    // 1. Templates cleanup
    console.log('Cleaning up templates...');
    const templates = await templateRepo.findAll();
    let templatesUpdated = 0;
    let templatesDeleted = 0;

    for (const template of templates) {
        const filteredSizes = template.sizes.filter(s => !meterSizes.includes(s));
        if (filteredSizes.length === 0) {
            await templateRepo.delete(template.id);
            templatesDeleted++;
            console.log(`[DELETE] Template empty: ${template.name}`);
        } else if (filteredSizes.length !== template.sizes.length) {
            await templateRepo.update(template.id, filteredSizes, template.colours);
            templatesUpdated++;
            console.log(`[UPDATE] Template sizes removed: ${template.name} (${template.sizes.length} -> ${filteredSizes.length})`);
        }
    }

    // 2. Variants cleanup
    console.log('Cleaning up variants...');
    const variantsDeleted = await variantRepo.deleteBySizes(meterSizes);
    console.log(`[SUCCESS] Deactivated ${variantsDeleted} variants.`);

    // 3. Cache cleanup
    console.log('Cleaning up cache...');
    await redis.del('catalog:variant_templates');
    
    // Clear all catalog list cache
    const stream = redis.scanStream({
        match: 'catalog:list:*',
        count: 100
    });
    
    for await (const keys of stream) {
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
    
    console.log('--- CLEANUP COMPLETE ---');
    console.log(`Summary:`);
    console.log(`- Templates Updated: ${templatesUpdated}`);
    console.log(`- Templates Deleted: ${templatesDeleted}`);
    console.log(`- Variants Deactivated: ${variantsDeleted}`);
    
    await db.end();
    await redis.quit();
    process.exit(0);
}

runCleanup().catch(err => {
    console.error('CRITICAL: Cleanup failed', err);
    process.exit(1);
});
