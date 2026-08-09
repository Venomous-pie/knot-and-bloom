/**
 * seedMainStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the 3 "main store" sellers for Knot & Bloom, each with 3 realistic
 * products drawn from the actual seed images in frontend/assets/seed_image.
 *
 * Image strategy: upload each local image to ImageKit via their server-side
 * upload API (private_key + FormData), store the returned CDN URL, then use
 * those URLs in the product records.  If ImageKit upload fails the script
 * still completes but uses a fallback placeholder so DB is never broken.
 *
 * Run:  npx tsx src/scripts/seedMainStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaUtils.js';
import { Role, SellerStatus, ProductStatus, FulfillmentType } from '../../generated/prisma/client.js';

// ── paths ─────────────────────────────────────────────────────────────────────
const SEED_IMG_DIR = 'C:\\Users\\User\\knot-and-bloom\\frontend\\assets\\seed_image';

// ── ImageKit helpers ──────────────────────────────────────────────────────────
const IK_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const IK_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';

async function uploadToImageKit(
    localFile: string,
    fileName: string,
    folder: string
): Promise<string | null> {
    try {
        if (!IK_PRIVATE_KEY) {
            console.warn('  ⚠️  IMAGEKIT_PRIVATE_KEY not set – skipping upload');
            return null;
        }

        const fileBuffer = fs.readFileSync(localFile);
        // Node 22 native FormData + Blob (no external packages needed)
        const form = new FormData();
        const ext = path.extname(fileName).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        form.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);
        form.append('fileName', fileName);
        form.append('folder', `/seed/${folder}`);
        form.append('useUniqueFileName', 'true');

        // ImageKit uses HTTP Basic Auth: privateKey as username, empty password
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
            console.warn(`  ⚠️  ImageKit upload failed (${res.status}): ${err}`);
            return null;
        }

        const json = (await res.json()) as { url: string };
        console.log(`  📸 Uploaded ${fileName} → ${json.url}`);
        return json.url;
    } catch (e) {
        console.warn(`  ⚠️  ImageKit upload error for ${fileName}:`, e);
        return null;
    }
}

// fallback placeholder
const placeholder = (hex: string, label = '+') =>
    `https://placehold.co/800x800/${hex}/white?text=${encodeURIComponent(label)}`;

// ── Upload all seed images ────────────────────────────────────────────────────
async function uploadSeedImages(): Promise<any> {
    console.log('\n📤 Uploading seed images to ImageKit...');

        const uploadFileFromSrc = async (srcPath: string, filename: string, folder: string): Promise<string> => {
        if (!fs.existsSync(srcPath)) {
            console.warn(`  ⚠️  File not found: ${srcPath}`);
            return placeholder('E8C4C8', filename);
        }
        const url = await uploadToImageKit(srcPath, filename, folder);
        return url ?? placeholder('E8C4C8', filename);
    };

    const uploadFile = async (filename: string, folder: string): Promise<string> => {
        const localPath = path.join(SEED_IMG_DIR, filename);
        return uploadFileFromSrc(localPath, filename, folder);
    };

    const ami: string[] = [];
    for (let i = 1; i <= 4; i++) ami.push(await uploadFile(`ami_${i}.jpg`, 'amigurumi'));
    ami.push(await uploadFile('ami_5.png', 'amigurumi'));

    const crobag: string[] = [];
    for (let i = 1; i <= 5; i++) crobag.push(await uploadFile(`crobag_${i}.jpg`, 'crochet-bags'));

    const flow: string[] = [];
    for (let i = 1; i <= 5; i++) flow.push(await uploadFile(`flow_${i}.jpg`, 'fuzzy-flowers'));

    const lumina_logo = await uploadFile('lumina_logo.png', 'store_assets');
    const lumina_banner = await uploadFile('lumina_banner.png', 'store_assets');
    const pintura_logo = await uploadFile('pintura_logo.png', 'store_assets');
    const pintura_banner = await uploadFileFromSrc(path.join(SEED_IMG_DIR, 'pintura_banner.png'), 'pintura_banner.png', 'store_assets');

    const ami_logo = await uploadFileFromSrc(path.join(SEED_IMG_DIR, 'ami_logo.png'), 'ami_logo.png', 'store_assets');
    const ami_banner = await uploadFileFromSrc(path.join(SEED_IMG_DIR, 'ami_banner.png'), 'ami_banner.png', 'store_assets');
    const crobag_logo = await uploadFileFromSrc(path.join(SEED_IMG_DIR, 'crobag_logo.png'), 'crobag_logo.png', 'store_assets');
    const crobag_banner = await uploadFileFromSrc(path.join(SEED_IMG_DIR, 'crobag_banner.png'), 'crobag_banner.png', 'store_assets');
    const lena_logo = await uploadFileFromSrc(path.join(SEED_IMG_DIR, 'lena_logo.png'), 'lena_logo.png', 'store_assets');
    const lena_banner = await uploadFileFromSrc(path.join(SEED_IMG_DIR, 'lena_banner.png'), 'lena_banner.png', 'store_assets');

    const newImgs = {
        beaded_bracelets: [] as string[],
        beaded_necklace: [] as string[],
        crochet_purse: [] as string[],
        crochet_set_one: [] as string[],
        crochet_set_two: [] as string[],
        crochet_tops: [] as string[],
        fuzzy_keychains: [] as string[],
        fuzzy_wire_bouquet: [] as string[],
        hair_ties: [] as string[],
        paintings: [] as string[],
        resin_door: [] as string[]
    };

    const PRODUCT_IMAGES_DIR = 'C:\\Users\\User\\knot-and-bloom\\frontend\\assets\\product_images';
    
    const uploadNewDir = async (dir: string, arr: string[]) => {
        const fullPath = path.join(PRODUCT_IMAGES_DIR, dir);
        if (!fs.existsSync(fullPath)) return;
        const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
        for (const file of files) {
            arr.push(await uploadFileFromSrc(path.join(fullPath, file), file, dir));
        }
    };

    await uploadNewDir('beaded_bracelets', newImgs.beaded_bracelets);
    await uploadNewDir('beaded_necklace', newImgs.beaded_necklace);
    await uploadNewDir('crochet_purse', newImgs.crochet_purse);
    await uploadNewDir('crochet_set_one_shop_type', newImgs.crochet_set_one);
    await uploadNewDir('crochet_set_two_shop_type', newImgs.crochet_set_two);
    await uploadNewDir('crochet_tops', newImgs.crochet_tops);
    await uploadNewDir('fuzzy_keychains', newImgs.fuzzy_keychains);
    await uploadNewDir('fuzzy_wire_bouquet', newImgs.fuzzy_wire_bouquet);
    await uploadNewDir('hair_ties', newImgs.hair_ties);
    await uploadNewDir('paintings', newImgs.paintings);
    await uploadNewDir('resin_door_decorations', newImgs.resin_door);

    return { ami, crobag, flow, newImgs, lumina_logo, lumina_banner, pintura_logo, pintura_banner, ami_logo, ami_banner, crobag_logo, crobag_banner, lena_logo, lena_banner };
}


// ── Seller definitions ────────────────────────────────────────────────────────
const SELLER_DEFS = [
    {
        user: {
            name: 'Maria Santos',
            email: 'maria.santos@knotbloom-seed.com',
            password: 'Password123!',
            phone: '+639171234001',
        },
        seller: {
            name: 'Ami ni Maria',
            slug: 'ami-ni-maria',
            description:
                'Lahat ng amigurumi ay gawa-gawa ko mismo gamit ang premium velvet at cotton yarn. ' +
                'Pwede ring i-customize ang kulay at design para sa gifts, events, o graduation tokens!',
            businessAddress: 'Brgy. San Roque, Antipolo City, Rizal',
            legalName: 'Maria Corazon A. Santos',
            phone: '+639171234001',
            productCategories: ['amigurumi', 'mini-stuffed-toy', 'crochet-key-chains'],
            isHandmade: true,
            hasPriorExperience: true,
            salesChannels: ['Facebook', 'Instagram', 'Word of mouth'],
            monthlyOrders: '11-30 orders',
            sampleItems: ['Amigurumi Sanrio characters', 'Mini stuffed bunnies', 'Crochet keychains'],
            portfolioLink: 'https://www.facebook.com/aminimaria',
            idType: 'National ID',
            idNumber: 'PH-1234-5678-SEED',
            termsAccepted: true,
            sellerCitymunCode: '045802000',
            sellerProvCode: '0458',
            sellerRegCode: '04',
            selfDeliveryEnabled: false,
            commissionRate: 0.12,
            freeShippingEnabled: false,
            freeShippingThreshold: 0,
        },
    },
    {
        user: {
            name: 'Diane Reyes',
            email: 'diane.reyes@knotbloom-seed.com',
            password: 'Password123!',
            phone: '+639181234002',
        },
        seller: {
            name: 'The Crobag Studio',
            slug: 'the-crobag-studio',
            description:
                'Handmade crocheted tote bags na durable at fashionable. Bawat bag ay ginagawa ko ng may pagmamahal. ' +
                'Open din ako sa custom orders — piliin ang kulay, size, at accessories!',
            businessAddress: 'Brgy. Plainview, Mandaluyong City, Metro Manila',
            legalName: 'Diane Marie B. Reyes',
            phone: '+639181234002',
            productCategories: ['crochet', 'accessories'],
            isHandmade: true,
            hasPriorExperience: true,
            salesChannels: ['Shopee', 'Instagram', 'Tiktok Shop'],
            monthlyOrders: '31-60 orders',
            sampleItems: ['Open-weave shoulder bag', 'Bow-front crossbody', 'Market tote'],
            portfolioLink: 'https://www.instagram.com/thecrobagstudio',
            idType: "Driver's License",
            idNumber: 'DL-SEED-9876',
            termsAccepted: true,
            sellerCitymunCode: '137602000',
            sellerProvCode: '1376',
            sellerRegCode: '13',
            selfDeliveryEnabled: false,
            commissionRate: 0.12,
            freeShippingEnabled: true,
            freeShippingThreshold: 800,
        },
    },
    {
        user: {
            name: 'Lena Cruz',
            email: 'lena.cruz@knotbloom-seed.com',
            password: 'Password123!',
            phone: '+639191234003',
        },
        seller: {
            name: "Lena's Blooms",
            slug: 'lenas-blooms',
            description:
                'Forever flowers made of fuzzy chenille wire — hindi kailanman malalagas, hindi kailanman matutuyo. ' +
                'Perfect para sa mga espesyal na okasyon: birthday, anniversary, graduation, o basta na lang para mapangiti ang mahal mo sa buhay.',
            businessAddress: 'Brgy. Batong Malake, Los Baños, Laguna',
            legalName: 'Lena Marie C. Cruz',
            phone: '+639191234003',
            productCategories: ['fuzzy-wire-bouquet', 'fuzzy-wire-art'],
            isHandmade: true,
            hasPriorExperience: false,
            salesChannels: ['Facebook', 'TikTok'],
            monthlyOrders: '1-10 orders',
            sampleItems: ['Pastel flower bouquet', 'Sunflower arrangement', 'Mixed wildflower set'],
            portfolioLink: 'https://www.tiktok.com/@lenablooms',
            idType: 'School ID',
            idNumber: 'UPLB-SEED-2024',
            termsAccepted: true,
            sellerCitymunCode: '045810000',
            sellerProvCode: '0458',
            sellerRegCode: '04',
            selfDeliveryEnabled: false,
            commissionRate: 0.12,
            freeShippingEnabled: false,
            freeShippingThreshold: 0,
        },
    },

    {
        user: {
            name: 'Luisa Mina',
            email: 'luisa.mina@knotbloom-seed.com',
            password: 'Password123!',
            phone: '+639201234004',
        },
        seller: {
            name: 'Lumina Beads',
            slug: 'lumina-beads',
            description: 'Handcrafted beaded jewelry and elegant hair ties that add a sparkle to your everyday look. Each piece is carefully strung with premium glass beads and crystals.',
            businessAddress: 'Brgy. San Antonio, Pasig City, Metro Manila',
            legalName: 'Luisa Mina S. Perez',
            phone: '+639201234004',
            productCategories: ['beaded-jewelry', 'hair-tie'],
            isHandmade: true,
            hasPriorExperience: true,
            salesChannels: ['Instagram', 'Pop-up Markets'],
            monthlyOrders: '31-60 orders',
            sampleItems: ['Glass bead bracelet', 'Pearl necklace', 'Satin hair ties'],
            portfolioLink: 'https://www.instagram.com/luminabeads',
            idType: 'Passport',
            idNumber: 'P1234567A',
            termsAccepted: true,
            sellerCitymunCode: '137404000',
            sellerProvCode: '1374',
            sellerRegCode: '13',
            selfDeliveryEnabled: false,
            commissionRate: 0.12,
            freeShippingEnabled: true,
            freeShippingThreshold: 1000,
        },
    },
    {
        user: {
            name: 'Leo Tolentino',
            email: 'leo.tolentino@knotbloom-seed.com',
            password: 'Password123!',
            phone: '+639211234005',
        },
        seller: {
            name: 'Pintura at Likha',
            slug: 'pintura-at-likha',
            description: 'Original canvas paintings and beautiful resin door decorations. I pour my heart and soul into every brushstroke and resin cast to bring vibrant art into your home.',
            businessAddress: 'Brgy. UP Campus, Quezon City, Metro Manila',
            legalName: 'Leo Alfonso T. Tolentino',
            phone: '+639211234005',
            productCategories: ['paintings-wall-art', 'resin-crafts'],
            isHandmade: true,
            hasPriorExperience: true,
            salesChannels: ['Facebook', 'Art Exhibits'],
            monthlyOrders: '1-10 orders',
            sampleItems: ['Acrylic landscape painting', 'Resin floral door sign'],
            portfolioLink: 'https://www.facebook.com/pinturaatlikha',
            idType: 'UMID',
            idNumber: 'CRN-123-456-789-0',
            termsAccepted: true,
            sellerCitymunCode: '137404000',
            sellerProvCode: '1374',
            sellerRegCode: '13',
            selfDeliveryEnabled: true,
            commissionRate: 0.12,
            freeShippingEnabled: false,
            freeShippingThreshold: 0,
        },
    }
];


// ── Pricing helper ────────────────────────────────────────────────────────────
function calcDiscountedPrice(basePrice: number, pct?: number | null): number | null {
    if (!pct || pct <= 0) return null;
    return Math.round(basePrice * (1 - pct / 100));
}

// ── Product definitions ───────────────────────────────────────────────────────
function buildProductDefs(imgs: any) {
    const ami = imgs.ami;
    const bag = imgs.crobag;
    const flo = imgs.flow;
    return [
        // ═══════════════════════════ NEW PRODUCTS ═══════════════════════
        {
            si: 0,
            name: 'Fuzzy Monster Keychain Plushies',
            sku: 'AMI-FZKY-10004',
            categories: ['fuzzy-wire-art', 'key-chains', 'mini-stuffed-toy'],
            basePrice: 180,
            discountPercentage: 5,
            description: 'Super cute fuzzy monster keychain plushies! Guaranteed to bring a smile to your face. These are made with premium soft faux fur yarn, perfect for bags, keys, or gifts. Get them in assorted colors! They are durable, adorable, and extremely huggable.',
            materials: 'Premium soft faux fur yarn, polyester stuffing, metal keychain ring',
            careInstructions: 'Spot clean only with a damp cloth. Do not submerge in water.',
            tags: ['keychain', 'plushie', 'fuzzy', 'monster', 'cute', 'gift'],
            metaTitle: 'Fuzzy Monster Keychain Plushies | Cute Bag Charms',
            metaDescription: 'Adorable handmade fuzzy monster keychains in assorted colors. Premium soft faux fur yarn bag charms.',
            image: imgs.newImgs.fuzzy_keychains[0] || imgs.ami[0],
            images: imgs.newImgs.fuzzy_keychains.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@aminimaria/video/1234567890',
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: '1-2 business days',
            isCodAllowed: true,
            isLocalPickupAllowed: false,
            isCustomOrderAllowed: false,
            isBundle: false,
            minOrderQty: 1,
            maxOrderQty: 20,
            soldCount: 88,
            productOptions: [
                {
                    name: 'Color Variation',
                    position: 0,
                    values: [
                        { value: 'Variation 1', imageUrl: imgs.newImgs.fuzzy_keychains[0] },
                        { value: 'Variation 2', imageUrl: imgs.newImgs.fuzzy_keychains[1] },
                        { value: 'Variation 3', imageUrl: imgs.newImgs.fuzzy_keychains[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Variation 1', sku: 'AMI-FZKY-10004-V1', stock: 10, price: 180, discountPercentage: 5, images: [imgs.newImgs.fuzzy_keychains[0]], isEnabled: true, options: { 'Color Variation': 'Variation 1' } },
                { name: 'Variation 2', sku: 'AMI-FZKY-10004-V2', stock: 12, price: 180, discountPercentage: 5, images: [imgs.newImgs.fuzzy_keychains[1]], isEnabled: true, options: { 'Color Variation': 'Variation 2' } },
                { name: 'Variation 3', sku: 'AMI-FZKY-10004-V3', stock: 8, price: 180, discountPercentage: 5, images: [imgs.newImgs.fuzzy_keychains[2]], isEnabled: true, options: { 'Color Variation': 'Variation 3' } },
            ],
        },
        {
            si: 1,
            name: 'Handmade Crochet Everyday Purse',
            sku: 'BAG-HCEP-20004',
            categories: ['crochet-bags', 'accessories'],
            basePrice: 550,
            discountPercentage: 10,
            description: 'A beautifully handmade crochet everyday purse that fits your essentials perfectly! Made with thick cotton cord for durability. Features a secure button closure and a comfortable strap. Perfect for quick errands, coffee dates, or casual walks.',
            materials: '100% thick cotton cord yarn, wooden button closure, woven lining',
            careInstructions: 'Hand wash gently in cold water. Lay flat to dry to maintain shape. Do not bleach.',
            tags: ['crochet', 'purse', 'bag', 'handmade', 'cotton', 'everyday'],
            metaTitle: 'Handmade Crochet Everyday Purse | The Crobag Studio',
            metaDescription: 'Durable, stylish crochet purse handmade with thick cotton cord. Perfect for everyday essentials.',
            image: imgs.newImgs.crochet_purse[0] || imgs.crobag[0],
            images: imgs.newImgs.crochet_purse.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@thecrobagstudio/video/1234567890',
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '3-5 business days',
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            isCustomOrderAllowed: false,
            minOrderQty: 1,
            maxOrderQty: 5,
            soldCount: 42,
            productOptions: [
                {
                    name: 'Style',
                    position: 0,
                    values: [
                        { value: 'Style A', imageUrl: imgs.newImgs.crochet_purse[0] },
                        { value: 'Style B', imageUrl: imgs.newImgs.crochet_purse[1] },
                        { value: 'Style C', imageUrl: imgs.newImgs.crochet_purse[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Style A', sku: 'BAG-HCEP-20004-A', stock: 6, price: 550, discountPercentage: 10, images: [imgs.newImgs.crochet_purse[0]], isEnabled: true, options: { 'Style': 'Style A' } },
                { name: 'Style B', sku: 'BAG-HCEP-20004-B', stock: 6, price: 550, discountPercentage: 10, images: [imgs.newImgs.crochet_purse[1]], isEnabled: true, options: { 'Style': 'Style B' } },
                { name: 'Style C', sku: 'BAG-HCEP-20004-C', stock: 8, price: 550, discountPercentage: 10, images: [imgs.newImgs.crochet_purse[2]], isEnabled: true, options: { 'Style': 'Style C' } },
            ],
        },
        {
            si: 1,
            name: 'Boho Summer Crochet Crop Tops',
            sku: 'BAG-BOHC-20005',
            categories: ['tops', 'crochet'],
            basePrice: 890,
            discountPercentage: 15,
            description: 'Embrace the summer vibes with these stunning boho crochet crop tops! Hand-stitched with lightweight, breathable milk cotton yarn. Perfect for beach trips, festivals, or paired with high-waisted jeans. Adjustable tie-back strings for a perfect fit!',
            materials: 'Soft milk cotton yarn (80% cotton, 20% acrylic)',
            careInstructions: 'Hand wash gently. Do not wring or twist. Lay flat to air dry. Do not iron.',
            tags: ['crochet', 'top', 'summer', 'boho', 'beach', 'apparel'],
            metaTitle: 'Boho Summer Crochet Crop Tops | Beach Wear PH',
            metaDescription: 'Hand-stitched lightweight crochet crop tops. Perfect for summer, beach trips, and music festivals.',
            image: imgs.newImgs.crochet_tops[0] || imgs.crobag[0],
            images: imgs.newImgs.crochet_tops.slice(0, 5),
            videoUrl: 'https://www.instagram.com/p/1234567890/',
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: '1-2 business days',
            isCodAllowed: true,
            isLocalPickupAllowed: false,
            isCustomOrderAllowed: true,
            minOrderQty: 1,
            maxOrderQty: 10,
            soldCount: 105,
            productOptions: [
                {
                    name: 'Design',
                    position: 0,
                    values: [
                        { value: 'Design A', imageUrl: imgs.newImgs.crochet_tops[0] },
                        { value: 'Design B', imageUrl: imgs.newImgs.crochet_tops[1] },
                        { value: 'Design C', imageUrl: imgs.newImgs.crochet_tops[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Design A', sku: 'BAG-BOHC-20005-A', stock: 15, price: 890, discountPercentage: 15, images: [imgs.newImgs.crochet_tops[0]], isEnabled: true, options: { 'Design': 'Design A' } },
                { name: 'Design B', sku: 'BAG-BOHC-20005-B', stock: 12, price: 890, discountPercentage: 15, images: [imgs.newImgs.crochet_tops[1]], isEnabled: true, options: { 'Design': 'Design B' } },
                { name: 'Design C', sku: 'BAG-BOHC-20005-C', stock: 10, price: 890, discountPercentage: 15, images: [imgs.newImgs.crochet_tops[2]], isEnabled: true, options: { 'Design': 'Design C' } },
            ],
        },
        {
            si: 2,
            name: 'Premium Fuzzy Wire Floral Arrangement',
            sku: 'FLW-PRMA-30004',
            categories: ['fuzzy-wire-bouquet', 'flower-bouquets'],
            basePrice: 1250,
            discountPercentage: 10,
            description: 'Upgrade your gifting with our Premium Fuzzy Wire Floral Arrangements. This extra-large bouquet features an intricate mix of faux roses, daisies, and lavender crafted entirely from soft fuzzy chenille wires. Wrapped beautifully in premium frosted paper and tied with a silk ribbon. A gift that truly lasts forever!',
            materials: 'Fuzzy chenille wire, premium frosted wrapper, silk ribbon, faux pearl accents',
            careInstructions: 'Keep away from moisture and direct sunlight. Dust lightly with a soft brush.',
            tags: ['fuzzy-wire', 'bouquet', 'premium', 'forever-flowers', 'gift', 'romantic'],
            metaTitle: 'Premium Fuzzy Wire Floral Arrangement | Extra Large Bouquet',
            metaDescription: 'Extra-large premium fuzzy wire floral arrangement. Intricate mix of faux roses and daisies wrapped in frosted paper.',
            image: imgs.newImgs.fuzzy_wire_bouquet[0] || imgs.flow[0],
            images: imgs.newImgs.fuzzy_wire_bouquet.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@lenasblooms/video/1234567890',
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '5-7 business days',
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            isCustomOrderAllowed: true,
            minOrderQty: 1,
            maxOrderQty: 5,
            soldCount: 56,
            productOptions: [
                {
                    name: 'Style',
                    position: 0,
                    values: [
                        { value: 'Style 1', imageUrl: imgs.newImgs.fuzzy_wire_bouquet[0] },
                        { value: 'Style 2', imageUrl: imgs.newImgs.fuzzy_wire_bouquet[1] },
                        { value: 'Style 3', imageUrl: imgs.newImgs.fuzzy_wire_bouquet[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Style 1', sku: 'FLW-PRMA-30004-1', stock: 6, price: 1250, discountPercentage: 10, images: [imgs.newImgs.fuzzy_wire_bouquet[0]], isEnabled: true, options: { 'Style': 'Style 1' } },
                { name: 'Style 2', sku: 'FLW-PRMA-30004-2', stock: 6, price: 1250, discountPercentage: 10, images: [imgs.newImgs.fuzzy_wire_bouquet[1]], isEnabled: true, options: { 'Style': 'Style 2' } },
                { name: 'Style 3', sku: 'FLW-PRMA-30004-3', stock: 6, price: 1250, discountPercentage: 10, images: [imgs.newImgs.fuzzy_wire_bouquet[2]], isEnabled: true, options: { 'Style': 'Style 3' } },
            ],
        },
        {
            si: 3,
            name: 'Sparkling Glass Bead Bracelets',
            sku: 'LUM-SGBB-40001',
            categories: ['beaded-jewelry'],
            basePrice: 350,
            discountPercentage: 20,
            description: 'Add a touch of elegance to your wrist with these sparkling glass bead bracelets! Each bead is carefully selected to catch the light beautifully. Strung on high-quality elastic cord for a comfortable fit. Perfect for stacking or wearing on its own.',
            materials: 'Premium facet glass beads, high-quality elastic cord, gold-plated spacer beads',
            careInstructions: 'Avoid contact with water, perfume, and lotions to prevent tarnishing of spacer beads. Roll on and off your wrist.',
            tags: ['beaded', 'bracelet', 'jewelry', 'sparkling', 'glass-beads', 'elegant'],
            metaTitle: 'Sparkling Glass Bead Bracelets | Lumina Beads PH',
            metaDescription: 'Elegant sparkling glass bead bracelets handcrafted with premium faceted beads and gold-plated spacers.',
            image: imgs.newImgs.beaded_bracelets[0],
            images: imgs.newImgs.beaded_bracelets.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@luminabeads/video/1234567890',
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: '1-2 business days',
            isCodAllowed: true,
            isLocalPickupAllowed: false,
            isCustomOrderAllowed: false,
            minOrderQty: 1,
            maxOrderQty: 30,
            soldCount: 142,
            productOptions: [
                {
                    name: 'Color Tone',
                    position: 0,
                    values: [
                        { value: 'Tone A', imageUrl: imgs.newImgs.beaded_bracelets[0] },
                        { value: 'Tone B', imageUrl: imgs.newImgs.beaded_bracelets[1] },
                        { value: 'Tone C', imageUrl: imgs.newImgs.beaded_bracelets[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Tone A', sku: 'LUM-SGBB-40001-A', stock: 20, price: 350, discountPercentage: 20, images: [imgs.newImgs.beaded_bracelets[0]], isEnabled: true, options: { 'Color Tone': 'Tone A' } },
                { name: 'Tone B', sku: 'LUM-SGBB-40001-B', stock: 15, price: 350, discountPercentage: 20, images: [imgs.newImgs.beaded_bracelets[1]], isEnabled: true, options: { 'Color Tone': 'Tone B' } },
                { name: 'Tone C', sku: 'LUM-SGBB-40001-C', stock: 12, price: 350, discountPercentage: 20, images: [imgs.newImgs.beaded_bracelets[2]], isEnabled: true, options: { 'Color Tone': 'Tone C' } },
            ],
        },
        {
            si: 3,
            name: 'Elegant Beaded Necklaces Choker',
            sku: 'LUM-EBNC-40002',
            categories: ['beaded-jewelry'],
            basePrice: 480,
            discountPercentage: 15,
            description: 'Complete your outfit with our Elegant Beaded Necklaces! Designed to sit perfectly on the collarbone as a choker or slightly lower. Made with a mix of seed beads, pearls, and crystals. Features a sturdy lobster clasp and extension chain.',
            materials: 'Seed beads, faux pearls, crystal accents, stainless steel lobster clasp and extension chain',
            careInstructions: 'Store in a dry place. Avoid wearing in the shower or pool. Wipe gently with a soft cloth.',
            tags: ['beaded', 'necklace', 'choker', 'jewelry', 'elegant', 'pearls'],
            metaTitle: 'Elegant Beaded Necklaces Choker | Handcrafted Jewelry',
            metaDescription: 'Handcrafted beaded choker necklaces made with seed beads, pearls, and stainless steel clasps.',
            image: imgs.newImgs.beaded_necklace[0],
            images: imgs.newImgs.beaded_necklace.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@luminabeads/video/1234567891',
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: '1-2 business days',
            isCodAllowed: true,
            isLocalPickupAllowed: false,
            isCustomOrderAllowed: false,
            minOrderQty: 1,
            maxOrderQty: 20,
            soldCount: 95,
            productOptions: [
                {
                    name: 'Design',
                    position: 0,
                    values: [
                        { value: 'Design 1', imageUrl: imgs.newImgs.beaded_necklace[0] },
                        { value: 'Design 2', imageUrl: imgs.newImgs.beaded_necklace[1] },
                        { value: 'Design 3', imageUrl: imgs.newImgs.beaded_necklace[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Design 1', sku: 'LUM-EBNC-40002-1', stock: 15, price: 480, discountPercentage: 15, images: [imgs.newImgs.beaded_necklace[0]], isEnabled: true, options: { 'Design': 'Design 1' } },
                { name: 'Design 2', sku: 'LUM-EBNC-40002-2', stock: 12, price: 480, discountPercentage: 15, images: [imgs.newImgs.beaded_necklace[1]], isEnabled: true, options: { 'Design': 'Design 2' } },
                { name: 'Design 3', sku: 'LUM-EBNC-40002-3', stock: 10, price: 480, discountPercentage: 15, images: [imgs.newImgs.beaded_necklace[2]], isEnabled: true, options: { 'Design': 'Design 3' } },
            ],
        },
        {
            si: 3,
            name: 'Oversized Silk Scrunchies & Hair Ties',
            sku: 'LUM-OSST-40003',
            categories: ['hair-tie', 'scrunchies'],
            basePrice: 150,
            discountPercentage: 10,
            description: 'Treat your hair with care! Our oversized silk scrunchies prevent hair breakage, frizz, and those annoying ponytail creases. Super soft, luxurious feel with strong inner elastic to hold thick hair securely all day long.',
            materials: '100% Satin silk fabric, strong braided elastic band',
            careInstructions: 'Hand wash cold with mild detergent. Air dry only. Do not bleach or tumble dry.',
            tags: ['scrunchie', 'hair-tie', 'satin', 'silk', 'hair-care', 'accessory'],
            metaTitle: 'Oversized Silk Scrunchies & Hair Ties | Anti-Frizz',
            metaDescription: 'Luxurious oversized satin silk scrunchies that prevent hair breakage and frizz. Strong elastic for thick hair.',
            image: imgs.newImgs.hair_ties[0],
            images: imgs.newImgs.hair_ties.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@luminabeads/video/1234567892',
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: '1 business day',
            isCodAllowed: true,
            isLocalPickupAllowed: false,
            isCustomOrderAllowed: false,
            minOrderQty: 1,
            maxOrderQty: 50,
            soldCount: 310,
            productOptions: [
                {
                    name: 'Color',
                    position: 0,
                    values: [
                        { value: 'Color 1', imageUrl: imgs.newImgs.hair_ties[0] },
                        { value: 'Color 2', imageUrl: imgs.newImgs.hair_ties[1] },
                        { value: 'Color 3', imageUrl: imgs.newImgs.hair_ties[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Color 1', sku: 'LUM-OSST-40003-1', stock: 50, price: 150, discountPercentage: 10, images: [imgs.newImgs.hair_ties[0]], isEnabled: true, options: { 'Color': 'Color 1' } },
                { name: 'Color 2', sku: 'LUM-OSST-40003-2', stock: 45, price: 150, discountPercentage: 10, images: [imgs.newImgs.hair_ties[1]], isEnabled: true, options: { 'Color': 'Color 2' } },
                { name: 'Color 3', sku: 'LUM-OSST-40003-3', stock: 30, price: 150, discountPercentage: 10, images: [imgs.newImgs.hair_ties[2]], isEnabled: true, options: { 'Color': 'Color 3' } },
            ],
        },
        {
            si: 4,
            name: 'Original Acrylic Landscape Canvas Paintings',
            sku: 'PIN-OACP-50001',
            categories: ['paintings-wall-art'],
            basePrice: 3500,
            discountPercentage: 15,
            description: 'Breathe life into your space with an original acrylic canvas painting! These one-of-a-kind artworks capture stunning landscapes with vivid colors and deep textures. Painted on high-quality stretched canvas, ready to hang. A perfect statement piece for your living room or office.',
            materials: 'Professional grade acrylic paints, 100% cotton stretched canvas, UV-resistant varnish finish',
            careInstructions: 'Dust lightly with a soft, dry cloth. Keep away from direct, harsh sunlight and high humidity areas.',
            tags: ['painting', 'canvas', 'acrylic', 'landscape', 'original-art', 'wall-decor'],
            metaTitle: 'Original Acrylic Landscape Canvas Paintings | Pintura at Likha',
            metaDescription: 'Stunning original acrylic landscape paintings on stretched canvas. Ready to hang vivid artworks for your home.',
            image: imgs.newImgs.paintings[0],
            images: imgs.newImgs.paintings.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@pinturaatlikha/video/1234567890',
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: '2-3 business days',
            isCodAllowed: false,
            isLocalPickupAllowed: true,
            isCustomOrderAllowed: true,
            minOrderQty: 1,
            maxOrderQty: 1,
            soldCount: 18,
            productOptions: [
                {
                    name: 'Artwork',
                    position: 0,
                    values: [
                        { value: 'Artwork A', imageUrl: imgs.newImgs.paintings[0] },
                        { value: 'Artwork B', imageUrl: imgs.newImgs.paintings[1] },
                        { value: 'Artwork C', imageUrl: imgs.newImgs.paintings[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Artwork A', sku: 'PIN-OACP-50001-A', stock: 10, price: 3500, discountPercentage: 15, images: [imgs.newImgs.paintings[0]], isEnabled: true, options: { 'Artwork': 'Artwork A' } },
                { name: 'Artwork B', sku: 'PIN-OACP-50001-B', stock: 10, price: 3500, discountPercentage: 15, images: [imgs.newImgs.paintings[1]], isEnabled: true, options: { 'Artwork': 'Artwork B' } },
                { name: 'Artwork C', sku: 'PIN-OACP-50001-C', stock: 10, price: 3500, discountPercentage: 15, images: [imgs.newImgs.paintings[2]], isEnabled: true, options: { 'Artwork': 'Artwork C' } },
            ],
        },
        {
            si: 4,
            name: 'Handcrafted Resin Floral Door Decorations',
            sku: 'PIN-HRFD-50002',
            categories: ['resin-crafts', 'home-decor'],
            basePrice: 850,
            discountPercentage: 5,
            description: 'Welcome guests with a beautiful Handcrafted Resin Floral Door Decoration! Embedded with real dried pressed flowers, gold flakes, and high-quality epoxy resin for a glass-like finish. Includes a sturdy hanging chain. Perfect for front doors, bedrooms, or garden gates.',
            materials: 'High-quality UV epoxy resin, dried pressed flowers, gold flakes, metal hanging chain',
            careInstructions: 'Wipe with a microfiber cloth. Avoid extreme heat to prevent the resin from softening.',
            tags: ['resin', 'door-decor', 'floral', 'handmade', 'signage', 'home-decor'],
            metaTitle: 'Handcrafted Resin Floral Door Decorations | Floral Signs',
            metaDescription: 'Beautiful handcrafted resin door decorations embedded with real dried flowers and gold flakes. High-quality epoxy finish.',
            image: imgs.newImgs.resin_door[0],
            images: imgs.newImgs.resin_door.slice(0, 5),
            videoUrl: 'https://www.tiktok.com/@pinturaatlikha/video/1234567891',
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '7-10 business days',
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            isCustomOrderAllowed: true,
            minOrderQty: 1,
            maxOrderQty: 10,
            soldCount: 45,
            productOptions: [
                {
                    name: 'Design',
                    position: 0,
                    values: [
                        { value: 'Design 1', imageUrl: imgs.newImgs.resin_door[0] },
                        { value: 'Design 2', imageUrl: imgs.newImgs.resin_door[1] },
                        { value: 'Design 3', imageUrl: imgs.newImgs.resin_door[2] },
                    ],
                },
            ],
            variants: [
                { name: 'Design 1', sku: 'PIN-HRFD-50002-1', stock: 8, price: 850, discountPercentage: 5, images: [imgs.newImgs.resin_door[0]], isEnabled: true, options: { 'Design': 'Design 1' } },
                { name: 'Design 2', sku: 'PIN-HRFD-50002-2', stock: 6, price: 850, discountPercentage: 5, images: [imgs.newImgs.resin_door[1]], isEnabled: true, options: { 'Design': 'Design 2' } },
                { name: 'Design 3', sku: 'PIN-HRFD-50002-3', stock: 10, price: 850, discountPercentage: 5, images: [imgs.newImgs.resin_door[2]], isEnabled: true, options: { 'Design': 'Design 3' } },
            ],
        },
        // ═══════════════════════════ SELLER 0 — Ami ni Maria ═══════════════════════
        {
            si: 0,
            name: 'Sanrio Amigurumi Keychain Set',
            sku: 'AMI-SANK-10001',
            categories: ['amigurumi', 'crochet-key-chains', 'mini-stuffed-toy'],
            basePrice: 380,
            discountPercentage: 10,
            description:
                'Isang set ng 3 cute na Sanrio-inspired amigurumi keychains (Hello Kitty, Pompompurin, Cinnamoroll). ' +
                'Gawa sa mataas na kalidad na velvet yarn at nilagyan ng metal keychain ring. ' +
                'Perfect bilang birthday gift, graduation souvenir, o bag charm!',
            materials: 'Premium velvet yarn (polyester), polyester stuffing, safety eyes (6mm), metal keychain ring',
            careInstructions: 'Hand wash gently with mild soap. Air dry only. Do not machine wash.',
            tags: ['amigurumi', 'sanrio', 'keychain', 'gift', 'cute'],
            metaTitle: 'Sanrio Amigurumi Keychain Set | Handmade Crochet PH',
            metaDescription: 'Adorable handmade Sanrio-inspired amigurumi keychains from Antipolo, Rizal. Perfect kawaii gifts — set of 3.',
            image: ami[0]!,
            images: [ami[0]!, ami[1]!, ami[2]!],
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: null as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: 'Available for pickup in Antipolo City. Message us to arrange.',
            isCustomOrderAllowed: true,
            customOrderInstructions: 'We can make other Sanrio characters! Message us with your preferred character and color.',
            isBundle: true,
            bundleQuantity: 3,
            minOrderQty: 1,
            maxOrderQty: 20,
            soldCount: 47,
            productOptions: [
                {
                    name: 'Color Theme',
                    position: 0,
                    values: [
                        { value: 'Pastel Classic', imageUrl: ami[0] ?? null },
                        { value: 'Cotton Candy', imageUrl: ami[1] ?? null },
                        { value: 'Earthy Tones', imageUrl: ami[2] ?? null },
                    ],
                },
            ],
            variants: [
                { name: 'Pastel Classic', sku: 'AMI-SANK-10001-PC', stock: 15, price: 380, discountPercentage: 10, images: [ami[0]!], isEnabled: true, options: { 'Color Theme': 'Pastel Classic' } },
                { name: 'Cotton Candy', sku: 'AMI-SANK-10001-CC', stock: 12, price: 380, discountPercentage: 10, images: [ami[1]!], isEnabled: true, options: { 'Color Theme': 'Cotton Candy' } },
                { name: 'Earthy Tones', sku: 'AMI-SANK-10001-ET', stock: 8, price: 380, discountPercentage: 10, images: [ami[2]!], isEnabled: true, options: { 'Color Theme': 'Earthy Tones' } },
            ],
        },
        {
            si: 0,
            name: 'Chubby Chick Amigurumi (Seasonal Outfits)',
            sku: 'AMI-CHCK-10002',
            categories: ['amigurumi', 'mini-stuffed-toy'],
            basePrice: 320,
            discountPercentage: null as number | null,
            description:
                'Ang cute na chubby chick amigurumi na may removable na seasonal outfits! ' +
                'Pumili sa Bee, Rainbow, Strawberry, o Bunny outfit. Gawa sa velvet yarn, mga 5 inches ang taas. ' +
                'Swak na souvenir sa mga handaan, photoshoot prop, o collectible.',
            materials: 'Velvet chenille yarn, polyester stuffing, safety eyes (9mm), felt accents',
            careInstructions: 'Spot clean with damp cloth only. Do not submerge in water.',
            tags: ['amigurumi', 'chick', 'seasonal', 'cute', 'collectible'],
            metaTitle: 'Chubby Chick Amigurumi with Seasonal Outfits | Handmade Crochet PH',
            metaDescription: 'Adorable chubby chick amigurumi with 4 seasonal outfit designs — bee, rainbow, strawberry, bunny. Handmade in Antipolo, Rizal.',
            image: ami[2]!,
            images: [ami[2]!, ami[3]!, ami[4]!],
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '3-5 business days' as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: 'Pickup available in Antipolo City after order is ready.',
            isCustomOrderAllowed: true,
            customOrderInstructions: 'We can create other outfit themes! DM us for custom requests.',
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 10,
            soldCount: 33,
            productOptions: [
                {
                    name: 'Outfit',
                    position: 0,
                    values: [
                        { value: 'Bee', imageUrl: ami[2] ?? null },
                        { value: 'Rainbow', imageUrl: ami[2] ?? null },
                        { value: 'Strawberry', imageUrl: ami[2] ?? null },
                        { value: 'Bunny', imageUrl: ami[3] ?? null },
                    ],
                },
            ],
            variants: [
                { name: 'Bee', sku: 'AMI-CHCK-10002-BEE', stock: 8, price: 320, images: [ami[2]!], isEnabled: true, options: { 'Outfit': 'Bee' } },
                { name: 'Rainbow', sku: 'AMI-CHCK-10002-RNB', stock: 7, price: 320, images: [ami[2]!], isEnabled: true, options: { 'Outfit': 'Rainbow' } },
                { name: 'Strawberry', sku: 'AMI-CHCK-10002-STR', stock: 5, price: 320, images: [ami[2]!], isEnabled: true, options: { 'Outfit': 'Strawberry' } },
                { name: 'Bunny', sku: 'AMI-CHCK-10002-BNY', stock: 6, price: 320, images: [ami[3]!], isEnabled: true, options: { 'Outfit': 'Bunny' } },
            ],
        },
        {
            si: 0,
            name: 'Mini Ocean Pals Amigurumi Keychain',
            sku: 'AMI-OCPF-10003',
            categories: ['amigurumi', 'mini-stuffed-toy', 'crochet-key-chains'],
            basePrice: 250,
            discountPercentage: null as number | null,
            description:
                'Adorable na mini pufferfish amigurumi keychains! Available sa 3 kulay: Blue Manta, Yellow Sunfish, at Orange Clownfish. ' +
                'Mga 3 pulgada lang ang laki, kaya suwak sa bag charm, phone lanyard, o refrigerator display. ' +
                'May naka-loop na lanyard cord na pwedeng palitan.',
            materials: 'Cotton yarn, polyester stuffing, safety eyes (6mm), wrist lanyard cord',
            careInstructions: 'Spot clean only. Do not machine wash or tumble dry.',
            tags: ['amigurumi', 'ocean', 'pufferfish', 'keychain', 'kawaii'],
            metaTitle: 'Mini Ocean Pals Amigurumi Keychain | Handmade PH',
            metaDescription: 'Cute handmade ocean amigurumi keychains in 3 colors. Perfect for bag charms or as kawaii collectibles.',
            image: ami[3]!,
            images: [ami[3]!, ami[4]!, ami[0]!],
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: null as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: "Meet-up in Antipolo City Robinson's area.",
            isCustomOrderAllowed: false,
            customOrderInstructions: null as string | null,
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 30,
            soldCount: 21,
            productOptions: [
                {
                    name: 'Color',
                    position: 0,
                    values: [
                        { value: 'Blue Manta', imageUrl: ami[3] ?? null },
                        { value: 'Yellow Sunfish', imageUrl: ami[3] ?? null },
                        { value: 'Orange Clownfish', imageUrl: ami[3] ?? null },
                    ],
                },
            ],
            variants: [
                { name: 'Blue Manta', sku: 'AMI-OCPF-10003-BLU', stock: 20, price: 250, images: [ami[3]!], isEnabled: true, options: { 'Color': 'Blue Manta' } },
                { name: 'Yellow Sunfish', sku: 'AMI-OCPF-10003-YLW', stock: 18, price: 250, images: [ami[3]!], isEnabled: true, options: { 'Color': 'Yellow Sunfish' } },
                { name: 'Orange Clownfish', sku: 'AMI-OCPF-10003-ORG', stock: 15, price: 250, images: [ami[3]!], isEnabled: true, options: { 'Color': 'Orange Clownfish' } },
            ],
        },

        // ═══════════════════════════ SELLER 1 — The Crobag Studio ═══════════════════
        {
            si: 1,
            name: 'Daisy Hobo Crochet Tote Bag',
            sku: 'BAG-DHOB-20001',
            categories: ['crochet', 'accessories'],
            basePrice: 680,
            discountPercentage: null as number | null,
            description:
                'Ang paboritong Daisy Hobo Bag — isang spacious na slouch-style crochet bag ' +
                'na may kasamang cute na crochet flower charm. Gawa sa high-quality cotton-blend yarn, ' +
                'matibay at breathable. Perfect para sa araw-araw na gamit, pamamasyal, o beach day. ' +
                'Kasya ang A4 na papel, wallet, water bottle, at marami pa.',
            materials: 'Cotton-blend yarn (70% cotton / 30% polyester), single crochet stitch, crochet flower charm',
            careInstructions: 'Hand wash in cold water with mild detergent. Shape and air dry flat.',
            tags: ['crochet', 'tote', 'hobo-bag', 'cotton', 'daisy'],
            metaTitle: 'Daisy Hobo Crochet Tote Bag | Handmade Crocheted Bag PH',
            metaDescription: 'Spacious handmade crocheted hobo bag with daisy flower charm from Mandaluyong. Available in 3 colors.',
            image: bag[0]!,
            images: [bag[0]!, bag[1]!, bag[4]!],
            fulfillmentType: FulfillmentType.READY_TO_SHIP,
            processingTime: null as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: "Pickup sa Mandaluyong City, near Robinson's Pioneer. COD available within NCR.",
            isCustomOrderAllowed: true,
            customOrderInstructions: 'Message us to request a different color or to add a monogram/initial charm.',
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 5,
            soldCount: 62,
            productOptions: [
                {
                    name: 'Color',
                    position: 0,
                    values: [
                        { value: 'Cream White', imageUrl: bag[0] ?? null },
                        { value: 'Sage Green', imageUrl: bag[1] ?? null },
                        { value: 'Warm Beige', imageUrl: bag[4] ?? null },
                    ],
                },
            ],
            variants: [
                { name: 'Cream White', sku: 'BAG-DHOB-20001-CRM', stock: 6, price: 680, images: [bag[0]!], isEnabled: true, options: { 'Color': 'Cream White' } },
                { name: 'Sage Green', sku: 'BAG-DHOB-20001-SGN', stock: 5, price: 680, images: [bag[1]!], isEnabled: true, options: { 'Color': 'Sage Green' } },
                { name: 'Warm Beige', sku: 'BAG-DHOB-20001-WBG', stock: 4, price: 680, images: [bag[4]!], isEnabled: true, options: { 'Color': 'Warm Beige' } },
            ],
        },
        {
            si: 1,
            name: 'Crochet Bow Bag (Crossbody / Shoulder)',
            sku: 'BAG-BOWX-20002',
            categories: ['crochet', 'accessories'],
            basePrice: 850,
            discountPercentage: 12,
            description:
                'Statement bag na may malaking crochet bow sa harap! ' +
                'Available bilang crossbody o shoulder bag — sabay nang cute at functional. ' +
                'May nakasamang adjustable chain strap at interior lining para maprotektahan ang iyong mga gamit. ' +
                'Madaling i-pair sa casual o semi-formal na outfit.',
            materials: 'Acrylic chunky yarn, interior cotton lining, metal chain strap, zipper closure',
            careInstructions: 'Spot clean only. Do not submerge in water. Stuff with tissue when not in use to maintain shape.',
            tags: ['crochet', 'bow-bag', 'crossbody', 'statement', 'kawaii'],
            metaTitle: 'Crochet Bow Bag | Crossbody & Shoulder Bag PH | The Crobag Studio',
            metaDescription: 'Cute statement crochet bow bag available as crossbody or shoulder style. Handmade with interior lining in multiple colorways.',
            image: bag[2]!,
            images: [bag[2]!, bag[3]!, bag[0]!],
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '5-7 business days' as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: 'Pickup available in Mandaluyong City after order is complete.',
            isCustomOrderAllowed: true,
            customOrderInstructions: 'Available in custom colors and strap types (chain or rope). Message for more options.',
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 3,
            soldCount: 28,
            productOptions: [
                {
                    name: 'Color',
                    position: 0,
                    values: [
                        { value: 'Chocolate Brown', imageUrl: bag[2] ?? null },
                        { value: 'Sky Blue', imageUrl: bag[3] ?? null },
                        { value: 'Ivory Cream', imageUrl: bag[0] ?? null },
                    ],
                },
                {
                    name: 'Strap Style',
                    position: 1,
                    values: [
                        { value: 'Chain Strap', imageUrl: null },
                        { value: 'Rope Strap', imageUrl: null },
                    ],
                },
            ],
            variants: [
                { name: 'Chocolate Brown / Chain Strap', sku: 'BAG-BOWX-20002-CHB-CH', stock: 4, price: 850, discountPercentage: 12, images: [bag[2]!], isEnabled: true, options: { 'Color': 'Chocolate Brown', 'Strap Style': 'Chain Strap' } },
                { name: 'Chocolate Brown / Rope Strap', sku: 'BAG-BOWX-20002-CHB-RP', stock: 3, price: 850, discountPercentage: 12, images: [bag[2]!], isEnabled: true, options: { 'Color': 'Chocolate Brown', 'Strap Style': 'Rope Strap' } },
                { name: 'Sky Blue / Chain Strap', sku: 'BAG-BOWX-20002-SKB-CH', stock: 3, price: 850, discountPercentage: 12, images: [bag[3]!], isEnabled: true, options: { 'Color': 'Sky Blue', 'Strap Style': 'Chain Strap' } },
                { name: 'Sky Blue / Rope Strap', sku: 'BAG-BOWX-20002-SKB-RP', stock: 2, price: 850, discountPercentage: 12, images: [bag[3]!], isEnabled: true, options: { 'Color': 'Sky Blue', 'Strap Style': 'Rope Strap' } },
                { name: 'Ivory Cream / Chain Strap', sku: 'BAG-BOWX-20002-IVY-CH', stock: 3, price: 850, discountPercentage: 12, images: [bag[0]!], isEnabled: true, options: { 'Color': 'Ivory Cream', 'Strap Style': 'Chain Strap' } },
                { name: 'Ivory Cream / Rope Strap', sku: 'BAG-BOWX-20002-IVY-RP', stock: 2, price: 850, discountPercentage: 12, images: [bag[4]!], isEnabled: true, options: { 'Color': 'Ivory Cream', 'Strap Style': 'Rope Strap' } },
            ],
        },
        {
            si: 1,
            name: 'Vintage Lace Crochet Bucket Bag',
            sku: 'BAG-VLCB-20003',
            categories: ['crochet', 'accessories'],
            basePrice: 920,
            discountPercentage: null as number | null,
            description:
                'Ang romantikong vintage-inspired bucket bag na may lace crochet pattern at crochet bow accent. ' +
                "May drawstring closure at detachable rope strap para sa iba't ibang paraan ng pagsusuot. " +
                'Roomy interior — kasya ang daily essentials at mas malaki pang items. ' +
                'Perpekto para sa cottagecore aesthetic o ukay-ukay inspired outfits.',
            materials: 'Thick cotton yarn, rope drawstring, crochet bow accent, woven inner lining (optional)',
            careInstructions: 'Hand wash cold. Lay flat to dry. Do not wring.',
            tags: ['crochet', 'bucket-bag', 'vintage', 'lace', 'cottagecore'],
            metaTitle: 'Vintage Lace Crochet Bucket Bag | Cottagecore Style PH',
            metaDescription: "Romantic vintage-inspired crocheted bucket bag with drawstring and rope strap. Handmade by The Crobag Studio in Mandaluyong.",
            image: bag[4]!,
            images: [bag[4]!, bag[3]!, bag[1]!],
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '7-10 business days' as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: 'Available for pickup in Mandaluyong. DM for schedule.',
            isCustomOrderAllowed: true,
            customOrderInstructions: 'Custom lining, color, and strap length available. Inquire via chat.',
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 2,
            soldCount: 14,
            productOptions: [
                {
                    name: 'Color',
                    position: 0,
                    values: [
                        { value: 'Cream and Mauve', imageUrl: bag[4] ?? null },
                        { value: 'Sky Blue', imageUrl: bag[3] ?? null },
                        { value: 'Sage Green', imageUrl: bag[1] ?? null },
                    ],
                },
                {
                    name: 'Lining',
                    position: 1,
                    values: [
                        { value: 'With Lining', imageUrl: null },
                        { value: 'No Lining', imageUrl: null },
                    ],
                },
            ],
            variants: [
                { name: 'Cream and Mauve / With Lining', sku: 'BAG-VLCB-20003-CML-LN', stock: 3, price: 1000, images: [bag[4]!], isEnabled: true, options: { 'Color': 'Cream and Mauve', 'Lining': 'With Lining' } },
                { name: 'Cream and Mauve / No Lining', sku: 'BAG-VLCB-20003-CML-NL', stock: 4, price: 920, images: [bag[4]!], isEnabled: true, options: { 'Color': 'Cream and Mauve', 'Lining': 'No Lining' } },
                { name: 'Sky Blue / With Lining', sku: 'BAG-VLCB-20003-SKB-LN', stock: 2, price: 1000, images: [bag[3]!], isEnabled: true, options: { 'Color': 'Sky Blue', 'Lining': 'With Lining' } },
                { name: 'Sky Blue / No Lining', sku: 'BAG-VLCB-20003-SKB-NL', stock: 3, price: 920, images: [bag[3]!], isEnabled: true, options: { 'Color': 'Sky Blue', 'Lining': 'No Lining' } },
                { name: 'Sage Green / With Lining', sku: 'BAG-VLCB-20003-SGN-LN', stock: 2, price: 1000, images: [bag[1]!], isEnabled: true, options: { 'Color': 'Sage Green', 'Lining': 'With Lining' } },
                { name: 'Sage Green / No Lining', sku: 'BAG-VLCB-20003-SGN-NL', stock: 3, price: 920, images: [bag[1]!], isEnabled: true, options: { 'Color': 'Sage Green', 'Lining': 'No Lining' } },
            ],
        },

        // ═══════════════════════════ SELLER 2 — Lena's Blooms ══════════════════════
        {
            si: 2,
            name: "Pastel Garden Bouquet (Fuzzy Wire)",
            sku: 'FLW-PGBQ-30001',
            categories: ['fuzzy-wire-bouquet'],
            basePrice: 550,
            discountPercentage: null as number | null,
            description:
                'Isang makulay na pastel garden bouquet na gawa sa fuzzy chenille wire — hindi kailanman matutuyo, ' +
                'hindi kailanman malalanta. Binubuo ng mga roses, tulips, lavender sprigs, at daisies. ' +
                'Nakabalot sa transparent wrapping paper at sinabitan ng satin ribbon. ' +
                "Perfect para sa birthday, Mother's Day, anniversary, o graduation gift!",
            materials: 'Fuzzy chenille wire (polyester), floral tape, transparent wrapping, satin ribbon, kraft paper base',
            careInstructions: 'Keep away from direct sunlight to preserve color. Dust gently with a soft brush. Do not wet.',
            tags: ['fuzzy-wire', 'bouquet', 'pastel', 'forever-flowers', 'gift'],
            metaTitle: 'Pastel Garden Fuzzy Wire Bouquet | Handmade Forever Flowers PH',
            metaDescription: "Beautiful pastel garden bouquet made of fuzzy chenille wire — it never wilts! Perfect for any occasion. Handmade in Los Banos, Laguna.",
            image: flo[0]!,
            images: [flo[0]!, flo[1]!, flo[2]!],
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '3-5 business days' as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: 'Pickup available in UPLB area / Los Banos town. DM to arrange.',
            isCustomOrderAllowed: true,
            customOrderInstructions: 'Choose your preferred color palette (e.g., all pink, all white, earth tones). Specify in the order notes or message us.',
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 10,
            soldCount: 38,
            productOptions: [
                {
                    name: 'Size',
                    position: 0,
                    values: [
                        { value: 'Small 8-10 stems', imageUrl: flo[0] ?? null },
                        { value: 'Medium 12-15 stems', imageUrl: flo[0] ?? null },
                        { value: 'Large 18-20 stems', imageUrl: flo[0] ?? null },
                    ],
                },
                {
                    name: 'Color Palette',
                    position: 1,
                    values: [
                        { value: 'Lavender and Blush', imageUrl: flo[0] ?? null },
                        { value: 'Sunflower and Daisy', imageUrl: flo[1] ?? null },
                        { value: 'Daisy Garden Mix', imageUrl: flo[2] ?? null },
                    ],
                },
            ],
            variants: [
                { name: 'Small / Lavender and Blush', sku: 'FLW-PGBQ-30001-SM-LB', stock: 10, price: 550, images: [flo[0]!], isEnabled: true, options: { 'Size': 'Small 8-10 stems', 'Color Palette': 'Lavender and Blush' } },
                { name: 'Medium / Lavender and Blush', sku: 'FLW-PGBQ-30001-MD-LB', stock: 8, price: 750, images: [flo[0]!], isEnabled: true, options: { 'Size': 'Medium 12-15 stems', 'Color Palette': 'Lavender and Blush' } },
                { name: 'Large / Lavender and Blush', sku: 'FLW-PGBQ-30001-LG-LB', stock: 5, price: 980, images: [flo[0]!], isEnabled: true, options: { 'Size': 'Large 18-20 stems', 'Color Palette': 'Lavender and Blush' } },
                { name: 'Small / Sunflower and Daisy', sku: 'FLW-PGBQ-30001-SM-SD', stock: 10, price: 550, images: [flo[1]!], isEnabled: true, options: { 'Size': 'Small 8-10 stems', 'Color Palette': 'Sunflower and Daisy' } },
                { name: 'Medium / Sunflower and Daisy', sku: 'FLW-PGBQ-30001-MD-SD', stock: 7, price: 750, images: [flo[1]!], isEnabled: true, options: { 'Size': 'Medium 12-15 stems', 'Color Palette': 'Sunflower and Daisy' } },
                { name: 'Large / Sunflower and Daisy', sku: 'FLW-PGBQ-30001-LG-SD', stock: 4, price: 980, images: [flo[1]!], isEnabled: true, options: { 'Size': 'Large 18-20 stems', 'Color Palette': 'Sunflower and Daisy' } },
                { name: 'Small / Daisy Garden Mix', sku: 'FLW-PGBQ-30001-SM-DG', stock: 9, price: 550, images: [flo[2]!], isEnabled: true, options: { 'Size': 'Small 8-10 stems', 'Color Palette': 'Daisy Garden Mix' } },
                { name: 'Medium / Daisy Garden Mix', sku: 'FLW-PGBQ-30001-MD-DG', stock: 6, price: 750, images: [flo[2]!], isEnabled: true, options: { 'Size': 'Medium 12-15 stems', 'Color Palette': 'Daisy Garden Mix' } },
                { name: 'Large / Daisy Garden Mix', sku: 'FLW-PGBQ-30001-LG-DG', stock: 4, price: 980, images: [flo[2]!], isEnabled: true, options: { 'Size': 'Large 18-20 stems', 'Color Palette': 'Daisy Garden Mix' } },
            ],
        },
        {
            si: 2,
            name: 'Fuzzy Wire Wildflower Bouquet (Fuchsia and White)',
            sku: 'FLW-WFBQ-30002',
            categories: ['fuzzy-wire-bouquet'],
            basePrice: 480,
            discountPercentage: null as number | null,
            description:
                'Isang masayang wildflower-themed fuzzy wire bouquet na may fuchsia at puting maliliit na bulaklak. ' +
                'Binubuo ng mga tiny cluster blooms na mukhang buhay na buhay kahit gawa sa chenille wire. ' +
                'May kasamang pearl head pins na accessories at isang mini greeting card slot. ' +
                'Swak na regalo para sa mga bestie, mama, o guro!',
            materials: 'Fuzzy chenille wire, pearl head pins, transparent wrap, ribbon, mini card slot insert',
            careInstructions: 'Avoid moisture. Dust softly. Keep in a cool dry place for longer life.',
            tags: ['fuzzy-wire', 'wildflower', 'bouquet', 'fuchsia', 'gift'],
            metaTitle: 'Fuzzy Wire Wildflower Bouquet | Fuchsia and White Forever Flowers PH',
            metaDescription: "Vibrant fuchsia and white fuzzy wire wildflower bouquet — handmade in Los Banos by Lena's Blooms. Perfect teacher gifts and birthday presents.",
            image: flo[3]!,
            images: [flo[3]!, flo[4]!, flo[2]!],
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '2-4 business days' as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: "Pickup in Los Banos near UPLB Gate 1 area. COD available for nearby LB addresses.",
            isCustomOrderAllowed: true,
            customOrderInstructions: "Can be made in different colors for Teacher's Day, birthdays, or other occasions. Include your preferred colors in order notes.",
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 15,
            soldCount: 22,
            productOptions: [
                {
                    name: 'Size',
                    position: 0,
                    values: [
                        { value: 'Small 12 stems', imageUrl: flo[3] ?? null },
                        { value: 'Large 20 plus stems', imageUrl: flo[3] ?? null },
                    ],
                },
                {
                    name: 'Add-on',
                    position: 1,
                    values: [
                        { value: 'Bouquet Only', imageUrl: null },
                        { value: 'With Message Card', imageUrl: null },
                        { value: 'With Message Card and Ribbon Bow', imageUrl: null },
                    ],
                },
            ],
            variants: [
                { name: 'Small / Bouquet Only', sku: 'FLW-WFBQ-30002-SM-NO', stock: 12, price: 480, images: [flo[3]!], isEnabled: true, options: { 'Size': 'Small 12 stems', 'Add-on': 'Bouquet Only' } },
                { name: 'Small / With Message Card', sku: 'FLW-WFBQ-30002-SM-MC', stock: 10, price: 520, images: [flo[3]!], isEnabled: true, options: { 'Size': 'Small 12 stems', 'Add-on': 'With Message Card' } },
                { name: 'Small / With Message Card and Ribbon Bow', sku: 'FLW-WFBQ-30002-SM-MR', stock: 8, price: 560, images: [flo[3]!], isEnabled: true, options: { 'Size': 'Small 12 stems', 'Add-on': 'With Message Card and Ribbon Bow' } },
                { name: 'Large / Bouquet Only', sku: 'FLW-WFBQ-30002-LG-NO', stock: 7, price: 720, images: [flo[3]!], isEnabled: true, options: { 'Size': 'Large 20 plus stems', 'Add-on': 'Bouquet Only' } },
                { name: 'Large / With Message Card', sku: 'FLW-WFBQ-30002-LG-MC', stock: 6, price: 760, images: [flo[3]!], isEnabled: true, options: { 'Size': 'Large 20 plus stems', 'Add-on': 'With Message Card' } },
                { name: 'Large / With Message Card and Ribbon Bow', sku: 'FLW-WFBQ-30002-LG-MR', stock: 5, price: 800, images: [flo[3]!], isEnabled: true, options: { 'Size': 'Large 20 plus stems', 'Add-on': 'With Message Card and Ribbon Bow' } },
            ],
        },
        {
            si: 2,
            name: 'Fuzzy Wire Pink Lily Arrangement (Vase Set)',
            sku: 'FLW-PLYV-30003',
            categories: ['fuzzy-wire-bouquet', 'fuzzy-wire-art'],
            basePrice: 750,
            discountPercentage: 7,
            description:
                'Isang elegant na fuzzy wire pink lily arrangement na nakalagay sa isang mini ceramic-style vase. ' +
                'Binubuo ng mga tiger lilies, cherry blossoms, bell flowers, at accent greens — lahat ay gawa sa chenille wire. ' +
                'Perfect bilang desk decor, centerpiece, o espesyal na regalo. ' +
                'Hindi kailangan ng tubig, walang petals na magsasabow — forever blooms!',
            materials: 'Fuzzy chenille wire, mini white vase (included), floral foam, green filler wire, pearl bead accents',
            careInstructions: 'Wipe vase with dry cloth. Do not pour water inside. Keep flowers away from humid environments.',
            tags: ['fuzzy-wire', 'lily', 'vase', 'arrangement', 'desk-decor'],
            metaTitle: 'Fuzzy Wire Pink Lily Vase Arrangement | Forever Flowers PH',
            metaDescription: "Elegant fuzzy wire pink lily and cherry blossom arrangement in a mini vase. Handmade by Lena's Blooms — perfect as desk decor or gift.",
            image: flo[4]!,
            images: [flo[4]!, flo[0]!, flo[3]!],
            fulfillmentType: FulfillmentType.MADE_TO_ORDER,
            processingTime: '5-7 business days' as string | null,
            isCodAllowed: true,
            isLocalPickupAllowed: true,
            localPickupInstructions: 'Pickup in Los Banos, Laguna. DM before coming to confirm availability.',
            isCustomOrderAllowed: true,
            customOrderInstructions: 'Can be made with your preferred flower types, color theme, or vase style. Contact us for custom arrangements.',
            isBundle: false,
            bundleQuantity: null as number | null,
            minOrderQty: 1,
            maxOrderQty: 5,
            soldCount: 17,
            productOptions: [
                {
                    name: 'Arrangement Size',
                    position: 0,
                    values: [
                        { value: 'Compact desk size', imageUrl: flo[4] ?? null },
                        { value: 'Full centerpiece size', imageUrl: flo[4] ?? null },
                    ],
                },
                {
                    name: 'Color Theme',
                    position: 1,
                    values: [
                        { value: 'Pink Blush', imageUrl: flo[4] ?? null },
                        { value: 'Lavender Dream', imageUrl: flo[0] ?? null },
                        { value: 'Sunset Mix', imageUrl: flo[3] ?? null },
                    ],
                },
            ],
            variants: [
                { name: 'Compact / Pink Blush', sku: 'FLW-PLYV-30003-CP-PB', stock: 6, price: 750, discountPercentage: 7, images: [flo[4]!], isEnabled: true, options: { 'Arrangement Size': 'Compact desk size', 'Color Theme': 'Pink Blush' } },
                { name: 'Compact / Lavender Dream', sku: 'FLW-PLYV-30003-CP-LD', stock: 5, price: 750, discountPercentage: 7, images: [flo[0]!], isEnabled: true, options: { 'Arrangement Size': 'Compact desk size', 'Color Theme': 'Lavender Dream' } },
                { name: 'Compact / Sunset Mix', sku: 'FLW-PLYV-30003-CP-SM', stock: 4, price: 750, discountPercentage: 7, images: [flo[3]!], isEnabled: true, options: { 'Arrangement Size': 'Compact desk size', 'Color Theme': 'Sunset Mix' } },
                { name: 'Full / Pink Blush', sku: 'FLW-PLYV-30003-FL-PB', stock: 3, price: 1100, discountPercentage: 7, images: [flo[4]!], isEnabled: true, options: { 'Arrangement Size': 'Full centerpiece size', 'Color Theme': 'Pink Blush' } },
                { name: 'Full / Lavender Dream', sku: 'FLW-PLYV-30003-FL-LD', stock: 3, price: 1100, discountPercentage: 7, images: [flo[0]!], isEnabled: true, options: { 'Arrangement Size': 'Full centerpiece size', 'Color Theme': 'Lavender Dream' } },
                { name: 'Full / Sunset Mix', sku: 'FLW-PLYV-30003-FL-SM', stock: 2, price: 1100, discountPercentage: 7, images: [flo[3]!], isEnabled: true, options: { 'Arrangement Size': 'Full centerpiece size', 'Color Theme': 'Sunset Mix' } },
            ],
        },
    ];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seedMainStore() {
    console.log('🌸 Knot & Bloom — Main Store Seeder');
    console.log('═══════════════════════════════════════\n');

    const password = await bcrypt.hash('Password123!', 10);
    const createdSellers: { uid: number; email: string }[] = [];

    // 1. Upload images
    const imgs = await uploadSeedImages();

    // 2. Create sellers
    console.log('\n👤 Creating sellers...');
        for (const def of SELLER_DEFS) {
        const { user: ud, seller: sd } = def;

        let avatarUrl = undefined;
        let bannerUrl = undefined;
        if (sd.slug === 'lumina-beads') {
            avatarUrl = imgs.lumina_logo;
            bannerUrl = imgs.lumina_banner;
        } else if (sd.slug === 'pintura-at-likha') {
            avatarUrl = imgs.pintura_logo;
            bannerUrl = imgs.pintura_banner;
        } else if (sd.slug === 'ami-ni-maria') {
            avatarUrl = imgs.ami_logo;
            bannerUrl = imgs.ami_banner;
        } else if (sd.slug === 'the-crobag-studio') {
            avatarUrl = imgs.crobag_logo;
            bannerUrl = imgs.crobag_banner;
        } else if (sd.slug === 'lenas-blooms') {
            avatarUrl = imgs.lena_logo;
            bannerUrl = imgs.lena_banner;
        }

        let user = await prisma.user.findUnique({ where: { email: ud.email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: ud.name,
                    email: ud.email,
                    password,
                    phone: ud.phone,
                    role: Role.SELLER,
                    avatar: avatarUrl
                },
            });
            console.log(`  ✅ Created user: ${ud.name}`);
        } else {
            console.log(`  ⏭️  User exists: ${ud.email}`);
            if (avatarUrl) {
                await prisma.user.update({
                    where: { email: ud.email },
                    data: { avatar: avatarUrl }
                });
            }
        }

        let seller = await prisma.seller.findUnique({ where: { userId: user.uid } });
        if (!seller) {
            seller = await prisma.seller.create({
                data: {
                    userId: user.uid,
                    name: sd.name,
                    slug: sd.slug,
                    email: ud.email,
                    description: sd.description,
                    phone: sd.phone,
                    businessAddress: sd.businessAddress,
                    legalName: sd.legalName,
                    portfolioLink: sd.portfolioLink,
                    idType: sd.idType,
                    idNumber: sd.idNumber,
                    isHandmade: sd.isHandmade,
                    hasPriorExperience: sd.hasPriorExperience,
                    sampleItems: sd.sampleItems as string[],
                    salesChannels: sd.salesChannels as string[],
                    monthlyOrders: sd.monthlyOrders,
                    productCategories: sd.productCategories as string[],
                    termsAccepted: sd.termsAccepted,
                    termsAcceptedAt: new Date(),
                    sellerCitymunCode: sd.sellerCitymunCode,
                    sellerProvCode: sd.sellerProvCode,
                    sellerRegCode: sd.sellerRegCode,
                    status: SellerStatus.ACTIVE,
                    approvedAt: new Date(),
                    hasSeenWelcomeModal: true,
                    commissionRate: sd.commissionRate,
                    freeShippingEnabled: sd.freeShippingEnabled,
                    freeShippingThreshold: sd.freeShippingThreshold,
                    selfDeliveryEnabled: sd.selfDeliveryEnabled,
                    banner: bannerUrl,
                    logo: avatarUrl,
                },
            });
            console.log(`  ✅ Created seller: ${sd.name}`);
        } else {
            console.log(`  ⏭️  Seller exists: ${sd.slug}`);
            if (bannerUrl || avatarUrl) {
                await prisma.seller.update({
                    where: { slug: sd.slug },
                    data: { 
                        ...(bannerUrl && { banner: bannerUrl }),
                        ...(avatarUrl && { logo: avatarUrl })
                    }
                });
            }
        }

        createdSellers.push({ uid: seller.uid, email: ud.email });
    }

    // 2.5 Create dummy buyers for reviews
    console.log('\n👤 Creating dummy buyers...');
    const buyerNames = ['Juan Dela Cruz', 'Maria Clara', 'Andres Bonifacio', 'Jose Rizal'];
    const dummyBuyers = [];
    for (let i = 0; i < buyerNames.length; i++) {
        let buyer = await prisma.user.findUnique({ where: { email: `buyer${i}@knotbloom-seed.com` } });
        if (!buyer) {
            buyer = await prisma.user.create({
                data: {
                    name: buyerNames[i]!,
                    email: `buyer${i}@knotbloom-seed.com`,
                    password: 'Password123!',
                    role: 'USER',
                }
            });
        }
        dummyBuyers.push(buyer);
    }

    // 3. Create products
    console.log('\n📦 Creating products and reviews...');
    const productDefs = buildProductDefs(imgs);
    let created = 0;
    let skipped = 0;

    for (const p of productDefs) {
        const sellerInfo = createdSellers[p.si];
        if (!sellerInfo) {
            console.warn(`  ⚠️  No seller at index ${p.si}`);
            continue;
        }

        const existing = await prisma.product.findFirst({
            where: { sku: p.sku },
        });
        if (existing) {
            console.log(`  ⏭️  Skipping (exists): ${p.name}`);
            skipped++;
            continue;
        }

        const discountedPrice = calcDiscountedPrice(p.basePrice, p.discountPercentage);

        // Create product directly (no transaction — seeding, so no need for atomicity)
        const product = await prisma.product.create({
            data: {
                name: p.name,
                sku: p.sku,
                categories: p.categories,
                basePrice: p.basePrice,
                ...(discountedPrice !== null ? { discountedPrice } : {}),
                ...(p.discountPercentage !== null ? { discountPercentage: p.discountPercentage } : {}),
                image: p.image,
                images: p.images,
                description: p.description,
                materials: p.materials,
                careInstructions: p.careInstructions,
                tags: p.tags,
                metaTitle: p.metaTitle,
                metaDescription: p.metaDescription,
                fulfillmentType: p.fulfillmentType,
                ...(p.processingTime ? { processingTime: p.processingTime } : {}),
                isCodAllowed: p.isCodAllowed,
                isLocalPickupAllowed: p.isLocalPickupAllowed,
                ...(p.localPickupInstructions ? { localPickupInstructions: p.localPickupInstructions } : {}),
                isCustomOrderAllowed: p.isCustomOrderAllowed,
                ...(p.customOrderInstructions ? { customOrderInstructions: p.customOrderInstructions } : {}),
                isBundle: p.isBundle,
                ...(p.bundleQuantity !== null ? { bundleQuantity: p.bundleQuantity } : {}),
                minOrderQty: p.minOrderQty,
                maxOrderQty: p.maxOrderQty,
                soldCount: p.soldCount,
                sellerId: sellerInfo.uid,
                status: ProductStatus.ACTIVE,
            } as any,
        });

        // Create options
        const optionValueMap: Record<string, Record<string, number>> = {};
        for (let oi = 0; oi < p.productOptions.length; oi++) {
            const opt = p.productOptions[oi]!;
            const createdOpt = await prisma.productOption.create({
                data: { productId: product.uid, name: opt.name, position: opt.position },
            });
            optionValueMap[opt.name] = {};
            for (const val of opt.values) {
                const createdVal = await prisma.productOptionValue.create({
                    data: { optionId: createdOpt.uid, value: val.value, imageUrl: val.imageUrl ?? null },
                });
                optionValueMap[opt.name]![val.value] = createdVal.uid;
            }
        }

        // Create variants
        for (const v of p.variants as any[]) {
            const optionValueIds: number[] = [];
            if (v.options) {
                for (const [optName, optVal] of Object.entries(v.options) as [string, string][]) {
                    const vid = optionValueMap[optName]?.[optVal];
                    if (vid) optionValueIds.push(vid);
                }
            }

            const vDiscPct = v.discountPercentage ?? p.discountPercentage;
            const vDiscountedPrice = calcDiscountedPrice(v.price ?? p.basePrice, vDiscPct);

            await prisma.productVariant.create({
                data: {
                    productId: product.uid,
                    name: v.name,
                    sku: v.sku,
                    stock: v.stock,
                    price: v.price ?? null,
                    ...(vDiscPct !== null ? { discountPercentage: vDiscPct } : {}),
                    ...(vDiscountedPrice !== null ? { discountedPrice: vDiscountedPrice } : {}),
                    images: v.images ?? [],
                    isEnabled: v.isEnabled !== false,
                    ...(optionValueIds.length > 0
                        ? { optionValues: { connect: optionValueIds.map((id) => ({ uid: id })) } }
                        : {}),
                } as any,
            });
        }

        // Create dummy reviews if soldCount > 0
        if (p.soldCount > 0) {
            const numReviews = Math.min(p.soldCount, dummyBuyers.length);
            for (let i = 0; i < numReviews; i++) {
                const buyer = dummyBuyers[i]!;
                const existingReview = await prisma.review.findFirst({
                    where: { productId: product.uid, userId: buyer.uid }
                });
                
                if (!existingReview) {
                    const reviewTexts = [
                        "Ganda ng quality! Super worth it for the price. Will order again soon.",
                        "Seller was very responsive. The item arrived securely packed and in perfect condition.",
                        "Ang cute! Exact to the description and photos. My daughter loved it.",
                        "Highly recommended. Handcrafted with care and attention to detail."
                    ];
                    
                    await prisma.review.create({
                        data: {
                            rating: 5,
                            content: reviewTexts[i % reviewTexts.length] || "",
                            userId: buyer.uid,
                            productId: product.uid,
                            sellerId: sellerInfo.uid,
                        }
                    });
                }
            }
        }

        console.log(`  ✅ ${p.name} [${p.variants.length} variants, ${p.productOptions.length} option groups, ${p.soldCount > 0 ? dummyBuyers.length : 0} reviews]`);
        created++;
    }

    console.log(`\n🎉 Seed complete!`);
    console.log(`   Sellers processed : ${createdSellers.length}`);
    console.log(`   Products created  : ${created}`);
    console.log(`   Products skipped  : ${skipped}`);
    console.log(`\n📧 Credentials (password: Password123!)`);
    console.log(`   maria.santos@knotbloom-seed.com  →  Ami ni Maria`);
    console.log(`   diane.reyes@knotbloom-seed.com   →  The Crobag Studio`);
    console.log(`   lena.cruz@knotbloom-seed.com     →  Lena's Blooms`);

    await prisma.$disconnect();
}

seedMainStore().catch((e) => {
    console.error('❌ Seed failed:', e);
    prisma.$disconnect();
    process.exit(1);
});
