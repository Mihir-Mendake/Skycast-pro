// ===================================================
// Stratos Weather — 3D Earth Controller (globe.js)
// Real-Time Climate Sphere & Interactive Geographic Information System (GIS)
// ===================================================

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1';
const USE_API = window.location.protocol.startsWith('http');
const API_BASE_URL = USE_API ? '/api' : null;

// Earth Texture URLs
const TEXTURES = {
    night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    day: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
    clouds: 'https://unpkg.com/three-globe/example/img/clouds.png',
    stars: 'https://unpkg.com/three-globe/example/img/night-sky.png'
};

// ===================================================
// 1. DATASETS FOR GEOGRAPHY STUDENTS & CLIMATE SCIENTISTS
// ===================================================

// Helper to generate circular latitude paths
function generateLatitudeLine(lat, step = 2) {
    const pts = [];
    for (let lng = -180; lng <= 180; lng += step) {
        pts.push([lat, lng]);
    }
    return pts;
}

// Mathematical generator for planetary Rossby wave jet streams (Atmospheric Troposphere ~10km)
function generateRossbyWave(baseLat, waveCount, amplitude, phaseShift = 0, step = 2) {
    const pts = [];
    for (let lng = -180; lng <= 180; lng += step) {
        const rad = (lng + phaseShift) * (Math.PI / 180);
        // Harmonic superposition creates organic atmospheric meanders across ridges and troughs
        const wave = Math.sin(rad * waveCount) * amplitude + Math.cos(rad * 2) * (amplitude * 0.3);
        const lat = Math.max(-85, Math.min(85, baseLat + wave));
        pts.push([lat, lng]);
    }
    return pts;
}

// Professional Jet Stream Systems (Meandering Rossby Ribbon Waves in Upper Troposphere)
const PROFESSIONAL_JET_STREAMS = [
    // 1. Northern Polar Front Jet (Primary Core Stream) - 52°N base, wavenumber 4 Rossby meander
    {
        name: 'Northern Polar Front Jet (Core)',
        coords: generateRossbyWave(52, 4, 10.5, 20),
        color: 'rgba(56, 189, 248, 0.95)', // Radiant aerodynamic cyan
        stroke: 2.0,
        alt: 0.040,
        dashLength: 0.16,
        dashGap: 0.04,
        animateTime: 3400
    },
    // 2. Northern Polar Jet (Secondary High-Latitude Flank)
    {
        name: 'Northern Polar Jet (Secondary Branch)',
        coords: generateRossbyWave(58, 4, 8.0, 35),
        color: 'rgba(96, 165, 250, 0.65)', // Muted atmospheric blue
        stroke: 1.3,
        alt: 0.037,
        dashLength: 0.14,
        dashGap: 0.05,
        animateTime: 4000
    },
    // 3. Northern Subtropical Jet Stream - ~30°N, high-velocity linear ribbon
    {
        name: 'Northern Subtropical Jet',
        coords: generateRossbyWave(30, 3, 5.0, 45),
        color: 'rgba(129, 140, 248, 0.9)', // Violet-blue
        stroke: 1.8,
        alt: 0.042,
        dashLength: 0.20,
        dashGap: 0.04,
        animateTime: 2800
    },
    // 4. Southern Polar Jet (Circumpolar Roaring Forties/Fifties) - ~53°S
    {
        name: 'Southern Polar Jet (Roaring Forties)',
        coords: generateRossbyWave(-53, 4, 7.5, 15),
        color: 'rgba(56, 189, 248, 0.9)',
        stroke: 2.0,
        alt: 0.040,
        dashLength: 0.18,
        dashGap: 0.04,
        animateTime: 3200
    },
    // 5. Southern Subtropical Jet - ~28°S
    {
        name: 'Southern Subtropical Jet',
        coords: generateRossbyWave(-28, 3, 4.5, 30),
        color: 'rgba(129, 140, 248, 0.8)',
        stroke: 1.6,
        alt: 0.039,
        dashLength: 0.18,
        dashGap: 0.05,
        animateTime: 3600
    }
];

