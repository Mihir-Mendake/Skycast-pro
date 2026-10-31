const express = require('express');
const router = express.Router();

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1';

// Server-side in-memory cache with 5-minute TTL
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return item.data;
}

function setCache(key, data) {
    cache.set(key, { timestamp: Date.now(), data });
}

// GET /api/search?q=CityName
router.get('/search', async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
        }

        const cacheKey = `search:${query.toLowerCase()}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ source: 'cache', results: cached });
        }

        const url = `${GEOCODING_BASE}/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Geocoding API responded with status ${response.status}`);
        }

        const data = await response.json();
        const results = data.results || [];
        setCache(cacheKey, results);

        return res.json({ source: 'live', results });
    } catch (error) {
        console.error('Error in /api/search:', error.message);
        return res.status(500).json({ error: 'Failed to search for city' });
    }
});

// GET /api/weather?lat=...&lon=... (or ?city=...)
router.get('/weather', async (req, res) => {
    try {
        let { lat, lon, city } = req.query;

        // If city is passed without coordinates, geocode first
        let locationDetails = null;
        if ((!lat || !lon) && city) {
            const geoUrl = `${GEOCODING_BASE}/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`;
            const geoResp = await fetch(geoUrl);
            const geoData = await geoResp.json();
            if (!geoData.results || geoData.results.length === 0) {
                return res.status(404).json({ error: 'City not found' });
            }
            const match = geoData.results[0];
            lat = match.latitude;
            lon = match.longitude;
            locationDetails = {
                name: match.name,
                country: match.country,
                admin1: match.admin1,
                timezone: match.timezone
            };
        }

        if (lat === undefined || lon === undefined) {
            return res.status(400).json({ error: 'Missing latitude/longitude or city parameter' });
        }

        const cacheKey = `weather:${lat},${lon}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json({ source: 'cache', ...cached });
        }

        const weatherUrl = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,visibility&hourly=temperature_2m,weather_code,is_day&daily=weather_code,sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
        const aqiUrl = `${AIR_QUALITY_BASE}/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm2_5,pm10`;

        // Fetch weather and air quality in parallel
        const [weatherResp, aqiResp] = await Promise.allSettled([
            fetch(weatherUrl),
            fetch(aqiUrl)
        ]);

        if (weatherResp.status !== 'fulfilled' || !weatherResp.value.ok) {
            throw new Error('Weather API request failed');
        }

        const weatherData = await weatherResp.value.json();

        let airQuality = null;
        if (aqiResp.status === 'fulfilled' && aqiResp.value.ok) {
            try {
                const aqiData = await aqiResp.value.json();
                airQuality = aqiData.current || null;
            } catch (e) {
                console.warn('Air quality parsing skipped:', e.message);
            }
        }

        const payload = {
            location: locationDetails || {
                latitude: Number(lat),
                longitude: Number(lon),
                timezone: weatherData.timezone
            },
            current: weatherData.current,
            daily: weatherData.daily,
            hourly: weatherData.hourly,
            air_quality: airQuality,
            timezone: weatherData.timezone,
            timezone_abbreviation: weatherData.timezone_abbreviation,
            utc_offset_seconds: weatherData.utc_offset_seconds
        };

        setCache(cacheKey, payload);

        return res.json({ source: 'live', ...payload });
    } catch (error) {
        console.error('Error in /api/weather:', error.message);
        return res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

module.exports = router;
