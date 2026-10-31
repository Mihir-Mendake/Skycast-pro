// 1. API CONFIGURATION
const USE_LOCAL_BACKEND = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = USE_LOCAL_BACKEND ? '/api' : null;

// Open-Meteo API endpoints (fallback if backend is offline or opened via file://)
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1';

// Performance optimization
let searchCache = new Map();
let weatherCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const canvas = document.getElementById('weather-canvas');
const ctx = canvas.getContext('2d');
const cityInput = document.getElementById('city-input');
const listContainer = document.getElementById('autocomplete-list');
let particles = [];
let animationId;
let currentFocus = -1;
let currentCityTimezone = null;

// 2. INITIALIZATION
function initApp() {
    window.addEventListener('resize', resize);
    resize();

    // Try geolocation first, otherwise fallback to New York
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

// 3. CORE WEATHER ENGINE
async function fetchWeatherByCity(cityName) {
    try {
        // Try backend first if available
        if (API_BASE_URL) {
            try {
                const resp = await fetch(`${API_BASE_URL}/weather?city=${encodeURIComponent(cityName)}`);
                if (resp.ok) {
                    const data = await resp.json();
                    const name = (data.location && data.location.name) || cityName;
                    const country = (data.location && data.location.country) || '';
                    renderWeather(data, name, country);
                    recordSearchHistory(name, country, data.location?.latitude, data.location?.longitude);
                    return;
                }
            } catch (backendErr) {
                console.warn("Backend /api/weather unavailable, falling back to direct API:", backendErr);
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
            renderWeather(cached.data, cityName, country);
            return;
        }
    }

    try {
        // Try backend first
        if (API_BASE_URL) {
            try {
                const resp = await fetch(`${API_BASE_URL}/weather?lat=${lat}&lon=${lon}`);
                if (resp.ok) {
                    const data = await resp.json();
                    weatherCache.set(cacheKey, { timestamp: now, data });
                    const resolvedName = (data.location && data.location.name) || cityName;
                    const resolvedCountry = (data.location && data.location.country) || country;
                    renderWeather(data, resolvedName, resolvedCountry);
                    hideError();
                    recordSearchHistory(resolvedName, resolvedCountry, lat, lon);
                    return;
                }
            } catch (backendErr) {
                console.warn("Backend unavailable, falling back to direct API:", backendErr);
            }
        }

        // Direct Open-Meteo fallback
        const weatherUrl = `${OPEN_METEO_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,visibility&daily=weather_code,sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;

        const response = await fetch(weatherUrl);
        const data = await response.json();

        weatherCache.set(cacheKey, { timestamp: now, data: data });
        renderWeather(data, cityName, country);
        hideError();

    } catch (error) {
        console.error("Error fetching weather:", error);
        showError();
    }
}

function renderWeather(data, cityName, country) {
    const current = data.current;
    const daily = data.daily;
    const weatherCode = current.weather_code;
    const isDay = current.is_day === 1;

    // Set timezone for city clock
    if (data.timezone) {
        currentCityTimezone = data.timezone;
        updateClock();
    }

    // Map WMO Weather Codes to UI conditions
    const conditionData = mapWeatherCode(weatherCode, isDay);

    // Basic fields
    animateValue("main-temp", Math.round(current.temperature_2m));
    const cityTitle = country ? `${cityName}, ${country}` : cityName;
    document.getElementById('city-name').innerText = cityTitle;
    document.getElementById('condition-text').innerText = conditionData.condition;
    document.getElementById('val-humidity').innerText = `${current.relative_humidity_2m}%`;
    document.getElementById('val-wind').innerText = `${Math.round(current.wind_speed_10m)} km/h`;

    // UV Index
    const uvIndex = daily.uv_index_max && daily.uv_index_max.length > 0 ? Math.round(daily.uv_index_max[0]) : 0;
    const uvEl = document.getElementById('val-uv');
    if (uvEl) {
        uvEl.innerText = uvIndex;
        const uvCard = uvEl.closest('.info-card');
        const uvSub = uvCard ? uvCard.querySelector('.sub-text') : null;
        if (uvSub) {
            let risk = 'Low';
            if (uvIndex >= 8) risk = 'Very High';
            else if (uvIndex >= 6) risk = 'High';
            else if (uvIndex >= 3) risk = 'Moderate';
            uvSub.innerText = `Risk Level: ${risk}`;
        }
    }

    // Visibility (API returns meters, convert to km)
    const visibilityKm = current.visibility ? (current.visibility / 1000).toFixed(1) : 10;
    const visEl = document.getElementById('val-visibility');
    if (visEl) visEl.innerText = `${visibilityKm} km`;

    // Feels Like
    const feelsLike = current.apparent_temperature ? Math.round(current.apparent_temperature) : Math.round(current.temperature_2m);
    const feelsEl = document.getElementById('feels-like');
    if (feelsEl) feelsEl.innerText = `${feelsLike}°`;

    // Formatting Sunrise/Sunset
    if (daily && daily.sunrise && daily.sunrise.length > 0 && daily.sunset && daily.sunset.length > 0) {
        document.getElementById('val-sunrise').innerText = formatTime(daily.sunrise[0], currentCityTimezone);
        document.getElementById('val-sunset').innerText = formatTime(daily.sunset[0], currentCityTimezone);
    }

    document.getElementById('weather-icon').innerText = conditionData.icon;

    // Update Progress Bar
    const fill = document.getElementById('humidity-fill');
    if (fill) fill.style.width = `${current.relative_humidity_2m}%`;

    // Dynamic Theme Classes
    document.body.className = `weather-${conditionData.cssClass}`;

    updateForecast(daily);
    initWeatherAnimation(conditionData.condition);
}

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

// 4. AUTOCOMPLETE LOGIC (Backend + API Fallback)
cityInput.addEventListener('input', debounce(async function () {
    const val = this.value.trim();
    hideError();
    closeAllLists();
    if (!val || val.length < 2) return false;
    currentFocus = -1;

    // Check client-side cache
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
            } catch (err) {
                console.warn("Backend search failed, trying direct search:", err);
            }
        }

        // Direct search fallback
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

// Keyboard Navigation
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

// 5. UTILITIES & ANIMATION
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

    const duration = 1000;
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
}

function updateForecast(daily) {
    const container = document.getElementById('forecast-list');
    if (!container) return;
    container.innerHTML = '';

    if (!daily || !daily.time || !daily.weather_code) return;

    for (let i = 1; i < Math.min(daily.time.length, 8); i++) {
        const dateStr = daily.time[i];
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[i]) : null;

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
                s: Math.random() * 1.5 + 0.8,
                sway: Math.random() * 2
            });
        }
    } else if (condition === "Sunny" || condition === "Clear") {
        // Floating sun motes
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
        // Drifting ambient mist
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

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

initApp();
