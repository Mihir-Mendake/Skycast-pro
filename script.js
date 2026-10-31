// 1. API CONFIGURATION & STATE
// Use backend /api when served over HTTP/HTTPS (both localhost & Vercel)
const USE_API = window.location.protocol.startsWith('http');
const API_BASE_URL = USE_API ? '/api' : null;

// Open-Meteo API endpoints (fallback if backend is offline or opened via file://)
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1';

// Performance optimization
let searchCache = new Map();
let weatherCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// App State
let currentUnit = localStorage.getItem('stratos_unit') || localStorage.getItem('skycast_unit') || 'C'; // 'C' or 'F'
let currentCityTimezone = null;
let currentCityData = null; // Stores last fetched weather data
let currentCityMeta = { name: '', country: '', lat: 0, lon: 0 };
let userFavorites = [];

// DOM Elements
const canvas = document.getElementById('weather-canvas');
const ctx = canvas.getContext('2d');
const cityInput = document.getElementById('city-input');
const listContainer = document.getElementById('autocomplete-list');
const unitToggleBtn = document.getElementById('unit-toggle');
const btnFavorite = document.getElementById('btn-favorite');
const favoritesBar = document.getElementById('favorites-bar');

let particles = [];
let animationId;
let currentFocus = -1;

// 2. INITIALIZATION
function initApp() {
    window.addEventListener('resize', resize);
    resize();

    // Setup Unit Toggle
    updateUnitButtonLabel();
    if (unitToggleBtn) {
        unitToggleBtn.addEventListener('click', toggleUnit);
    }

    // Setup Favorite Button
    if (btnFavorite) {
        btnFavorite.addEventListener('click', toggleCurrentFavorite);
    }

    // Load initial favorites
    loadFavorites();

    // Enable smooth mouse-wheel & drag scrolling for horizontal lists
    setupHorizontalScroll('hourly-list', 'scroll-hourly-left', 'scroll-hourly-right');
    setupHorizontalScroll('favorites-bar');

    // Geolocation with fallback to New York
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updateWeather(latitude, longitude, "My Location");
            },
            (error) => {
                console.warn("Geolocation denied or failed:", error);
                fetchWeatherByCity("New York");
            }
        );
    } else {
        fetchWeatherByCity("New York");
    }

    startTime();
}

// 3. UNIT CONVERSIONS (°C <-> °F)
function toggleUnit() {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    localStorage.setItem('stratos_unit', currentUnit);
    updateUnitButtonLabel();

    // Re-render current weather if available
    if (currentCityData) {
        renderWeather(currentCityData, currentCityMeta.name, currentCityMeta.country);
    }
}

function updateUnitButtonLabel() {
    if (unitToggleBtn) {
        unitToggleBtn.innerText = `°${currentUnit}`;
        unitToggleBtn.title = `Switch to °${currentUnit === 'C' ? 'F' : 'C'}`;
    }
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

// 4. CLOCK & TIME SYNCHRONIZATION
function updateClock() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };

    if (currentCityTimezone) {
        try {
            timeOptions.timeZone = currentCityTimezone;
            dateOptions.timeZone = currentCityTimezone;
        } catch (e) {
            console.warn("Timezone not supported:", currentCityTimezone);
        }
    }

    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (timeEl) timeEl.innerText = now.toLocaleTimeString([], timeOptions);
    if (dateEl) dateEl.innerText = now.toLocaleDateString(undefined, dateOptions);
}

function startTime() {
    updateClock();
    setInterval(updateClock, 1000);
}