// Professional Global Ocean Currents (Thermohaline Gyres & Coastal Boundary Currents at Sea Level)
const PROFESSIONAL_OCEAN_CURRENTS = [
    // WARM CURRENTS (Thermal Gyres & Western Boundary Currents)
    {
        name: 'Gulf Stream & North Atlantic Drift',
        type: 'warm',
        coords: [
            [24.5, -81.0], [26.0, -80.0], [29.0, -80.2], [32.0, -78.8], [35.2, -75.2],
            [37.5, -71.5], [39.8, -65.0], [41.2, -56.0], [42.8, -46.0], [48.0, -35.0],
            [53.0, -25.0], [58.5, -14.0], [62.5, -4.0], [67.0, 7.0], [71.5, 20.0]
        ],
        color: '#f43f5e',
        stroke: 2.2,
        alt: 0.006,
        dashLength: 0.16,
        dashGap: 0.03,
        animateTime: 4400
    },
    {
        name: 'Kuroshio Current & North Pacific Gyre',
        type: 'warm',
        coords: [
            [14.5, 126.0], [19.0, 123.5], [23.5, 122.5], [27.5, 126.5], [31.5, 131.0],
            [34.2, 137.5], [35.8, 142.0], [38.5, 148.0], [41.0, 158.0], [43.0, 170.0],
            [44.5, -175.0], [45.5, -160.0], [46.5, -145.0], [48.0, -135.0]
        ],
        color: '#f43f5e',
        stroke: 2.0,
        alt: 0.006,
        dashLength: 0.16,
        dashGap: 0.03,
        animateTime: 4400
    },
    {
        name: 'Brazil Current',
        type: 'warm',
        coords: [
            [-8.5, -34.8], [-12.5, -38.2], [-17.5, -39.0], [-22.5, -41.5],
            [-27.5, -46.5], [-33.0, -51.5], [-38.5, -55.0]
        ],
        color: '#f43f5e',
        stroke: 1.8,
        alt: 0.006,
        dashLength: 0.14,
        dashGap: 0.04,
        animateTime: 4800
    },
    {
        name: 'Agulhas Current (Western Indian Ocean)',
        type: 'warm',
        coords: [
            [-14.5, 41.5], [-19.5, 36.5], [-25.5, 33.5], [-30.5, 30.5],
            [-34.0, 26.5], [-36.8, 21.0], [-38.2, 16.5]
        ],
        color: '#fb923c',
        stroke: 1.9,
        alt: 0.006,
        dashLength: 0.15,
        dashGap: 0.04,
        animateTime: 4200
    },
    {
        name: 'East Australian Current (EAC)',
        type: 'warm',
        coords: [
            [-15.5, 148.0], [-19.5, 151.0], [-24.5, 154.5], [-29.5, 154.0],
            [-34.0, 152.5], [-38.5, 151.0], [-42.5, 149.0]
        ],
        color: '#fb923c',
        stroke: 1.8,
        alt: 0.006,
        dashLength: 0.15,
        dashGap: 0.04,
        animateTime: 4600
    },
    {
        name: 'North Equatorial Current (Atlantic)',
        type: 'warm',
        coords: [
            [13.5, -20.0], [14.5, -32.0], [15.2, -45.0], [15.8, -58.0], [16.5, -68.0]
        ],
        color: '#fbbf24',
        stroke: 1.6,
        alt: 0.006,
        dashLength: 0.16,
        dashGap: 0.04,
        animateTime: 5000
    },
    {
        name: 'North Equatorial Current (Pacific)',
        type: 'warm',
        coords: [
            [12.0, -110.0], [12.5, -130.0], [13.0, -155.0], [13.5, 175.0],
            [14.0, 155.0], [14.5, 135.0]
        ],
        color: '#fbbf24',
        stroke: 1.6,
        alt: 0.006,
        dashLength: 0.18,
        dashGap: 0.04,
        animateTime: 5200
    },
    {
        name: 'South Equatorial Current (Pacific)',
        type: 'warm',
        coords: [
            [-4.5, -85.0], [-4.0, -110.0], [-3.5, -140.0], [-3.0, -170.0],
            [-2.8, 160.0], [-2.5, 140.0]
        ],
        color: '#fbbf24',
        stroke: 1.6,
        alt: 0.006,
        dashLength: 0.18,
        dashGap: 0.04,
        animateTime: 5200
    },

    // COLD CURRENTS (Eastern Boundary Upwelling & Subpolar Drift)
    {
        name: 'California Current',
        type: 'cold',
        coords: [
            [50.0, -128.5], [46.0, -126.5], [41.0, -125.8], [36.0, -123.5],
            [32.0, -120.0], [27.0, -116.0], [22.5, -111.0]
        ],
        color: '#06b6d4',
        stroke: 1.9,
        alt: 0.006,
        dashLength: 0.15,
        dashGap: 0.03,
        animateTime: 4600
    },
    {
        name: 'Humboldt (Peru) Current',
        type: 'cold',
        coords: [
            [-48.0, -76.0], [-42.0, -75.0], [-36.0, -73.5], [-30.0, -72.0],
            [-23.5, -71.0], [-17.5, -73.0], [-12.0, -78.0], [-6.5, -82.0], [-2.0, -86.5]
        ],
        color: '#0284c7',
        stroke: 2.0,
        alt: 0.006,
        dashLength: 0.15,
        dashGap: 0.03,
        animateTime: 4400
    },
    {
        name: 'Benguela Current (South Atlantic Upwelling)',
        type: 'cold',
        coords: [
            [-35.5, 18.5], [-31.5, 16.8], [-27.0, 14.2], [-22.0, 12.5],
            [-17.0, 10.5], [-11.5, 9.0]
        ],
        color: '#0284c7',
        stroke: 1.9,
        alt: 0.006,
        dashLength: 0.15,
        dashGap: 0.03,
        animateTime: 4600
    },
    {
        name: 'Canary Current',
        type: 'cold',
        coords: [
            [42.0, -10.0], [37.0, -10.5], [32.0, -12.5], [26.5, -16.2],
            [21.0, -19.5], [15.0, -22.5]
        ],
        color: '#06b6d4',
        stroke: 1.8,
        alt: 0.006,
        dashLength: 0.15,
        dashGap: 0.03,
        animateTime: 4800
    },
    {
        name: 'Labrador Current',
        type: 'cold',
        coords: [
            [66.0, -60.0], [60.5, -61.2], [55.0, -57.5], [50.0, -53.8],
            [45.0, -50.2], [41.5, -49.0]
        ],
        color: '#38bdf8',
        stroke: 1.9,
        alt: 0.006,
        dashLength: 0.14,
        dashGap: 0.03,
        animateTime: 4200
    },
    {
        name: 'Oyashio (Kamchatka) Current',
        type: 'cold',
        coords: [
            [58.0, 164.0], [52.5, 158.5], [47.5, 152.5], [43.0, 147.2], [39.5, 143.0]
        ],
        color: '#38bdf8',
        stroke: 1.8,
        alt: 0.006,
        dashLength: 0.14,
        dashGap: 0.03,
        animateTime: 4200
    },
    {
        name: 'West Australian Current',
        type: 'cold',
        coords: [
            [-37.5, 114.5], [-32.5, 113.0], [-27.0, 111.5], [-21.0, 109.0], [-15.0, 106.0]
        ],
        color: '#06b6d4',
        stroke: 1.8,
        alt: 0.006,
        dashLength: 0.15,
        dashGap: 0.03,
        animateTime: 4800
    },
    {
        name: 'Antarctic Circumpolar Current (ACC - West Wind Drift)',
        type: 'cold',
        coords: generateLatitudeLine(-54, 2),
        color: '#38bdf8',
        stroke: 2.2,
        alt: 0.007,
        dashLength: 0.18,
        dashGap: 0.04,
        animateTime: 5400
    }
];

// Helper to generate meridian longitude paths
function generateLongitudeLine(lng, minLat = -85, maxLat = 85, step = 3) {
    const pts = [];
    for (let lat = minLat; lat <= maxLat; lat += step) {
        pts.push([lat, lng]);
    }
    return pts;
}

// 1. GEOGRAPHIC GRID (Parallels, Equator, Tropics, Prime Meridian)
const GEOGRAPHIC_GRID_PATHS = [
    // The Equator (0° Latitude)
    { name: 'Equator (0°)', coords: generateLatitudeLine(0), color: '#fbbf24', stroke: 2.2 },
    // Tropic of Cancer (23.44° N)
    { name: 'Tropic of Cancer (23.5° N)', coords: generateLatitudeLine(23.44), color: '#f97316', stroke: 1.5, dashLength: 0.6, dashGap: 0.3 },
    // Tropic of Capricorn (23.44° S)
    { name: 'Tropic of Capricorn (23.5° S)', coords: generateLatitudeLine(-23.44), color: '#f97316', stroke: 1.5, dashLength: 0.6, dashGap: 0.3 },
    // Arctic Circle (66.56° N)
    { name: 'Arctic Circle (66.5° N)', coords: generateLatitudeLine(66.56), color: '#38bdf8', stroke: 1.5, dashLength: 0.4, dashGap: 0.4 },
    // Antarctic Circle (66.56° S)
    { name: 'Antarctic Circle (66.5° S)', coords: generateLatitudeLine(-66.56), color: '#38bdf8', stroke: 1.5, dashLength: 0.4, dashGap: 0.4 },
    // Prime Meridian (0° Longitude)
    { name: 'Prime Meridian (0°)', coords: generateLongitudeLine(0), color: '#34d399', stroke: 2.0 },
    // International Date Line (180° Longitude)
    { name: 'International Date Line (180°)', coords: generateLongitudeLine(180), color: '#a78bfa', stroke: 1.6, dashLength: 0.5, dashGap: 0.5 }
];

