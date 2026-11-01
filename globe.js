// ===================================================
// Stratos Weather — 3D Earth Controller (globe.js)
// ===================================================

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1';
const USE_API = window.location.protocol.startsWith('http');
const API_BASE_URL = USE_API ? '/api' : null;

// App & Unit State
let currentUnit = localStorage.getItem('stratos_unit') || localStorage.getItem('skycast_unit') || 'C';
let isAutoSpinning = true;
let areRingsEnabled = true;
let myGlobe = null;
let cityMarkers = [];
let activeInspectedCity = null;

// Iconic global cities for live heatmap markers
const GLOBAL_HUBS = [
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
    { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777 },
    { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
    { name: "New York", country: "United States", lat: 40.7128, lng: -74.0060 },
    { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
    { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357 },
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
    { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
    { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
    { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729 },
    { name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437 },
    { name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241 },
    { name: "Reykjavik", country: "Iceland", lat: 64.1466, lng: -21.9426 },
    { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780 },
    { name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050 },
    { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816 },
    { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
    { name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219 },
    { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207 },
    { name: "Honolulu", country: "United States", lat: 21.3069, lng: -157.8583 },
    { name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173 }
];

// Temperature Color Palette: Deep Blue -> Cyan -> Lime -> Amber -> Coral
function getTempColor(celsius) {
    if (celsius <= 0) return '#38bdf8'; // Freezing (Ice Blue)
    if (celsius <= 15) return '#2dd4bf'; // Cool (Teal/Cyan)
    if (celsius <= 25) return '#a3e635'; // Mild (Fresh Lime)
    if (celsius <= 33) return '#fbbf24'; // Warm (Amber)
    return '#f87171'; // Hot (Crimson Coral)
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

// Map WMO Weather Codes to Conditions and Icons
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
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .atmosphereColor('#38bdf8')
        .atmosphereAltitude(0.24)
        // 3D Heatmap Points Layer
        .pointsData(cityMarkers)
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointColor(d => d.color)
        .pointAltitude(0.06)
        .pointRadius(0.85)
        .pointResolution(24)
        .pointLabel(d => `
            <div style="
                background: rgba(15, 23, 42, 0.9);
                color: #fff;
                padding: 6px 12px;
                border-radius: 12px;
                border: 1px solid ${d.color};
                font-family: 'Plus Jakarta Sans', sans-serif;
                font-size: 12px;
                font-weight: 700;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
                pointer-events: none;
            ">
                <span style="color: ${d.color};">${d.name}</span>: ${formatTemp(d.temp)}°${currentUnit} ${d.icon}
            </div>
        `)
        .onPointClick(d => inspectCity(d))
        // Pulsing Rings Layer
        .ringsData(cityMarkers)
        .ringLat(d => d.lat)
        .ringLng(d => d.lng)
        .ringColor(d => () => areRingsEnabled ? d.color : 'rgba(0,0,0,0)')
        .ringMaxRadius(3.5)
        .ringPropagationSpeed(1.6)
        .ringRepeatPeriod(1400);

    // Initial Camera View (focus on Europe/Asia overview)
    myGlobe.pointOfView({ lat: 20, lng: 40, altitude: 2.2 });

    // Auto-spin controls
    myGlobe.controls().autoRotate = isAutoSpinning;
    myGlobe.controls().autoRotateSpeed = 0.55;
    myGlobe.controls().enableDamping = true;

    // Handle Window Resizing
    window.addEventListener('resize', () => {
        myGlobe.width(window.innerWidth).height(window.innerHeight);
    });

    // Setup UI Listeners & Clocks
    setupControls();
    updateClock();
    setInterval(updateClock, 1000);

    // Fetch Weather Data for Global Cities
    fetchGlobalHotspots();
}

// 2. FETCH LIVE DATA FOR GLOBAL HUBS
async function fetchGlobalHotspots() {
    const fetchPromises = GLOBAL_HUBS.map(async (city) => {
        try {
            const url = `${OPEN_METEO_BASE}/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=uv_index_max&timezone=auto`;
            const resp = await fetch(url);
            const data = await resp.json();
            const current = data.current || {};
            const daily = data.daily || {};
            const celsius = current.temperature_2m !== undefined ? current.temperature_2m : 20;
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

    // Update Globe Data
    if (myGlobe) {
        myGlobe.pointsData(cityMarkers);
        myGlobe.ringsData(cityMarkers);
    }

    // Hide loader
    const loader = document.getElementById('globe-loader');
    if (loader) {
        loader.classList.add('loaded');
    }

    // Check if user has an active city in localStorage to auto-inspect
    const activeCityName = localStorage.getItem('stratos_active_city');
    if (activeCityName) {
        const found = cityMarkers.find(c => c.name.toLowerCase() === activeCityName.toLowerCase());
        if (found) {
            setTimeout(() => inspectCity(found), 800);
        }
    }
}

// 3. INSPECT CITY (Fly Camera & Open Floating Card)
function inspectCity(city) {
    activeInspectedCity = city;

    // Smooth camera transition to the selected city
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

    // Save as active city in localStorage
    try {
        localStorage.setItem('stratos_active_city', city.name);
    } catch (e) {}
}

// 4. UI CONTROLS & EVENT LISTENERS
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

            // Refresh Inspector Card if open
            if (activeInspectedCity) {
                inspectCity(activeInspectedCity);
            }

            // Force Globe tooltip update
            if (myGlobe) {
                myGlobe.pointsData([...cityMarkers]);
            }
        });
    }

    // Auto-spin button
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

    // Reset Camera button
    const resetBtn = document.getElementById('btn-reset-view');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (myGlobe) {
                myGlobe.pointOfView({ lat: 20, lng: 40, altitude: 2.2 }, 1200);
            }
        });
    }

    // Toggle Pulse Rings
    const ringsBtn = document.getElementById('btn-toggle-rings');
    if (ringsBtn) {
        ringsBtn.addEventListener('click', () => {
            areRingsEnabled = !areRingsEnabled;
            ringsBtn.classList.toggle('active', areRingsEnabled);
            if (myGlobe) {
                myGlobe.ringsData(areRingsEnabled ? cityMarkers : []);
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

    // Autocomplete Search & Fly-To
    setupGlobeSearch();
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

// 5. AUTOCOMPLETE SEARCH & FLY-TO INTEGRATION
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

            // Fetch live weather for the chosen searched city
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

                // Add to cityMarkers if not already present
                const exists = cityMarkers.some(c => c.name.toLowerCase() === newCity.name.toLowerCase());
                if (!exists) {
                    cityMarkers.push(newCity);
                    if (myGlobe) {
                        myGlobe.pointsData(cityMarkers);
                        if (areRingsEnabled) myGlobe.ringsData(cityMarkers);
                    }
                }

                // Fly to city & open inspection card
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

// Start Globe on page load
window.addEventListener('DOMContentLoaded', initGlobe);
