import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load JSON data (cached in memory for performance)
let regionsData: any = null;
let provincesData: any = null;
let citiesData: any = null;
let barangaysData: any = null;

const loadData = () => {
    if (!regionsData) {
        const basePath = join(__dirname, '../../ph_address_json');
        regionsData = JSON.parse(readFileSync(join(basePath, 'refregion.json'), 'utf-8'));
        provincesData = JSON.parse(readFileSync(join(basePath, 'refprovince.json'), 'utf-8'));
        citiesData = JSON.parse(readFileSync(join(basePath, 'refcitymun.json'), 'utf-8'));
        barangaysData = JSON.parse(readFileSync(join(basePath, 'refbrgy.json'), 'utf-8'));
    }
};

// GET /api/locations/regions - Get all regions
router.get('/regions', (req, res) => {
    try {
        loadData();
        const regions = regionsData.RECORDS.map((r: any) => ({
            code: r.regCode,
            name: r.regDesc,
        }));
        res.json(regions);
    } catch (error) {
        console.error('Error loading regions:', error);
        res.status(500).json({ error: 'Failed to load regions' });
    }
});

// GET /api/locations/provinces/:regCode - Get provinces for a region
router.get('/provinces/:regCode', (req, res) => {
    try {
        loadData();
        const { regCode } = req.params;
        const provinces = provincesData.RECORDS
            .filter((p: any) => p.regCode === regCode)
            .map((p: any) => ({
                code: p.provCode,
                name: p.provDesc,
            }));
        res.json(provinces);
    } catch (error) {
        console.error('Error loading provinces:', error);
        res.status(500).json({ error: 'Failed to load provinces' });
    }
});

// GET /api/locations/cities/:provCode - Get cities/municipalities for a province
router.get('/cities/:provCode', (req, res) => {
    try {
        loadData();
        const { provCode } = req.params;
        const cities = citiesData.RECORDS
            .filter((c: any) => c.provCode === provCode)
            .map((c: any) => ({
                code: c.citymunCode,
                name: c.citymunDesc,
            }));
        res.json(cities);
    } catch (error) {
        console.error('Error loading cities:', error);
        res.status(500).json({ error: 'Failed to load cities' });
    }
});

// GET /api/locations/barangays/:citymunCode - Get barangays for a city/municipality
router.get('/barangays/:citymunCode', (req, res) => {
    try {
        loadData();
        const { citymunCode } = req.params;
        const barangays = barangaysData.RECORDS
            .filter((b: any) => b.citymunCode === citymunCode)
            .map((b: any) => ({
                code: b.brgyCode,
                name: b.brgyDesc,
            }));
        res.json(barangays);
    } catch (error) {
        console.error('Error loading barangays:', error);
        res.status(500).json({ error: 'Failed to load barangays' });
    }
});

export default router;