// Add subtle 30° grid parallels and meridians
[-60, -30, 30, 60].forEach(lat => {
    GEOGRAPHIC_GRID_PATHS.push({
        name: `Parallel ${lat}°`,
        coords: generateLatitudeLine(lat, 5),
        color: 'rgba(255, 255, 255, 0.16)',
        stroke: 0.7,
        dashLength: 0.3,
        dashGap: 0.4
    });
});

[-150, -120, -90, -60, -30, 30, 60, 90, 120, 150].forEach(lng => {
    GEOGRAPHIC_GRID_PATHS.push({
        name: `Meridian ${lng}°`,
        coords: generateLongitudeLine(lng, -80, 80, 5),
        color: 'rgba(255, 255, 255, 0.14)',
        stroke: 0.6,
        dashLength: 0.25,
        dashGap: 0.45
    });
});

// 2. CLIMATE ZONES / THERMAL BELTS
const CLIMATE_ZONE_PATHS = [
    // Polar (Frigid) North Limit (66.5° N)
    { name: 'North Polar Zone', coords: generateLatitudeLine(66.56), color: '#38bdf8', stroke: 2.5 },
    // Temperate North Upper Limit (35° N - Subtropical Boundary)
    { name: 'Subtropical Boundary N (35° N)', coords: generateLatitudeLine(35.0), color: '#eab308', stroke: 1.2, dashLength: 0.5, dashGap: 0.3 },
    // Tropical / Torrid Zone North (23.44° N)
    { name: 'Tropical Zone North (23.5° N)', coords: generateLatitudeLine(23.44), color: '#f97316', stroke: 2.2 },
    // Tropical / Torrid Zone South (23.44° S)
    { name: 'Tropical Zone South (23.5° S)', coords: generateLatitudeLine(-23.44), color: '#f97316', stroke: 2.2 },
    // Temperate South Upper Limit (35° S - Subtropical Boundary)
    { name: 'Subtropical Boundary S (35° S)', coords: generateLatitudeLine(-35.0), color: '#eab308', stroke: 1.2, dashLength: 0.5, dashGap: 0.3 },
    // Polar (Frigid) South Limit (66.5° S)
    { name: 'South Polar Zone', coords: generateLatitudeLine(-66.56), color: '#38bdf8', stroke: 2.5 }
];

// 3. TECTONIC PLATE BOUNDARIES & PACIFIC RING OF FIRE
const TECTONIC_PATHS = [
    // Pacific Ring of Fire (Western Rim)
    {
        name: 'Pacific Ring of Fire (West)',
        coords: [
            [-45.0, 167.0], [-41.0, 174.0], [-21.0, -175.0], [-15.0, 167.0], [-5.0, 150.0],
            [1.0, 127.0], [14.0, 144.0], [35.0, 140.0], [45.0, 151.0], [55.0, 162.0],
            [53.0, 175.0], [52.0, -175.0], [55.0, -160.0], [60.0, -147.0]
        ],
        color: '#ff4d4d',
        stroke: 2.2,
        dashLength: 0.8,
        dashGap: 0.2,
        animateTime: 3000
    },
    // Pacific Ring of Fire (Eastern Rim / San Andreas & Andes)
    {
        name: 'Pacific Ring of Fire (East)',
        coords: [
            [60.0, -147.0], [50.0, -128.0], [45.0, -124.0], [38.0, -122.0], [34.0, -118.0],
            [23.0, -107.0], [16.0, -98.0], [9.0, -84.0], [1.0, -80.0], [-12.0, -77.0],
            [-23.0, -70.0], [-38.0, -73.0], [-54.0, -70.0]
        ],
        color: '#ff4d4d',
        stroke: 2.2,
        dashLength: 0.8,
        dashGap: 0.2,
        animateTime: 3000
    },
    // Mid-Atlantic Ridge Divergent Rift
    {
        name: 'Mid-Atlantic Ridge',
        coords: [
            [79.0, 3.0], [71.0, -8.0], [64.0, -18.0], [52.0, -32.0], [38.0, -28.0],
            [15.0, -45.0], [0.0, -25.0], [-12.0, -14.0], [-35.0, -16.0], [-54.0, 3.0]
        ],
        color: '#ff922b',
        stroke: 1.8,
        dashLength: 0.6,
        dashGap: 0.3
    },
    // Alpine-Himalayan Orogenic Belt
    {
        name: 'Alpine-Himalayan Belt',
        coords: [
            [36.0, -6.0], [40.0, 15.0], [39.0, 26.0], [39.0, 40.0], [35.0, 51.0],
            [34.0, 68.0], [28.0, 85.0], [25.0, 95.0], [15.0, 98.0], [2.0, 100.0],
            [-7.0, 107.0], [-9.0, 120.0]
        ],
        color: '#ff6b6b',
        stroke: 1.8
    },
    // East African Rift System
    {
        name: 'East African Rift',
        coords: [
            [15.0, 41.0], [11.0, 42.0], [4.0, 36.0], [-2.0, 36.0], [-6.0, 30.0],
            [-12.0, 34.0], [-18.0, 35.0]
        ],
        color: '#fa5252',
        stroke: 1.8
    }
];

