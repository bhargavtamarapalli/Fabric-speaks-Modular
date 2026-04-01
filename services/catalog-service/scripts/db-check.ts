import { getDbPool } from '@fs/shared';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
    const db = getDbPool();
    
    console.log('--- DB CHECK ---');
    
    const { rows: templates } = await db.query('SELECT * FROM variant_templates');
    console.log('Templates:');
    console.log(JSON.stringify(templates, null, 2));
    
    const { rows: variants } = await db.query("SELECT size, count(*) FROM variants WHERE is_deleted = false GROUP BY size");
    console.log('Variants by size:');
    console.log(JSON.stringify(variants, null, 2));
    
    await db.end();
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
