# ☀️ SkyCast Pro - Full-Stack Immersive Weather Application

SkyCast Pro is a modern, full-stack weather dashboard built with a **Node.js/Express** backend and a responsive glassmorphism frontend (HTML5, CSS3, JavaScript ES6+). It provides real-time weather analytics, 24-hour hourly forecasts, 7-day outlooks, air quality index (AQI), persistent bookmarks/favorites, unit switching (°C / °F), dynamic condition themes, and canvas weather particle animations.

![SkyCast Pro](https://img.shields.io/badge/Weather-Full--Stack%20App-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v24+-green?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

---

## 🌟 Highlights & Key Features

- **Full-Stack Architecture**: Express.js server providing a unified API layer, caching, and static asset hosting.
- **24-Hour Hourly Forecast**: Interactive horizontal scroll strip displaying upcoming hourly weather and icons.
- **7-Day Extended Forecast**: Daily minimum/maximum temperatures and weather state icons.
- **Air Quality & Atmospheric Metrics**: Real-time US AQI status, UV index, barometric pressure (hPa), humidity, visibility, and wind speeds.
- **Unit Toggle (°C / °F)**: Instant Celsius and Fahrenheit switching across temperature, wind (km/h vs mph), and visibility (km vs mi).
- **Persistent Favorites**: Save and access bookmarked cities across sessions via `/api/favorites` and quick-select chips.
- **Dynamic Condition Themes**: 5 adaptive CSS themes (Sunny, Cloudy, Rain, Snow, Storm) that automatically adjust palettes and glow accents.
- **Animated Weather Canvas**: Weather-responsive canvas particle engine for rain, snow, storms, sunny sun motes, and misty clouds.
- **Accurate City Local Time**: Synchronizes clock to the queried city's exact timezone offset.
- **Server Caching**: In-memory caching on the backend to reduce external API load and prevent rate limits.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
For auto-reloading during development:
```bash
npm run dev
```

### 3. Open in Browser
Navigate to **`http://localhost:5000`** in any web browser.

---

## 🏗️ Project Architecture

```
weather-app/
├── server/
│   ├── server.js               # Express application entry point & static file hosting
│   └── routes/
│       ├── weather.js          # Weather, geocoding & air quality proxy with in-memory caching
│       └── favorites.js        # Persistent favorites & search history endpoints
├── data/
│   ├── favorites.json          # Stored favorite cities
│   └── history.json            # Recent searches
├── index.html                  # Semantic UI structure & glassmorphism layout
├── style.css                   # Glassmorphism styling, animations, and weather themes
├── script.js                   # Client controller, API client, canvas particle engine
├── package.json                # Project dependencies and npm scripts
├── .env.example                # Environment variable configuration template
└── README.md                   # Project documentation
```

---

## 📡 Backend API Reference

### 1. Weather Data Endpoint
`GET /api/weather`
- **Query Parameters**:
  - `city` (string, optional) - City name to geocode and fetch (e.g. `?city=Tokyo`)
  - `lat` (number) & `lon` (number) - Direct coordinates (e.g. `?lat=35.68&lon=139.69`)
- **Response**: Aggregated weather payload including current conditions, daily 7-day forecast, hourly forecast, and air quality index.

### 2. City Autocomplete Search
`GET /api/search?q=:query`
- Returns up to 5 matching global locations with latitude, longitude, and country codes. Cached for fast response times.

### 3. User Favorites
- `GET /api/favorites` — List all bookmarked cities.
- `POST /api/favorites` — Save a city (`{ name, country, lat, lon }`).
- `DELETE /api/favorites/:name` — Remove a city from favorites.

### 4. Search History
- `GET /api/history` — Get last 10 searched locations.
- `POST /api/history` — Record a location search.

### 5. Health Check
`GET /api/health`
- Server health status and uptime timestamp.

---

## 🛠️ Tech Stack & APIs

- **Backend Runtime**: Node.js & Express.js
- **Weather Provider**: [Open-Meteo API](https://open-meteo.com/) (Forecast & Air Quality)
- **Geocoding Provider**: Open-Meteo Geocoding API
- **Typography**: Google Fonts (*Plus Jakarta Sans*)
- **Rendering**: HTML5 Canvas 2D API for particle simulations
- **Design System**: Glassmorphism with CSS custom properties

---

## 📄 License
MIT License. Free to use and build upon for hackathons, personal, and educational projects.