// Major Global Weather & Geography Stations
const GLOBAL_HUBS = [
    { 
        name: "Tokyo", country: "Japan", flag: "🇯🇵", lat: 35.6762, lng: 139.6503,
        elevation: "40 m ASL",
        koppen: "Cfa — Humid Subtropical",
        zone: "North Temperate Zone",
        wind: "Prevailing Westerlies",
        geoNote: "Located along the Pacific Ring of Fire at the triple junction of 3 tectonic plates."
    },
    { 
        name: "Mumbai", country: "India", flag: "🇮🇳", lat: 19.0760, lng: 72.8777,
        elevation: "14 m ASL",
        koppen: "Aw — Tropical Wet & Dry",
        zone: "Torrid / Tropical Zone",
        wind: "Arabian Sea Monsoon",
        geoNote: "Governed by seasonal monsoon reversals driven by the shift of the thermal equator."
    },
    { 
        name: "London", country: "United Kingdom", flag: "🇬🇧", lat: 51.5074, lng: -0.1278,
        elevation: "11 m ASL",
        koppen: "Cfb — Oceanic (Maritime)",
        zone: "North Temperate Zone",
        wind: "Southwesterly Westerlies",
        geoNote: "Sitting directly on the Prime Meridian (0° Longitude); warmed by the Gulf Stream drift."
    },
    { 
        name: "New York", country: "United States", flag: "🇺🇸", lat: 40.7128, lng: -74.0060,
        elevation: "10 m ASL",
        koppen: "Dfa — Humid Continental",
        zone: "North Temperate Zone",
        wind: "Westerlies / Nor'easters",
        geoNote: "Estuary harbor subject to clashes between continental polar and maritime tropical air."
    },
    { 
        name: "Sydney", country: "Australia", flag: "🇦🇺", lat: -33.8688, lng: 151.2093,
        elevation: "19 m ASL",
        koppen: "Cfa — Humid Subtropical",
        zone: "South Temperate Zone",
        wind: "East Australian Current influence",
        geoNote: "Coastal basin bordered by the Tasman Sea and Great Dividing Mountain Range."
    },
    { 
        name: "Cairo", country: "Egypt", flag: "🇪🇬", lat: 30.0444, lng: 31.2357,
        elevation: "23 m ASL",
        koppen: "BWh — Hot Desert (Hyper-Arid)",
        zone: "Subtropical Arid Belt",
        wind: "Northeast Trade Winds / Khamsin",
        geoNote: "Located in the Sahara rain-shadow; arid climate created by Hadley Cell subsidence."
    },
    { 
        name: "Paris", country: "France", flag: "🇫🇷", lat: 48.8566, lng: 2.3522,
        elevation: "35 m ASL",
        koppen: "Cfb — Oceanic",
        zone: "North Temperate Zone",
        wind: "Atlantic Westerlies",
        geoNote: "Situated in the low-lying Seine River sedimentary basin of Western Europe."
    },
    { 
        name: "Dubai", country: "UAE", flag: "🇦🇪", lat: 25.2048, lng: 55.2708,
        elevation: "5 m ASL",
        koppen: "BWh — Hot Desert",
        zone: "Subtropical Arid Belt",
        wind: "Northwesterly Shamal",
        geoNote: "Positioned directly north of the Tropic of Cancer along the Persian Gulf coast."
    },
    { 
        name: "Singapore", country: "Singapore", flag: "🇸🇬", lat: 1.3521, lng: 103.8198,
        elevation: "15 m ASL",
        koppen: "Af — Tropical Rainforest",
        zone: "Equatorial Doldrums (ITCZ)",
        wind: "Intertropical Convergence",
        geoNote: "Just 137 km (1° N) from the Equator; experiences constant daily year-round solar insolation."
    },
    { 
        name: "Rio de Janeiro", country: "Brazil", flag: "🇧🇷", lat: -22.9068, lng: -43.1729,
        elevation: "2 m ASL",
        koppen: "Aw — Tropical Savanna",
        zone: "South Tropical Zone",
        wind: "Southeast Trade Winds",
        geoNote: "Flanked by the Atlantic Ocean and the granite peaks of the Serra do Mar."
    },
    { 
        name: "Los Angeles", country: "United States", flag: "🇺🇸", lat: 34.0522, lng: -118.2437,
        elevation: "87 m ASL",
        koppen: "Csa — Mediterranean",
        zone: "North Temperate Zone",
        wind: "Santa Ana Winds / Sea Breeze",
        geoNote: "Sitting on the active San Andreas fault plate boundary; cooled by the California Current."
    },
    { 
        name: "Cape Town", country: "South Africa", flag: "🇿🇦", lat: -33.9249, lng: 18.4241,
        elevation: "12 m ASL",
        koppen: "Csb — Mediterranean",
        zone: "South Temperate Zone",
        wind: "Southeasterly 'Cape Doctor'",
        geoNote: "Meeting point of the cold Benguela ocean current and the warm Agulhas current."
    },
    { 
        name: "Reykjavik", country: "Iceland", flag: "🇮🇸", lat: 64.1466, lng: -21.9426,
        elevation: "15 m ASL",
        koppen: "Cfc — Subpolar Oceanic",
        zone: "Sub-Arctic Circle Fringe",
        wind: "Polar Front Cyclones",
        geoNote: "Directly straddles the Mid-Atlantic Ridge divergent rift between North America and Eurasia."
    },
    { 
        name: "Seoul", country: "South Korea", flag: "🇰🇷", lat: 37.5665, lng: 126.9780,
        elevation: "38 m ASL",
        koppen: "Dwa — Monsoon Continental",
        zone: "North Temperate Zone",
        wind: "Siberian High / Asian Monsoon",
        geoNote: "Peninsular geography creating extreme thermal swings between continental winter and tropical summer."
    },
    { 
        name: "Berlin", country: "Germany", flag: "🇩🇪", lat: 52.5200, lng: 13.4050,
        elevation: "34 m ASL",
        koppen: "Cfb — Temperate Oceanic",
        zone: "North Temperate Zone",
        wind: "Maritime Westerlies",
        geoNote: "Located on the flat glacial spillway of the vast North European Plain."
    },
    { 
        name: "Buenos Aires", country: "Argentina", flag: "🇦🇷", lat: -34.6037, lng: -58.3816,
        elevation: "25 m ASL",
        koppen: "Cfa — Humid Subtropical",
        zone: "South Temperate Zone",
        wind: "Sudestada / Pampero Winds",
        geoNote: "Located on the western shore of the Río de la Plata estuary facing the fertile Pampas flatlands."
    },
    { 
        name: "Bangkok", country: "Thailand", flag: "🇹🇭", lat: 13.7563, lng: 100.5018,
        elevation: "2 m ASL",
        koppen: "Aw — Tropical Savanna",
        zone: "Torrid / Tropical Zone",
        wind: "Southwest Monsoon",
        geoNote: "Low-lying alluvial flood plain delta along the Chao Phraya River, prone to tidal surge."
    },
    { 
        name: "Nairobi", country: "Kenya", flag: "🇰🇪", lat: -1.2921, lng: 36.8219,
        elevation: "1,795 m ASL",
        koppen: "Cwb — Subtropical Highland",
        zone: "Equatorial Highland",
        wind: "Equatorial Trade Winds",
        geoNote: "High elevation moderates equatorial heat; sits beside the Great East African Rift Valley."
    },
    { 
        name: "Vancouver", country: "Canada", flag: "🇨🇦", lat: 49.2827, lng: -123.1207,
        elevation: "70 m ASL",
        koppen: "Cfb — Marine Oceanic",
        zone: "North Temperate Zone",
        wind: "North Pacific Westerlies",
        geoNote: "Orographic rain shadow created by the coastal Coast and Cascade Mountain ranges."
    },
    { 
        name: "Honolulu", country: "United States", flag: "🌺", lat: 21.3069, lng: -157.8583,
        elevation: "6 m ASL",
        koppen: "As — Tropical Dry-Summer",
        zone: "Tropical Belt (Near Cancer)",
        wind: "Northeast Trade Winds",
        geoNote: "Volcanic shield island chain formed over a stationary mantle thermal plume (hotspot)."
    },
    { 
        name: "Moscow", country: "Russia", flag: "🇷🇺", lat: 55.7558, lng: 37.6173,
        elevation: "156 m ASL",
        koppen: "Dfb — Humid Continental",
        zone: "North Temperate Zone",
        wind: "Polar Continental Air Masses",
        geoNote: "Deep continental interior situated far from oceans, causing sharp seasonal temperature ranges."
    }
];

// ===================================================
// 2. APP STATE & LAYER TOGGLES
// ===================================================

let currentUnit = localStorage.getItem('stratos_unit') || localStorage.getItem('skycast_unit') || 'C';
let currentTextureMode = 'night'; // 'night' or 'day'
let isAutoSpinning = true;