// 5. CORE WEATHER ENGINE
async function fetchWeatherByCity(cityName) {
    try {
        if (API_BASE_URL) {
            try {
                const resp = await fetch(`${API_BASE_URL}/weather?city=${encodeURIComponent(cityName)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    const name = (data.location && data.location.name) || cityName;
                    const country = (data.location && data.location.country) || '';
                    const lat = (data.location && data.location.latitude) || 0;
                    const lon = (data.location && data.location.longitude) || 0;
                    currentCityMeta = { name, country, lat, lon };
                    renderWeather(data, name, country);
                    recordSearchHistory(name, country, lat, lon);
                    return;
                }
            } catch (backendErr) {
                console.warn("Backend unavailable, using direct API:", backendErr);
            }
        }

        // Direct Open-Meteo fallback
        const searchUrl = `${GEOCODING_BASE}/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const searchResp = await fetch(searchUrl);
        const searchData = await searchResp.json();

        if (!searchData.results || searchData.results.length === 0) {
            console.error("City not found");
            showError();
            return;
        }

        const { latitude, longitude, name, country } = searchData.results[0];
        updateWeather(latitude, longitude, name, country);

    } catch (e) {
        console.error("Error fetching city:", e);
        showError();
    }
}

async function updateWeather(lat, lon, cityName, country) {
    const cacheKey = `${lat},${lon}`;
    const now = Date.now();

    if (weatherCache.has(cacheKey)) {
        const cached = weatherCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION) {
            currentCityMeta = { name: cityName, country, lat, lon };
            renderWeather(cached.data, cityName, country);
            return;
        }
    }

    try {
        if (API_BASE_URL) {
            try {
                const resp = await fetch(`${API_BASE_URL}/weather?lat=${lat}&lon=${lon}`);
                if (resp.ok) {
                    const data = await resp.json();
                    weatherCache.set(cacheKey, { timestamp: now, data });
                    const resolvedName = (data.location && data.location.name) || cityName;
                    const resolvedCountry = (data.location && data.location.country) || country;
                    currentCityMeta = { name: resolvedName, country: resolvedCountry, lat, lon };
                    renderWeather(data, resolvedName, resolvedCountry);
                    hideError();
                    recordSearchHistory(resolvedName, resolvedCountry, lat, lon);
                    return;
                }
            } catch (backendErr) {
                console.warn("Backend unavailable, using direct API:", backendErr);
            }
        }

        // Direct Open-Meteo fallback
        const weatherUrl = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,visibility,surface_pressure&hourly=temperature_2m,weather_code,is_day&daily=weather_code,sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;

        const response = await fetch(weatherUrl);
        const data = await response.json();

        weatherCache.set(cacheKey, { timestamp: now, data: data });
        currentCityMeta = { name: cityName, country, lat, lon };
        renderWeather(data, cityName, country);
        hideError();

    } catch (error) {
        console.error("Error fetching weather:", error);
        showError();
    }
}

function renderWeather(data, cityName, country) {
    currentCityData = data;
    const current = data.current;
    const daily = data.daily;
    const weatherCode = current.weather_code;
    const isDay = current.is_day === 1;

    // Timezone
    if (data.timezone) {
        currentCityTimezone = data.timezone;
        updateClock();
    }

    // Condition mapping
    const conditionData = mapWeatherCode(weatherCode, isDay);

    // Temperature (unit sensitive)
    const convertedMainTemp = formatTemp(current.temperature_2m);
    animateValue("main-temp", convertedMainTemp);

    const cityTitle = country ? `${cityName}, ${country}` : cityName;
    document.getElementById('city-name').innerText = cityTitle;
    document.getElementById('condition-text').innerText = conditionData.condition;
    document.getElementById('val-humidity').innerText = `${current.relative_humidity_2m}%`;
    document.getElementById('val-wind').innerText = formatWindSpeed(current.wind_speed_10m);

    // UV Index
    const uvIndex = daily && daily.uv_index_max && daily.uv_index_max.length > 0 ? Math.round(daily.uv_index_max[0]) : 0;
    const uvEl = document.getElementById('val-uv');
    const uvTextEl = document.getElementById('val-uv-text');
    if (uvEl) uvEl.innerText = uvIndex;
    if (uvTextEl) {
        let risk = 'Low';
        if (uvIndex >= 8) risk = 'Very High';
        else if (uvIndex >= 6) risk = 'High';
        else if (uvIndex >= 3) risk = 'Moderate';
        uvTextEl.innerText = `Risk Level: ${risk}`;
    }

    // Visibility
    const visibilityKm = current.visibility ? (current.visibility / 1000).toFixed(1) : 10;
    const visEl = document.getElementById('val-visibility');
    if (visEl) {
        if (currentUnit === 'F') {
            const visibilityMiles = (visibilityKm * 0.621371).toFixed(1);
            visEl.innerText = `${visibilityMiles} mi`;
        } else {
            visEl.innerText = `${visibilityKm} km`;
        }
    }

    // Feels Like
    const feelsLikeRaw = current.apparent_temperature !== undefined ? current.apparent_temperature : current.temperature_2m;
    const feelsEl = document.getElementById('feels-like');
    if (feelsEl) feelsEl.innerText = `${formatTemp(feelsLikeRaw)}°`;

    // Pressure
    const pressureEl = document.getElementById('val-pressure');
    if (pressureEl) {
        const pressureVal = current.surface_pressure ? Math.round(current.surface_pressure) : 1013;
        pressureEl.innerText = `${pressureVal} hPa`;
    }

    // Air Quality Index (AQI)
    const aqiEl = document.getElementById('val-aqi');
    const aqiTextEl = document.getElementById('val-aqi-text');
    if (aqiEl && aqiTextEl) {
        if (data.air_quality && data.air_quality.us_aqi !== undefined) {
            const aqi = Math.round(data.air_quality.us_aqi);
            aqiEl.innerText = aqi;
            let label = 'Good';
            if (aqi > 150) label = 'Unhealthy';
            else if (aqi > 100) label = 'Sensitive';
            else if (aqi > 50) label = 'Moderate';
            aqiTextEl.innerText = label;
        } else {
            aqiEl.innerText = 'Good';
            aqiTextEl.innerText = 'Clean air';
        }
    }

    // Sunrise/Sunset
    if (daily && daily.sunrise && daily.sunrise.length > 0 && daily.sunset && daily.sunset.length > 0) {
        document.getElementById('val-sunrise').innerText = formatTime(daily.sunrise[0], currentCityTimezone);
        document.getElementById('val-sunset').innerText = formatTime(daily.sunset[0], currentCityTimezone);
    }

    document.getElementById('weather-icon').innerText = conditionData.icon;

    // Humidity progress bar
    const fill = document.getElementById('humidity-fill');
    if (fill) fill.style.width = `${current.relative_humidity_2m}%`;

    // Dynamic Theme Classes
    document.body.className = `weather-${conditionData.cssClass}`;

    // Update Favorite Star
    updateFavoriteStar(cityName);

    // Update Forecasts
    updateHourly(data.hourly);
    updateForecast(daily);
    initWeatherAnimation(conditionData.condition);
}

function updateHourly(hourly) {
    const container = document.getElementById('hourly-list');
    if (!container || !hourly || !hourly.time || !hourly.temperature_2m) return;
    container.innerHTML = '';

    const currentIso = new Date().toISOString().slice(0, 13);
    let startIndex = hourly.time.findIndex(t => t.startsWith(currentIso));
    if (startIndex < 0) startIndex = 0;

    const count = Math.min(24, hourly.time.length - startIndex);
    for (let i = 0; i < count; i++) {
        const index = startIndex + i;
        const timeStr = hourly.time[index];
        const date = new Date(timeStr);
        const hourLabel = i === 0 ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
        const temp = formatTemp(hourly.temperature_2m[index]);
        const isDay = hourly.is_day ? hourly.is_day[index] === 1 : true;
        const weatherCode = hourly.weather_code ? hourly.weather_code[index] : 0;
        const { icon } = mapWeatherCode(weatherCode, isDay);

        const item = document.createElement('div');
        item.className = 'hourly-item';
        item.innerHTML = `
            <span class="h-time">${hourLabel}</span>
            <span class="h-icon">${icon}</span>
            <span class="h-temp">${temp}°</span>
        `;
        container.appendChild(item);
    }
}

function updateForecast(daily) {
    const container = document.getElementById('forecast-list');
    if (!container || !daily || !daily.time || !daily.weather_code) return;
    container.innerHTML = '';

    for (let i = 1; i < Math.min(daily.time.length, 8); i++) {
        const dateStr = daily.time[i];
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
        const maxTemp = formatTemp(daily.temperature_2m_max[i]);
        const minTemp = daily.temperature_2m_min ? formatTemp(daily.temperature_2m_min[i]) : null;

        const weatherCode = daily.weather_code[i];
        const { icon } = mapWeatherCode(weatherCode, true);

        container.innerHTML += `
            <div class="forecast-day">
                <span class="day">${dayName}</span>
                <span class="f-icon">${icon}</span>
                <span class="f-temp">${maxTemp}°</span>
                ${minTemp !== null ? `<span style="font-size: 0.75rem; color: var(--text-dim); display: block;">${minTemp}°</span>` : ''}
            </div>`;
    }
}

// 6. FAVORITES MANAGEMENT
async function loadFavorites() {
    let favorites = [];
    if (API_BASE_URL) {
        try {
            const resp = await fetch(`${API_BASE_URL}/favorites`);
            if (resp.ok) {
                const data = await resp.json();
                favorites = data.favorites || [];
            }
        } catch (e) {
            console.warn("Backend favorites error, using localStorage fallback:", e);
        }
    }

    if (favorites.length === 0) {
        try {
            favorites = JSON.parse(localStorage.getItem('stratos_favorites') || localStorage.getItem('skycast_favorites') || '[]');
        } catch (e) {
            favorites = [];
        }
    }

    if (favorites.length === 0) {
        favorites = [
            { name: "Mumbai", country: "India", lat: 19.076, lon: 72.8777 },
            { name: "Tokyo", country: "Japan", lat: 35.6895, lon: 139.6917 },
            { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
            { name: "New York", country: "United States", lat: 40.7128, lon: -74.0060 }
        ];
    }

    userFavorites = favorites;
    renderFavoritesBar();
}

function renderFavoritesBar() {
    if (!favoritesBar) return;
    favoritesBar.innerHTML = '';

    userFavorites.forEach(fav => {
        const chip = document.createElement('button');
        chip.className = 'fav-chip';
        chip.innerHTML = `<span>★</span> <span>${fav.name}</span>`;
        chip.addEventListener('click', () => {
            if (fav.lat && fav.lon) {
                updateWeather(fav.lat, fav.lon, fav.name, fav.country);
            } else {
                fetchWeatherByCity(fav.name);
            }
        });
        favoritesBar.appendChild(chip);
    });
}

function updateFavoriteStar(cityName) {
    if (!btnFavorite) return;
    const isFav = userFavorites.some(f => f.name.toLowerCase() === cityName.toLowerCase());
    btnFavorite.innerText = isFav ? '★' : '☆';
    btnFavorite.classList.toggle('active', isFav);
}

async function toggleCurrentFavorite() {
    const cityName = currentCityMeta.name;
    if (!cityName || cityName === 'Loading...') return;

    const existingIndex = userFavorites.findIndex(f => f.name.toLowerCase() === cityName.toLowerCase());

    if (existingIndex >= 0) {
        // Remove
        userFavorites.splice(existingIndex, 1);
        if (API_BASE_URL) {
            fetch(`${API_BASE_URL}/favorites/${encodeURIComponent(cityName)}`, { method: 'DELETE' }).catch(() => {});
        }
    } else {
        // Add
        const newFav = {
            name: currentCityMeta.name,
            country: currentCityMeta.country,
            lat: currentCityMeta.lat,
            lon: currentCityMeta.lon
        };
        userFavorites.unshift(newFav);
        if (API_BASE_URL) {
            fetch(`${API_BASE_URL}/favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFav)
            }).catch(() => {});
        }
    }

    localStorage.setItem('stratos_favorites', JSON.stringify(userFavorites));
    updateFavoriteStar(cityName);
    renderFavoritesBar();
}

// 7. AUTOCOMPLETE LOGIC
cityInput.addEventListener('input', debounce(async function () {
    const val = this.value.trim();
    hideError();
    closeAllLists();
    if (!val || val.length < 2) return false;
    currentFocus = -1;

    if (searchCache.has(val)) {
        renderSuggestions(searchCache.get(val), val);
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
            } catch (err) {}
        }

        if (results.length === 0) {
            const response = await fetch(`${GEOCODING_BASE}/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`);
            const data = await response.json();
            results = data.results || [];
        }

        if (results.length > 0) {
            searchCache.set(val, results);
            renderSuggestions(results, val);
        }
    } catch (e) {
        console.error("Geocoding error:", e);
    }
}, 300));

function renderSuggestions(matches, val) {
    if (matches.length > 0) {
        listContainer.style.display = 'block';
        listContainer.innerHTML = '';
        matches.forEach(match => {
            const item = document.createElement("div");
            item.className = "suggestion-item";

            const regex = new RegExp(`(${val})`, "gi");
            const highlightedName = match.name.replace(regex, '<span class="highlight">$1</span>');

            item.innerHTML = `<span>${highlightedName}</span><span class="country-code">${match.country || ''}</span>`;

            item.addEventListener("click", () => {
                cityInput.value = match.name;
                updateWeather(match.latitude, match.longitude, match.name, match.country);
                closeAllLists();
                cityInput.value = "";
            });

            listContainer.appendChild(item);
        });
    }
}

cityInput.addEventListener("keydown", function (e) {
    let items = listContainer.getElementsByClassName("suggestion-item");
    if (e.keyCode == 40) { // DOWN
        currentFocus++;
        addActive(items);
    } else if (e.keyCode == 38) { // UP
        currentFocus--;
        addActive(items);
    } else if (e.keyCode == 13) { // ENTER
        e.preventDefault();
        if (currentFocus > -1) {
            if (items[currentFocus]) items[currentFocus].click();
        } else {
            if (this.value) {
                fetchWeatherByCity(this.value);
                closeAllLists();
                this.value = "";
            }
        }
    }
});

function addActive(items) {
    if (!items || items.length === 0) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (items.length - 1);
    items[currentFocus].classList.add("active");
    items[currentFocus].scrollIntoView({ block: "nearest" });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) items[i].classList.remove("active");
}

function closeAllLists() {
    listContainer.innerHTML = '';
    listContainer.style.display = 'none';
}

document.addEventListener("click", (e) => {
    if (e.target !== cityInput) closeAllLists();
});

// 8. HELPERS & WEATHER ANIMATIONS
function mapWeatherCode(code, isDay) {
    let condition = "Sunny";
    let icon = "☀️";
    let cssClass = "sunny";

    if (code === 0 || code === 1) {
        condition = isDay ? "Sunny" : "Clear";
        icon = isDay ? "☀️" : "🌙";
        cssClass = "sunny";
    } else if (code === 2 || code === 3 || code === 45 || code === 48) {
        condition = "Cloudy";
        icon = "☁️";
        cssClass = "cloudy";
    } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
        condition = "Rain";
        icon = "🌧️";
        cssClass = "rain";
    } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
        condition = "Snow";
        icon = "❄️";
        cssClass = "snow";
    } else if ([95, 96, 99].includes(code)) {
        condition = "Storm";
        icon = "⛈️";
        cssClass = "storm";
    }

    return { condition, icon, cssClass };
}

function formatTime(isoString, timeZone) {
    const date = new Date(isoString);
    const options = { hour: '2-digit', minute: '2-digit' };
    if (timeZone) {
        try { options.timeZone = timeZone; } catch (e) {}
    }
    return date.toLocaleTimeString([], options);
}

function showError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.style.display = 'block';
        setTimeout(() => errorElement.style.display = 'none', 3000);
    }
}

function hideError() {
    const errorElement = document.getElementById('error-message');
    if (errorElement) errorElement.style.display = 'none';
}

function recordSearchHistory(name, country, lat, lon) {
    if (!API_BASE_URL || !name) return;
    fetch(`${API_BASE_URL}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, country, lat, lon })
    }).catch(() => {});
}

function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let start = parseInt(obj.innerText) || 0;
    if (isNaN(start)) start = 0;

    const duration = 800;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
}

function initWeatherAnimation(condition) {
    cancelAnimationFrame(animationId);
    particles = [];
    resize();

    if (condition === "Rain") {
        for (let i = 0; i < 140; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                l: Math.random() * 20 + 10,
                s: Math.random() * 8 + 12
            });
        }
    } else if (condition === "Storm") {
        for (let i = 0; i < 180; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                l: Math.random() * 25 + 15,
                s: Math.random() * 12 + 15
            });
        }
    } else if (condition === "Snow") {
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 3 + 1,
                s: Math.random() * 1.5 + 0.8
            });
        }
    } else if (condition === "Sunny" || condition === "Clear") {
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2.5 + 1,
                s: Math.random() * 0.4 + 0.2,
                alpha: Math.random() * 0.4 + 0.2
            });
        }
    } else if (condition === "Cloudy") {
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 35 + 20,
                s: Math.random() * 0.3 + 0.1,
                alpha: Math.random() * 0.05 + 0.02
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (particles.length > 0) {
            if (condition === "Rain" || condition === "Storm") {
                ctx.strokeStyle = condition === "Storm" ? 'rgba(216, 180, 254, 0.45)' : 'rgba(255,255,255,0.4)';
                ctx.lineWidth = condition === "Storm" ? 1.5 : 1;
                particles.forEach(p => {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x, p.y + p.l);
                    ctx.stroke();
                    p.y += p.s;
                    if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
                });
            } else if (condition === "Snow") {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                particles.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                    p.y += p.s;
                    p.x += Math.sin(p.y * 0.02) * 0.5;
                    if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
                });
            } else if (condition === "Sunny" || condition === "Clear") {
                particles.forEach(p => {
                    ctx.fillStyle = `rgba(255, 220, 140, ${p.alpha})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                    p.y -= p.s;
                    if (p.y < 0) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
                });
            } else if (condition === "Cloudy") {
                particles.forEach(p => {
                    ctx.fillStyle = `rgba(200, 220, 240, ${p.alpha})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                    p.x += p.s;
                    if (p.x > canvas.width + 50) { p.x = -50; p.y = Math.random() * canvas.height; }
                });
            }
        }
        animationId = requestAnimationFrame(draw);
    }
    draw();
}

function setupHorizontalScroll(containerId, leftBtnId, rightBtnId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Arrow buttons
    if (leftBtnId) {
        const leftBtn = document.getElementById(leftBtnId);
        if (leftBtn) {
            leftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                el.scrollBy({ left: -260, behavior: 'smooth' });
            });
        }
    }
    if (rightBtnId) {
        const rightBtn = document.getElementById(rightBtnId);
        if (rightBtn) {
            rightBtn.addEventListener('click', (e) => {
                e.preventDefault();
                el.scrollBy({ left: 260, behavior: 'smooth' });
            });
        }
    }

    // Convert mouse wheel to horizontal scrolling
    el.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            el.scrollLeft += e.deltaY * 1.5;
        }
    }, { passive: false });

    // Click & drag to scroll
    let isDown = false;
    let startX;
    let scrollLeft;

    el.addEventListener('mousedown', (e) => {
        isDown = true;
        el.classList.add('grabbing');
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
    });

    el.addEventListener('mouseleave', () => {
        isDown = false;
        el.classList.remove('grabbing');
    });

    el.addEventListener('mouseup', () => {
        isDown = false;
        el.classList.remove('grabbing');
    });

    el.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1.8;
        el.scrollLeft = scrollLeft - walk;
    });
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

initApp();
