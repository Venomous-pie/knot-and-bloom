import { loadEnv } from '../config/env.js';
loadEnv();
import fs from 'fs';
import path from 'path';

const IK_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const IK_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';

async function uploadToImageKit(
    localFile: string,
    fileName: string,
    folder: string
): Promise<string | null> {
    if (!IK_PRIVATE_KEY) {
        console.warn('  ⚠️  IMAGEKIT_PRIVATE_KEY not set – skipping upload');
        return null;
    }

    const fileBuffer = fs.readFileSync(localFile);
    const form = new FormData();
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    form.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);
    form.append('fileName', fileName);
    form.append('folder', `/seed/${folder}`);
    form.append('useUniqueFileName', 'true');

    const credentials = Buffer.from(`${IK_PRIVATE_KEY}:`).toString('base64');

    const res = await fetch(IK_UPLOAD_URL, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
        },
        body: form,
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`  ❌ Failed to upload ${fileName}:`, err);
        return null;
    }

    const data = await res.json();
    return data.url;
}

async function main() {
    console.log('Uploading Official Store Assets...');
    
    const bannerUrl = await uploadToImageKit(
        'C:\\Users\\User\\knot-and-bloom\\frontend\\assets\\main_store\\banner.png',
        'banner.png',
        'official_store'
    );
    const logoUrl = await uploadToImageKit(
        'C:\\Users\\User\\knot-and-bloom\\frontend\\assets\\main_store\\logo.png',
        'logo.png',
        'official_store'
    );
    
    console.log('Banner URL:', bannerUrl);
    console.log('Logo URL:', logoUrl);
}

main().catch(console.error);