// Geography Layer Flags
let areCloudsEnabled = true;
let areArcsEnabled = true;         // Jet Streams
let areCurrentsEnabled = false;    // Ocean Currents
let isGridEnabled = false;          // Geographic Grid
let areZonesEnabled = false;        // Climate Belts
let areTectonicsEnabled = false;    // Tectonic Faults

let myGlobe = null;
let cityMarkers = [];
let activeInspectedCity = null;
let cloudsMesh = null;

// Dynamic Temperature Color Palette
function getTempColor(celsius) {
    if (celsius <= 0) return '#38bdf8'; // Freezing (Ice Blue)
    if (celsius <= 15) return '#2dd4bf'; // Cool (Cyan/Teal)
    if (celsius <= 25) return '#a3e635'; // Mild (Fresh Lime)
    if (celsius <= 32) return '#fbbf24'; // Warm (Amber)
    return '#f87171'; // Scorching (Crimson)
}

function formatTemp(celsius) {
    if (celsius === undefined || celsius === null) return '--';
    const val = Number(celsius);
    if (currentUnit === 'F') {
        return Math.round((val * 9 / 5) + 32);
    }
    return Math.round(val);
}

function formatWindSpeed(kmh) {
    const val = Number(kmh) || 0;
    if (currentUnit === 'F') {
        return `${Math.round(val * 0.621371)} mph`;
    }
    return `${Math.round(val)} km/h`;
}

function mapWeatherCode(code, isDay = true) {
    if (code === 0 || code === 1) return { condition: isDay ? "Sunny" : "Clear", icon: isDay ? "☀️" : "🌙" };
    if (code === 2 || code === 3 || code === 45 || code === 48) return { condition: "Cloudy", icon: "☁️" };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { condition: "Rain", icon: "🌧️" };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snow", icon: "❄️" };
    if ([95, 96, 99].includes(code)) return { condition: "Storm", icon: "⛈️" };
    return { condition: "Clear", icon: "🌤️" };
}

// Compute active combined paths (Grid + Climate Zones + Tectonics + Jet Streams + Ocean Currents)
function getActivePaths() {
    let paths = [];
    if (isGridEnabled) paths = paths.concat(GEOGRAPHIC_GRID_PATHS);
    if (areZonesEnabled) paths = paths.concat(CLIMATE_ZONE_PATHS);
    if (areTectonicsEnabled) paths = paths.concat(TECTONIC_PATHS);
    if (areArcsEnabled) paths = paths.concat(PROFESSIONAL_JET_STREAMS);
    if (areCurrentsEnabled) paths = paths.concat(PROFESSIONAL_OCEAN_CURRENTS);
    return paths;
}

// Refresh 3D Paths on globe
function updateGlobePaths() {
    if (!myGlobe) return;
    myGlobe.pathsData(getActivePaths());
}

// ===================================================
// 3. INITIALIZE 3D GLOBE
// ===================================================

function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container) return;

    myGlobe = Globe()(container)
        .globeImageUrl(TEXTURES.night)
        .bumpImageUrl(TEXTURES.bump)
        .backgroundImageUrl(TEXTURES.stars)
        .atmosphereColor('#38bdf8')
        .atmosphereAltitude(0.24)

        // Modern Floating Glass Badges
        .htmlElementsData(cityMarkers)
        .htmlLat(d => d.lat)
        .htmlLng(d => d.lng)
        .htmlAltitude(0.035)
        .htmlElement(d => {
            const el = document.createElement('div');
            el.className = 'globe-marker-badge';
            el.style.setProperty('--accent-color', d.color);
            el.innerHTML = `
                <span class="marker-dot" style="background: ${d.color}; box-shadow: 0 0 10px ${d.color};"></span>
                <span class="marker-city">${d.name}</span>
                <span class="marker-temp">${formatTemp(d.temp)}°</span>
                <span class="marker-icon">${d.icon}</span>
            `;
            el.addEventListener('click', () => inspectCity(d));
            return el;
        })

        // Professional Physical Geography & Atmospheric Streamline Paths
        .pathsData(getActivePaths())
        .pathPoints(d => d.coords)
        .pathPointLat(p => p[0])
        .pathPointLng(p => p[1])
        .pathPointAlt(d => d.alt !== undefined ? d.alt : 0.008)
        .pathColor(d => d.color)
        .pathStroke(d => d.stroke !== undefined ? d.stroke : 1.4)
        .pathDashLength(d => d.dashLength !== undefined ? d.dashLength : 1)
        .pathDashGap(d => d.dashGap !== undefined ? d.dashGap : 0)
        .pathDashAnimateTime(d => d.animateTime !== undefined ? d.animateTime : 0);

    // Initial View Position
    myGlobe.pointOfView({ lat: 20, lng: 35, altitude: 2.1 });

    // Auto-spin controls
    myGlobe.controls().autoRotate = isAutoSpinning;
    myGlobe.controls().autoRotateSpeed = 0.55;
    myGlobe.controls().enableDamping = true;

    // Add 3D Floating Clouds
    setupClouds();

    // Window Resize Handler
    window.addEventListener('resize', () => {
        myGlobe.width(window.innerWidth).height(window.innerHeight);
    });

    setupControls();
    updateClock();
    setInterval(updateClock, 1000);

    fetchGlobalHotspots();
    updateLayerGuide();
}

// Setup 3D Atmosphere Clouds
function setupClouds() {
    if (!window.THREE || !myGlobe) return;

    try {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(TEXTURES.clouds, (cloudsTexture) => {
            const radius = myGlobe.getGlobeRadius();
            const geometry = new THREE.SphereGeometry(radius * 1.012, 75, 75);
            const material = new THREE.MeshPhongMaterial({
                map: cloudsTexture,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending
            });

            cloudsMesh = new THREE.Mesh(geometry, material);
            cloudsMesh.visible = areCloudsEnabled;
            myGlobe.scene().add(cloudsMesh);

            // Cloud Drift Animation
            (function rotateClouds() {
                if (cloudsMesh && cloudsMesh.visible) {
                    cloudsMesh.rotation.y += 0.00045;
                }
                requestAnimationFrame(rotateClouds);
            })();
        });
    } catch (e) {
        console.warn("3D Cloud layer bypassed:", e.message);
    }
}

// ===================================================
// 4. FETCH LIVE DATA FOR GLOBAL HUBS
// ===================================================

