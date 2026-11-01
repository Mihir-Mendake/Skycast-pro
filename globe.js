// ===================================================
// Stratos Weather — 3D Earth Controller (globe.js)
// Next-Gen Glass Badges, Jet Stream Arcs & Atmospheric Clouds
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

// Global Jet Stream Corridors (Luminous 3D Arcs)
const JET_STREAM_ARCS = [
    { startLat: 40.7128, startLng: -74.0060, endLat: 51.5074, endLng: -0.1278, color: ['#38bdf8', '#818cf8'] }, // NY -> London
    { startLat: 51.5074, startLng: -0.1278, endLat: 48.8566, endLng: 2.3522, color: ['#818cf8', '#a855f7'] },  // London -> Paris
    { startLat: 48.8566, startLng: 2.3522, endLat: 25.2048, endLng: 55.2708, color: ['#a855f7', '#fbbf24'] },  // Paris -> Dubai
    { startLat: 25.2048, startLng: 55.2708, endLat: 19.0760, endLng: 72.8777, color: ['#fbbf24', '#f87171'] },  // Dubai -> Mumbai
    { startLat: 19.0760, startLng: 72.8777, endLat: 1.3521, endLng: 103.8198, color: ['#f87171', '#34d399'] },  // Mumbai -> Singapore
    { startLat: 1.3521, startLng: 103.8198, endLat: 35.6762, endLng: 139.6503, color: ['#34d399', '#38bdf8'] },  // Singapore -> Tokyo
    { startLat: 35.6762, startLng: 139.6503, endLat: 21.3069, endLng: -157.8583, color: ['#38bdf8', '#60a5fa'] },// Tokyo -> Honolulu
    { startLat: 21.3069, startLng: -157.8583, endLat: 34.0522, endLng: -118.2437, color: ['#60a5fa', '#f59e0b'] },// Honolulu -> LA
    { startLat: 34.0522, startLng: -118.2437, endLat: 40.7128, endLng: -74.0060, color: ['#f59e0b', '#38bdf8'] }, // LA -> NY
    { startLat: -33.8688, startLng: 151.2093, endLat: 1.3521, endLng: 103.8198, color: ['#38bdf8', '#34d399'] }, // Sydney -> Singapore
    { startLat: 64.1466, startLng: -21.9426, endLat: 51.5074, endLng: -0.1278, color: ['#93c5fd', '#38bdf8'] },  // Reykjavik -> London
    { startLat: -22.9068, startLng: -43.1729, endLat: -33.9249, endLng: 18.4241, color: ['#fbbf24', '#f43f5e'] }, // Rio -> Cape Town
    { startLat: -33.9249, startLng: 18.4241, endLat: 30.0444, endLng: 31.2357, color: ['#f43f5e', '#fbbf24'] },  // Cape Town -> Cairo
    { startLat: 30.0444, startLng: 31.2357, endLat: 25.2048, endLng: 55.2708, color: ['#fbbf24', '#f59e0b'] }   // Cairo -> Dubai
];

// Major Global Weather Stations
const GLOBAL_HUBS = [
    { name: "Tokyo", country: "Japan", flag: "🇯🇵", lat: 35.6762, lng: 139.6503 },
    { name: "Mumbai", country: "India", flag: "🇮🇳", lat: 19.0760, lng: 72.8777 },
    { name: "London", country: "United Kingdom", flag: "🇬🇧", lat: 51.5074, lng: -0.1278 },
    { name: "New York", country: "United States", flag: "🇺🇸", lat: 40.7128, lng: -74.0060 },
    { name: "Sydney", country: "Australia", flag: "🇦🇺", lat: -33.8688, lng: 151.2093 },
    { name: "Cairo", country: "Egypt", flag: "🇪🇬", lat: 30.0444, lng: 31.2357 },
    { name: "Paris", country: "France", flag: "🇫🇷", lat: 48.8566, lng: 2.3522 },
    { name: "Dubai", country: "UAE", flag: "🇦🇪", lat: 25.2048, lng: 55.2708 },
    { name: "Singapore", country: "Singapore", flag: "🇸🇬", lat: 1.3521, lng: 103.8198 },
    { name: "Rio de Janeiro", country: "Brazil", flag: "🇧🇷", lat: -22.9068, lng: -43.1729 },
    { name: "Los Angeles", country: "United States", flag: "🇺🇸", lat: 34.0522, lng: -118.2437 },
    { name: "Cape Town", country: "South Africa", flag: "🇿🇦", lat: -33.9249, lng: 18.4241 },
    { name: "Reykjavik", country: "Iceland", flag: "🇮🇸", lat: 64.1466, lng: -21.9426 },
    { name: "Seoul", country: "South Korea", flag: "🇰🇷", lat: 37.5665, lng: 126.9780 },
    { name: "Berlin", country: "Germany", flag: "🇩🇪", lat: 52.5200, lng: 13.4050 },
    { name: "Buenos Aires", country: "Argentina", flag: "🇦🇷", lat: -34.6037, lng: -58.3816 },
    { name: "Bangkok", country: "Thailand", flag: "🇹🇭", lat: 13.7563, lng: 100.5018 },
    { name: "Nairobi", country: "Kenya", flag: "🇰🇪", lat: -1.2921, lng: 36.8219 },
    { name: "Vancouver", country: "Canada", flag: "🇨🇦", lat: 49.2827, lng: -123.1207 },
    { name: "Honolulu", country: "United States", flag: "🌺", lat: 21.3069, lng: -157.8583 },
    { name: "Moscow", country: "Russia", flag: "🇷🇺", lat: 55.7558, lng: 37.6173 }
];

