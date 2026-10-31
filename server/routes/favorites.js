const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Ensure data directory exists safely (prevents crashes in read-only environments like Vercel)
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (e) {
    console.warn("Filesystem read-only or unavailable for data directory:", e.message);
}

function readJsonFile(filePath, defaultData = []) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content || '[]');
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return defaultData;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error(`Error writing ${filePath}:`, err.message);
        return false;
    }
}

// Initial seed favorites if none exist
const defaultSeedFavorites = [
    { name: "Mumbai", country: "India", lat: 19.076, lon: 72.8777 },
    { name: "Tokyo", country: "Japan", lat: 35.6895, lon: 139.6917 },
    { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
    { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060 }
];

// Seed initial data if file is newly created
if (!fs.existsSync(FAVORITES_FILE)) {
    writeJsonFile(FAVORITES_FILE, defaultSeedFavorites);
}

// GET /api/favorites
router.get('/favorites', (req, res) => {
    const favorites = readJsonFile(FAVORITES_FILE, defaultSeedFavorites);
    res.json({ favorites });
});

// POST /api/favorites
router.post('/favorites', (req, res) => {
    const { name, country, lat, lon } = req.body;
    if (!name || lat === undefined || lon === undefined) {
        return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
    }

    const favorites = readJsonFile(FAVORITES_FILE, defaultSeedFavorites);
    const existingIndex = favorites.findIndex(f => f.name.toLowerCase() === name.toLowerCase());

    const item = {
        name: name.trim(),
        country: (country || '').trim(),
        lat: Number(lat),
        lon: Number(lon),
        addedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        favorites[existingIndex] = item;
    } else {
        favorites.unshift(item);
    }

    writeJsonFile(FAVORITES_FILE, favorites);
    res.status(201).json({ message: 'Added to favorites', favorites });
});

// DELETE /api/favorites/:name
router.delete('/favorites/:name', (req, res) => {
    const cityName = req.params.name.toLowerCase();
    let favorites = readJsonFile(FAVORITES_FILE, defaultSeedFavorites);
    const initialLength = favorites.length;

    favorites = favorites.filter(f => f.name.toLowerCase() !== cityName);

    if (favorites.length === initialLength) {
        return res.status(404).json({ error: 'Favorite not found' });
    }

    writeJsonFile(FAVORITES_FILE, favorites);
    res.json({ message: 'Favorite removed', favorites });
});

// GET /api/history
router.get('/history', (req, res) => {
    const history = readJsonFile(HISTORY_FILE, []);
    res.json({ history });
});

// POST /api/history
router.post('/history', (req, res) => {
    const { name, country, lat, lon } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    let history = readJsonFile(HISTORY_FILE, []);
    // Remove if already in history to move to top
    history = history.filter(h => h.name.toLowerCase() !== name.toLowerCase());
    history.unshift({
        name: name.trim(),
        country: (country || '').trim(),
        lat: lat !== undefined ? Number(lat) : null,
        lon: lon !== undefined ? Number(lon) : null,
        searchedAt: new Date().toISOString()
    });

    // Keep last 10 entries
    if (history.length > 10) history = history.slice(0, 10);

    writeJsonFile(HISTORY_FILE, history);
    res.status(201).json({ message: 'History updated', history });
});

module.exports = router;