async function fetchGlobalHotspots() {
    const fetchPromises = GLOBAL_HUBS.map(async (city) => {
        try {
            const url = `${OPEN_METEO_BASE}/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=uv_index_max&timezone=auto`;
            const resp = await fetch(url);
            const data = await resp.json();
            const current = data.current || {};
            const daily = data.daily || {};
            const celsius = current.temperature_2m !== undefined ? current.temperature_2m : 22;
            const isDay = current.is_day === 1;
            const code = current.weather_code || 0;
            const { condition, icon } = mapWeatherCode(code, isDay);

            return {
                ...city,
                temp: celsius,
                feelsLike: current.apparent_temperature !== undefined ? current.apparent_temperature : celsius,
                humidity: current.relative_humidity_2m || 50,
                wind: current.wind_speed_10m || 10,
                uv: daily.uv_index_max && daily.uv_index_max.length > 0 ? Math.round(daily.uv_index_max[0]) : 4,
                condition,
                icon,
                color: getTempColor(celsius)
            };
        } catch (e) {
            console.warn(`Could not load weather for ${city.name}:`, e.message);
            return {
                ...city,
                temp: 20,
                feelsLike: 20,
                humidity: 50,
                wind: 10,
                uv: 3,
                condition: "Mild",
                icon: "🌤️",
                color: getTempColor(20)
            };
        }
    });

    cityMarkers = await Promise.all(fetchPromises);

    // Update Globe HTML Elements
    if (myGlobe) {
        myGlobe.htmlElementsData(cityMarkers);
    }

    // Refresh Dropdown with live temperatures
    renderFlyToMenu();

    // Hide loader
    const loader = document.getElementById('globe-loader');
    if (loader) {
        loader.classList.add('loaded');
    }

    // Check if active city in localStorage to auto-inspect
    const activeCityName = localStorage.getItem('stratos_active_city');
    if (activeCityName) {
        const found = cityMarkers.find(c => c.name.toLowerCase() === activeCityName.toLowerCase());
        if (found) {
            setTimeout(() => inspectCity(found), 800);
        }
    }
}

// ===================================================
// 5. INSPECT CITY (Fly-To & Educational Profile)
// ===================================================

function inspectCity(city) {
    activeInspectedCity = city;

    if (myGlobe) {
        myGlobe.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.55 }, 1400);
    }

    // Basic Weather Information
    document.getElementById('card-city-name').innerText = city.name;
    document.getElementById('card-country-name').innerText = city.country || 'Global Location';
    document.getElementById('card-temp').innerText = formatTemp(city.temp);
    document.getElementById('card-condition-icon').innerText = city.icon || '🌤️';
    document.getElementById('card-condition-text').innerText = city.condition || 'Clear';
    document.getElementById('card-feels-like').innerText = `${formatTemp(city.feelsLike)}°`;
    document.getElementById('card-wind').innerText = formatWindSpeed(city.wind);
    document.getElementById('card-humidity').innerText = `${city.humidity}%`;
    document.getElementById('card-uv').innerText = city.uv || 3;

    // Educational Geography Profile
    const latFormatted = `${Math.abs(city.lat).toFixed(2)}° ${city.lat >= 0 ? 'N' : 'S'}`;
    const lngFormatted = `${Math.abs(city.lng).toFixed(2)}° ${city.lng >= 0 ? 'E' : 'W'}`;
    const coordsEl = document.getElementById('card-geo-coords');
    if (coordsEl) coordsEl.innerText = `${latFormatted}, ${lngFormatted}`;

    const zoneEl = document.getElementById('card-geo-zone');
    if (zoneEl) zoneEl.innerText = city.zone || computeClimateZone(city.lat);

    const elevEl = document.getElementById('card-geo-elevation');
    if (elevEl) elevEl.innerText = city.elevation || '25 m ASL';

    const koppenEl = document.getElementById('card-geo-koppen');
    if (koppenEl) koppenEl.innerText = city.koppen || computeKoppenClass(city.lat, city.temp);

    const noteEl = document.getElementById('card-geo-note');
    if (noteEl) {
        noteEl.innerText = city.geoNote || `Geographic station located in the ${computeClimateZone(city.lat)} influenced by atmospheric global pressure regimes.`;
    }

    // Link button to Dashboard
    const openBtn = document.getElementById('card-open-dashboard');
    if (openBtn) {
        openBtn.href = `index.html?city=${encodeURIComponent(city.name)}`;
    }

    // Show Card
    const card = document.getElementById('globe-card');
    if (card) {
        card.classList.remove('hidden');
    }

    try {
        localStorage.setItem('stratos_active_city', city.name);
    } catch (e) {}
}

function computeClimateZone(lat) {
    const absLat = Math.abs(lat);
    if (absLat >= 66.56) return 'Polar (Frigid) Zone';
    if (absLat <= 23.44) return 'Torrid (Tropical) Zone';
    if (absLat <= 35.0) return 'Subtropical Arid Belt';
    return (lat > 0 ? 'North' : 'South') + ' Temperate Zone';
}

function computeKoppenClass(lat, celsius) {
    const absLat = Math.abs(lat);
    if (absLat >= 66.56) return 'ET — Polar Tundra';
    if (absLat <= 23.44) return celsius > 26 ? 'Af — Tropical Rainforest' : 'Aw — Tropical Savanna';
    if (absLat <= 35.0) return 'Csa — Mediterranean / Subtropical';
    return 'Cfb — Oceanic Temperate';
}

// ===================================================
// 6. UI CONTROLS & DYNAMIC LAYER TOGGLES
// ===================================================