// App State
let currentUnit = localStorage.getItem('stratos_unit') || localStorage.getItem('skycast_unit') || 'C';
let isAutoSpinning = true;
let areArcsEnabled = true;
let currentTextureMode = 'night'; // 'night' or 'day'
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

// 1. INITIALIZE 3D GLOBE
function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container) return;

    myGlobe = Globe()(container)
        .globeImageUrl(TEXTURES.night)
        .bumpImageUrl(TEXTURES.bump)
        .backgroundImageUrl(TEXTURES.stars)
        .atmosphereColor('#38bdf8')
        .atmosphereAltitude(0.24)
        // Modern Floating Glass Badges (Replaces Bulky Cylinders!)
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
        // Luminous Jet Stream Arcs
        .arcsData(areArcsEnabled ? JET_STREAM_ARCS : [])
        .arcStartLat(d => d.startLat)
        .arcStartLng(d => d.startLng)
        .arcEndLat(d => d.endLat)
        .arcEndLng(d => d.endLng)
        .arcColor(d => d.color)
        .arcAltitude(0.25)
        .arcStroke(0.85)
        .arcDashLength(0.4)
        .arcDashGap(1.2)
        .arcDashAnimateTime(2200);

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
}

// 2. SETUP 3D TRANSLUCENT CLOUDS
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
            myGlobe.scene().add(cloudsMesh);

            // Cloud Drift Animation
            (function rotateClouds() {
                if (cloudsMesh) {
                    cloudsMesh.rotation.y += 0.00045;
                }
                requestAnimationFrame(rotateClouds);
            })();
        });
    } catch (e) {
        console.warn("3D Cloud layer bypassed:", e.message);
    }
}

// 3. FETCH LIVE DATA FOR GLOBAL HUBS
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

// 4. INSPECT CITY (Camera Fly-To & Open Floating Panel)
function inspectCity(city) {
    activeInspectedCity = city;

    if (myGlobe) {
        myGlobe.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.55 }, 1400);
    }

    // Populate Inspector Card
    document.getElementById('card-city-name').innerText = city.name;
    document.getElementById('card-country-name').innerText = city.country || 'Global Location';
    document.getElementById('card-temp').innerText = formatTemp(city.temp);
    document.getElementById('card-condition-icon').innerText = city.icon || '🌤️';
    document.getElementById('card-condition-text').innerText = city.condition || 'Clear';
    document.getElementById('card-feels-like').innerText = `${formatTemp(city.feelsLike)}°`;
    document.getElementById('card-wind').innerText = formatWindSpeed(city.wind);
    document.getElementById('card-humidity').innerText = `${city.humidity}%`;
    document.getElementById('card-uv').innerText = city.uv || 3;

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

// 5. UI CONTROLS & EVENT LISTENERS
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

            if (myGlobe) {
                myGlobe.htmlElementsData([...cityMarkers]);
            }
        });
    }

    // Day / Night Texture Toggle
    const textureBtn = document.getElementById('btn-toggle-texture');
    if (textureBtn) {
        textureBtn.addEventListener('click', () => {
            if (currentTextureMode === 'night') {
                currentTextureMode = 'day';
                textureBtn.innerText = '☀️ Blue Marble';
                textureBtn.classList.add('active');
                if (myGlobe) myGlobe.globeImageUrl(TEXTURES.day);
            } else {
                currentTextureMode = 'night';
                textureBtn.innerText = '🌙 City Lights';
                textureBtn.classList.remove('active');
                if (myGlobe) myGlobe.globeImageUrl(TEXTURES.night);
            }
        });
    }

    // Toggle Jet Streams (Arcs)
    const arcsBtn = document.getElementById('btn-toggle-arcs');
    if (arcsBtn) {
        arcsBtn.addEventListener('click', () => {
            areArcsEnabled = !areArcsEnabled;
            arcsBtn.classList.toggle('active', areArcsEnabled);
            if (myGlobe) {
                myGlobe.arcsData(areArcsEnabled ? JET_STREAM_ARCS : []);
            }
        });
    }

    // Auto-spin toggle
    const spinBtn = document.getElementById('btn-toggle-spin');
    if (spinBtn) {
        spinBtn.addEventListener('click', () => {
            isAutoSpinning = !isAutoSpinning;
            if (myGlobe) {
                myGlobe.controls().autoRotate = isAutoSpinning;
            }
            spinBtn.classList.toggle('active', isAutoSpinning);
            spinBtn.innerText = isAutoSpinning ? '⏸️ Auto-Spin' : '▶️ Auto-Spin';
        });
    }

    // Reset Camera
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

    // Quick Hotspots Fly-To Bar
    setupHotspotsBar();

    // Autocomplete Search & Fly-To
    setupGlobeSearch();
}

function setupHotspotsBar() {
    const chips = document.querySelectorAll('.hotspot-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cityName = chip.getAttribute('data-city');
            const found = cityMarkers.find(c => c.name.toLowerCase() === cityName.toLowerCase());
            if (found) {
                inspectCity(found);
            }
        });
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

// 6. AUTOCOMPLETE SEARCH & FLY-TO INTEGRATION
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
                    color: getTempColor(celsius)
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
