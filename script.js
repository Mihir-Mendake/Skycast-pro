// 1. API CONFIGURATION
const USE_LOCAL_BACKEND = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = USE_LOCAL_BACKEND
    ? 'http://localhost:5000/api'
    : null; // Will use direct API calls

// Open-Meteo API endpoints (for production)
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

// 2. INITIALIZATION
function initApp() {
    window.addEventListener('resize', resize);
    resize();

    // Try to get user's location, otherwise default to a major city
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Reverse geocoding to get city name is optional but nice for UI
                // We'll just fetch weather directly for these coords and let the API resolve the timezone
                // To get the city name, we'd need another API call, or we can just show "My Location"
                // For now, let's try to reverse geocode with a small trick or just fetch weather
                updateWeather(latitude, longitude, "My Location");
            },
            (error) => {
                console.warn("Geolocation denied or failed:", error);
                fetchWeatherByCity("New York"); // Default fallback
            }
        );
    } else {
        fetchWeatherByCity("New York");
    }

    startTime();
}

function startTime() {
    const update = () => {
        const now = new Date();
        document.getElementById('current-time').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('current-date').innerText = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    };
    update();
    setInterval(update, 60000);
}

// 3. CORE WEATHER ENGINE
async function fetchWeatherByCity(cityName) {
    try {
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
        // Updated URL: Added visibility to current, and weather_code to daily
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

    // Map WMO Weather Codes to UI conditions
    const conditionData = mapWeatherCode(weatherCode, isDay);

    // Basic fields
    animateValue("main-temp", Math.round(current.temperature_2m));
    document.getElementById('city-name').innerText = cityName;
    document.getElementById('condition-text').innerText = conditionData.condition;
    document.getElementById('val-humidity').innerText = `${current.relative_humidity_2m}%`;
    document.getElementById('val-wind').innerText = `${Math.round(current.wind_speed_10m)} km/h`;

    // UV Index (Using Daily Max as a proxy for 'today's UV' since instantaneous UV is complex)
    const uvIndex = daily.uv_index_max && daily.uv_index_max.length > 0 ? Math.round(daily.uv_index_max[0]) : 0;
    document.getElementById('val-uv').innerText = uvIndex;

    // Visibility (API returns meters, convert to km)
    const visibilityKm = current.visibility ? (current.visibility / 1000).toFixed(1) : 10;
    const visEl = document.getElementById('val-visibility');
    if (visEl) visEl.innerText = `${visibilityKm} km`;

    // Feels Like
    const feelsLike = current.apparent_temperature ? Math.round(current.apparent_temperature) : Math.round(current.temperature_2m);
    const feelsEl = document.getElementById('feels-like');
    if (feelsEl) feelsEl.innerText = `${feelsLike}°`;

    // Formatting Sunrise/Sunset
    if (daily.sunrise.length > 0 && daily.sunset.length > 0) {
        document.getElementById('val-sunrise').innerText = formatTime(daily.sunrise[0]);
        document.getElementById('val-sunset').innerText = formatTime(daily.sunset[0]);
    }

    document.getElementById('weather-icon').innerText = conditionData.icon;

    // Update Progress Bar
    const fill = document.getElementById('humidity-fill');
    if (fill) fill.style.width = `${current.relative_humidity_2m}%`;

    document.body.className = `weather-${conditionData.cssClass}`;

    updateForecast(daily);
    initWeatherAnimation(conditionData.condition);
}

function mapWeatherCode(code, isDay) {
    // Ref: https://open-meteo.com/en/docs
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 71, 73, 75: Snow
    // 95, 96, 99: Thunderstorm

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

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

// 4. AUTOCOMPLETE LOGIC (API Based)
cityInput.addEventListener('input', debounce(async function () {
    const val = this.value;
    hideError(); // Clear error when typing starts
    closeAllLists();
    if (!val || val.length < 2) return false;
    currentFocus = -1;

    // Check cache
    if (searchCache.has(val)) {
        renderSuggestions(searchCache.get(val), val);
        return;
    }

    try {
        const response = await fetch(`${GEOCODING_BASE}/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`);
        const data = await response.json();

        if (data.results) {
            searchCache.set(val, data.results);
            renderSuggestions(data.results, val);
        }
    } catch (e) {
        console.error("Geocoding error:", e);
    }
}, 300));

function renderSuggestions(matches, val) {
    if (matches.length > 0) {
        listContainer.style.display = 'block';
        matches.forEach(match => {
            const item = document.createElement("div");
            item.className = "suggestion-item";

            // Basic highlighting (case insensitive check)
            const regex = new RegExp(`(${val})`, "gi");
            const highlightedName = match.name.replace(regex, '<span class="highlight">$1</span>');

            item.innerHTML = `<span>${highlightedName}</span><span class="country-code">${match.country || ''}</span>`;

            item.addEventListener("click", () => {
                cityInput.value = match.name;
                updateWeather(match.latitude, match.longitude, match.name, match.country);
                closeAllLists();
                cityInput.value = ""; // Clear input after selection
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
            // Only search if there's a value to prevents accidental empty searches
            if (this.value) {
                fetchWeatherByCity(this.value);
                closeAllLists();
                this.value = "";
            }
        }
    }
});

function addActive(items) {
    if (!items) return false;
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
    // Don't animate if NaN (fetching new data)
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

    // We will show next 5 days
    if (!daily || !daily.time || !daily.weather_code) return;

    for (let i = 1; i < Math.min(daily.time.length, 8); i++) {
        const dateStr = daily.time[i];
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
        const maxTemp = Math.round(daily.temperature_2m_max[i]);

        // This line was crashing before because daily.weather_code was missing
        const weatherCode = daily.weather_code[i];
        const { icon } = mapWeatherCode(weatherCode, true);

        container.innerHTML += `
            <div class="forecast-day">
                <span class="day">${dayName}</span>
                <span class="f-icon">${icon}</span>
                <span class="f-temp">${maxTemp}°</span>
            </div>`;
    }
}

function initWeatherAnimation(condition) {
    cancelAnimationFrame(animationId);
    particles = [];
    resize();
    if (condition === "Rain" || condition === "Storm") {
        for (let i = 0; i < 150; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, l: Math.random() * 20, s: Math.random() * 10 + 10 });
    } else if (condition === "Snow") {
        for (let i = 0; i < 100; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 3 + 1, s: Math.random() * 2 + 1 });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (particles.length > 0) {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1;
            particles.forEach(p => {
                if (condition === "Rain" || condition === "Storm") {
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.l); ctx.stroke();
                    p.y += p.s; if (p.y > canvas.height) p.y = -20;
                } else if (condition === "Snow") {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                    p.y += p.s; if (p.y > canvas.height) p.y = -10;
                }
            });
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