function setupControls() {
    // Unit Toggle (°C / °F)
    const unitBtn = document.getElementById('unit-toggle');
    updateUnitButtonLabel();
    if (unitBtn) {
        unitBtn.addEventListener('click', () => {
            currentUnit = currentUnit === 'C' ? 'F' : 'C';
            localStorage.setItem('stratos_unit', currentUnit);
            updateUnitButtonLabel();
            updateLegendLabels();

            if (activeInspectedCity) {
                inspectCity(activeInspectedCity);
            }

            renderFlyToMenu();

            if (myGlobe) {
                myGlobe.htmlElementsData([...cityMarkers]);
            }
        });
    }

    // 1. Day / Night Surface Texture
    const textureBtn = document.getElementById('btn-toggle-texture');
    const textureLabel = document.getElementById('texture-mode-label');
    if (textureBtn) {
        textureBtn.addEventListener('click', () => {
            if (currentTextureMode === 'night') {
                currentTextureMode = 'day';
                if (textureLabel) textureLabel.innerText = 'Blue Marble';
                if (myGlobe) myGlobe.globeImageUrl(TEXTURES.day);
            } else {
                currentTextureMode = 'night';
                if (textureLabel) textureLabel.innerText = 'City Lights';
                if (myGlobe) myGlobe.globeImageUrl(TEXTURES.night);
            }
        });
    }

    // 2. Cloud Atmosphere
    const cloudsBtn = document.getElementById('btn-toggle-clouds');
    const cloudsLabel = document.getElementById('clouds-mode-label');
    if (cloudsBtn) {
        cloudsBtn.addEventListener('click', () => {
            areCloudsEnabled = !areCloudsEnabled;
            setButtonStatus(cloudsLabel, areCloudsEnabled);
            if (cloudsMesh) {
                cloudsMesh.visible = areCloudsEnabled;
            }
        });
    }

    // 3. Jet Streams (Atmospheric Rossby Wind Vectors)
    const arcsBtn = document.getElementById('btn-toggle-arcs');
    const arcsLabel = document.getElementById('arcs-mode-label');
    if (arcsBtn) {
        arcsBtn.addEventListener('click', () => {
            areArcsEnabled = !areArcsEnabled;
            setButtonStatus(arcsLabel, areArcsEnabled);
            updateGlobePaths();
            updateLayerGuide();
        });
    }

    // 4. Ocean Currents (Marine Thermohaline Gyres)
    const currentsBtn = document.getElementById('btn-toggle-currents');
    const currentsLabel = document.getElementById('currents-mode-label');
    if (currentsBtn) {
        currentsBtn.addEventListener('click', () => {
            areCurrentsEnabled = !areCurrentsEnabled;
            setButtonStatus(currentsLabel, areCurrentsEnabled);
            updateGlobePaths();
            updateLayerGuide();
        });
    }

    // 5. Geographic Grid (Parallels & Prime Meridian)
    const gridBtn = document.getElementById('btn-toggle-grid');
    const gridLabel = document.getElementById('grid-mode-label');
    if (gridBtn) {
        gridBtn.addEventListener('click', () => {
            isGridEnabled = !isGridEnabled;
            setButtonStatus(gridLabel, isGridEnabled);
            updateGlobePaths();
            updateLayerGuide();
        });
    }

    // 6. Climate Belts
    const zonesBtn = document.getElementById('btn-toggle-zones');
    const zonesLabel = document.getElementById('zones-mode-label');
    if (zonesBtn) {
        zonesBtn.addEventListener('click', () => {
            areZonesEnabled = !areZonesEnabled;
            setButtonStatus(zonesLabel, areZonesEnabled);
            updateGlobePaths();
            updateLayerGuide();
        });
    }

    // 7. Tectonic Faults & Ring of Fire
    const tectonicsBtn = document.getElementById('btn-toggle-tectonics');
    const tectonicsLabel = document.getElementById('tectonics-mode-label');
    if (tectonicsBtn) {
        tectonicsBtn.addEventListener('click', () => {
            areTectonicsEnabled = !areTectonicsEnabled;
            setButtonStatus(tectonicsLabel, areTectonicsEnabled);
            updateGlobePaths();
            updateLayerGuide();
        });
    }

    // 8. Auto-spin Toggle
    const spinBtn = document.getElementById('btn-toggle-spin');
    const spinLabel = document.getElementById('spin-mode-label');
    if (spinBtn) {
        spinBtn.addEventListener('click', () => {
            isAutoSpinning = !isAutoSpinning;
            if (myGlobe) {
                myGlobe.controls().autoRotate = isAutoSpinning;
            }
            if (spinLabel) {
                spinLabel.innerText = isAutoSpinning ? 'On' : 'Paused';
                spinLabel.className = isAutoSpinning ? 'fly-temp status-on' : 'fly-temp status-off';
            }
        });
    }

    // 9. Reset Camera View
    const resetBtn = document.getElementById('btn-reset-view');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (myGlobe) {
                myGlobe.pointOfView({ lat: 20, lng: 35, altitude: 2.1 }, 1200);
            }
        });
    }

    // Close Inspector Card
    const closeBtn = document.getElementById('card-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const card = document.getElementById('globe-card');
            if (card) card.classList.add('hidden');
        });
    }

    // Dropdown Handlers
    setupFlyToDropdown();
    setupControlsDropdown();
    setupNavDropdown();
    setupGlobeSearch();
}

function setButtonStatus(labelEl, isActive) {
    if (!labelEl) return;
    labelEl.innerText = isActive ? 'Active' : 'Off';
    labelEl.className = isActive ? 'fly-temp status-on' : 'fly-temp status-off';
}

// Update Active Layer Guide Overlay
function updateLayerGuide() {
    const guideCard = document.getElementById('geo-layer-guide');
    const itemsContainer = document.getElementById('geo-guide-items');
    if (!guideCard || !itemsContainer) return;

    const activeRows = [];

    if (areArcsEnabled) {
        activeRows.push(`
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #38bdf8;"></span>
                <span>Polar Jet Streams (Rossby Waves ~10km)</span>
            </div>
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #818cf8;"></span>
                <span>Subtropical Jet Streams (~12km)</span>
            </div>
        `);
    }

    if (areCurrentsEnabled) {
        activeRows.push(`
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #f43f5e;"></span>
                <span>Warm Boundary Currents (Gulf / Kuroshio)</span>
            </div>
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #0284c7;"></span>
                <span>Cold Upwelling & ACC (Humboldt / Benguela)</span>
            </div>
        `);
    }

    if (isGridEnabled) {
        activeRows.push(`
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #fbbf24;"></span>
                <span>Equator (0° Latitude)</span>
            </div>
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #f97316;"></span>
                <span>Tropics of Cancer & Capricorn (23.5°)</span>
            </div>
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #34d399;"></span>
                <span>Prime Meridian (0° Longitude)</span>
            </div>
        `);
    }

    if (areZonesEnabled) {
        activeRows.push(`
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #f97316;"></span>
                <span>Torrid (Tropical) Zone</span>
            </div>
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #eab308;"></span>
                <span>Subtropical Arid Belts</span>
            </div>
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #38bdf8;"></span>
                <span>Polar (Frigid) Zones</span>
            </div>
        `);
    }

    if (areTectonicsEnabled) {
        activeRows.push(`
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #ff4d4d;"></span>
                <span>Pacific Ring of Fire & Fault Lines</span>
            </div>
            <div class="geo-guide-row">
                <span class="geo-guide-color-dot" style="background: #ff922b;"></span>
                <span>Mid-Atlantic Ridge (Divergent Rift)</span>
            </div>
        `);
    }

    if (activeRows.length > 0) {
        itemsContainer.innerHTML = activeRows.join('');
        guideCard.classList.remove('hidden');
    } else {
        guideCard.classList.add('hidden');
    }
}

function setupNavDropdown() {
    const navBtn = document.getElementById('btn-nav-dropdown');
    const navMenu = document.getElementById('nav-dropdown-menu');
    if (!navBtn || !navMenu) return;

    navBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(navMenu);
        const isOpen = navMenu.classList.toggle('show');
        navBtn.classList.toggle('active', isOpen);
    });
}

function setupControlsDropdown() {
    const controlsBtn = document.getElementById('btn-controls-dropdown');
    const controlsMenu = document.getElementById('controls-menu');
    if (!controlsBtn || !controlsMenu) return;

    controlsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(controlsMenu);
        const isOpen = controlsMenu.classList.toggle('show');
        controlsBtn.classList.toggle('active', isOpen);
    });
}

function closeAllDropdowns(exceptMenu = null) {
    const menus = [
        { btn: document.getElementById('btn-fly-to-dropdown'), menu: document.getElementById('fly-to-menu') },
        { btn: document.getElementById('btn-controls-dropdown'), menu: document.getElementById('controls-menu') },
        { btn: document.getElementById('btn-nav-dropdown'), menu: document.getElementById('nav-dropdown-menu') }
    ];

    menus.forEach(({ btn, menu }) => {
        if (menu && menu !== exceptMenu) {
            menu.classList.remove('show');
            if (btn) btn.classList.remove('active');
        }
    });
}

function setupFlyToDropdown() {
    const dropdownBtn = document.getElementById('btn-fly-to-dropdown');
    const dropdownMenu = document.getElementById('fly-to-menu');
    if (!dropdownBtn || !dropdownMenu) return;

    renderFlyToMenu();

    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(dropdownMenu);
        const isOpen = dropdownMenu.classList.toggle('show');
        dropdownBtn.classList.toggle('active', isOpen);
    });

    document.addEventListener('click', (e) => {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            dropdownBtn.classList.remove('active');
        }
    });
}

function renderFlyToMenu() {
    const dropdownMenu = document.getElementById('fly-to-menu');
    if (!dropdownMenu) return;
    dropdownMenu.innerHTML = '';

    const listToRender = cityMarkers.length > 0 ? cityMarkers : GLOBAL_HUBS;

    listToRender.forEach(city => {
        const item = document.createElement('button');
        item.className = 'fly-to-item';
        item.type = 'button';
        const tempText = city.temp !== undefined ? `${formatTemp(city.temp)}°` : '';
        item.innerHTML = `
            <span>${city.flag || '📍'} ${city.name}</span>
            <span class="fly-temp" style="color: ${city.color || 'var(--accent)'}">${tempText} ${city.icon || ''}</span>
        `;
        item.addEventListener('click', () => {
            inspectCity(city);
            dropdownMenu.classList.remove('show');
            const dropdownBtn = document.getElementById('btn-fly-to-dropdown');
            if (dropdownBtn) dropdownBtn.classList.remove('active');
        });
        dropdownMenu.appendChild(item);
    });
}

function updateUnitButtonLabel() {
    const unitBtn = document.getElementById('unit-toggle');
    if (unitBtn) {
        unitBtn.innerText = `°${currentUnit}`;
        unitBtn.title = `Switch to °${currentUnit === 'C' ? 'F' : 'C'}`;
    }
}

function updateLegendLabels() {
    const unitLabel = document.getElementById('legend-unit');
    const minLabel = document.getElementById('legend-min');
    const midLabel = document.getElementById('legend-mid');
    const maxLabel = document.getElementById('legend-max');

    if (unitLabel) unitLabel.innerText = `°${currentUnit}`;
    if (currentUnit === 'F') {
        if (minLabel) minLabel.innerText = '< 32°';
        if (midLabel) midLabel.innerText = '65°';
        if (maxLabel) maxLabel.innerText = '> 95°';
    } else {
        if (minLabel) minLabel.innerText = '< 0°';
        if (midLabel) midLabel.innerText = '18°';
        if (maxLabel) maxLabel.innerText = '> 35°';
    }
}

function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// ===================================================
// 7. AUTOCOMPLETE SEARCH & FLY-TO INTEGRATION
// ===================================================

function setupGlobeSearch() {
    const cityInput = document.getElementById('city-input');
    const listContainer = document.getElementById('autocomplete-list');
    if (!cityInput || !listContainer) return;

    let searchCache = new Map();

    cityInput.addEventListener('input', debounce(async function () {
        const val = this.value.trim();
        listContainer.innerHTML = '';
        listContainer.style.display = 'none';
        if (!val || val.length < 2) return;

        if (searchCache.has(val)) {
            renderSuggestions(searchCache.get(val), val, listContainer, cityInput);
            return;
        }

        try {
            let results = [];
            if (API_BASE_URL) {
                try {
                    const resp = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(val)}`);
                    if (resp.ok) {
                        const data = await resp.json();
                        results = data.results || [];
                    }
                } catch (e) {}
            }

            if (results.length === 0) {
                const response = await fetch(`${GEOCODING_BASE}/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`);
                const data = await response.json();
                results = data.results || [];
            }

            if (results.length > 0) {
                searchCache.set(val, results);
                renderSuggestions(results, val, listContainer, cityInput);
            }
        } catch (e) {
            console.error("Geocoding error:", e);
        }
    }, 300));

    document.addEventListener('click', (e) => {
        if (e.target !== cityInput) {
            listContainer.style.display = 'none';
        }
    });
}

function renderSuggestions(matches, val, listContainer, cityInput) {
    if (!matches || matches.length === 0) return;
    listContainer.innerHTML = '';
    listContainer.style.display = 'block';

    matches.forEach(match => {
        const item = document.createElement("div");
        item.className = "suggestion-item";

        const regex = new RegExp(`(${val})`, "gi");
        const highlightedName = match.name.replace(regex, '<span class="highlight">$1</span>');
        item.innerHTML = `<span>${highlightedName}</span><span class="country-code">${match.country || ''}</span>`;

        item.addEventListener("click", async () => {
            cityInput.value = "";
            listContainer.style.display = 'none';

            try {
                const url = `${OPEN_METEO_BASE}/forecast?latitude=${match.latitude}&longitude=${match.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=uv_index_max&timezone=auto`;
                const resp = await fetch(url);
                const data = await resp.json();
                const current = data.current || {};
                const daily = data.daily || {};
                const celsius = current.temperature_2m !== undefined ? current.temperature_2m : 20;
                const { condition, icon } = mapWeatherCode(current.weather_code || 0, current.is_day === 1);

                const elevation = match.elevation !== undefined ? `${Math.round(match.elevation)} m ASL` : '35 m ASL';

                const newCity = {
                    name: match.name,
                    country: match.country,
                    lat: match.latitude,
                    lng: match.longitude,
                    temp: celsius,
                    feelsLike: current.apparent_temperature !== undefined ? current.apparent_temperature : celsius,
                    humidity: current.relative_humidity_2m || 50,
                    wind: current.wind_speed_10m || 10,
                    uv: daily.uv_index_max && daily.uv_index_max.length > 0 ? Math.round(daily.uv_index_max[0]) : 4,
                    condition,
                    icon,
                    color: getTempColor(celsius),
                    elevation,
                    koppen: computeKoppenClass(match.latitude, celsius),
                    zone: computeClimateZone(match.latitude),
                    geoNote: `Geographic coordinates: ${Math.abs(match.latitude).toFixed(2)}° ${match.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(match.longitude).toFixed(2)}° ${match.longitude >= 0 ? 'E' : 'W'}.`
                };

                const exists = cityMarkers.some(c => c.name.toLowerCase() === newCity.name.toLowerCase());
                if (!exists) {
                    cityMarkers.push(newCity);
                    if (myGlobe) {
                        myGlobe.htmlElementsData([...cityMarkers]);
                    }
                }

                inspectCity(newCity);
            } catch (err) {
                console.error("Error fetching city weather on globe:", err);
            }
        });

        listContainer.appendChild(item);
    });
}

function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

window.addEventListener('DOMContentLoaded', initGlobe);
