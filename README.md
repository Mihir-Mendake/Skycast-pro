# ☀️ SkyCast Pro - Immersive Weather App

SkyCast Pro is a polished web-based weather dashboard built with vanilla HTML, CSS, and JavaScript. It shows live weather, a 7-day forecast, animated weather backgrounds, and a sleek glassmorphism interface.

![SkyCast Pro](https://img.shields.io/badge/Weather-App-blue?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## ✨ What it does

- Displays current weather for any city worldwide
- Shows a 7-day weather forecast with icons
- Updates UI theme based on current weather conditions
- Supports autocomplete search with keyboard navigation
- Includes animated canvas effects for rain, snow, and storms
- Uses Open-Meteo APIs without requiring an API key

## 🚀 Quick Start

### Run locally

1. Open the project folder.
2. Launch `index.html` directly in your browser.
3. Or use a local server for best results:

```powershell
cd "d:\HACKATON\weather app new changes"
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Search and use

- Type a city name into the search box.
- Choose from suggestions.
- Press Enter or click a suggestion.
- The dashboard updates with weather, humidity, wind, UV index, visibility, sunrise/sunset, and forecast.

## 🧩 Features

- Current temperature and feels-like temperature
- Humidity progress bar
- Wind speed display
- UV index indicator
- Visibility in kilometers
- Sunrise and sunset times
- Animated weather background effects
- Responsive layout for desktop and mobile

## 📁 Project structure

```
weather-app/
├── index.html   # App layout and structure
├── style.css    # Theme, layout, and animations
├── script.js    # Weather logic and UI interactions
├── README.md    # Project documentation
└── .gitignore   # Local development ignores
```

## 🔧 Technical details

### APIs used

- `https://api.open-meteo.com/v1/forecast` for weather data
- `https://geocoding-api.open-meteo.com/v1/search` for city search

### Built with

- Vanilla JavaScript (ES6+)
- HTML5
- CSS3 (Grid, Flexbox, custom properties)
- Canvas API for animation effects

## 📝 Notes

- Geolocation is optional: when allowed, the app attempts to detect the user location.
- If location permission is denied, it defaults to New York.
- No API key is required for the weather API.

## 🛠️ Troubleshooting

**City not found**
- Check spelling.
- Try adding the country name (example: `Paris, France`).

**No weather data**
- Confirm internet access.
- Check browser console for errors.

**Geolocation fails**
- Make sure the page is served over HTTPS or localhost.
- Accept location permission in the browser.

## 🌟 Suggestions

To make the app even better, consider adding:

- offline caching for repeat visits
- weather icons instead of emoji
- animations for more weather types
- a dark/light mode switch
- a performance loading indicator

## 📌 License

Use and modify freely for personal or learning projects.
- 🖥️ Desktops (1440px+)

## 🚧 Known Limitations

- UV Index shows daily maximum (not real-time instantaneous)
- Geolocation requires HTTPS in production
- Weather animations may impact battery on mobile devices
- Cache duration is fixed at 5 minutes

## 🔮 Future Enhancements

Potential features for future versions:
- [ ] Hourly weather forecast
- [ ] Weather alerts and notifications
- [ ] Historical weather data
- [ ] Air quality index
- [ ] Weather maps and radar
- [ ] Favorite cities list
- [ ] Unit conversion (Celsius/Fahrenheit)
- [ ] Dark/Light mode toggle
- [ ] PWA (Progressive Web App) support
- [ ] Multiple language support

## 📄 License

This project is free to use for personal and educational purposes.

## 🙏 Credits

- **Weather Data**: [Open-Meteo API](https://open-meteo.com/)
- **Fonts**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) by Google Fonts
- **Icons**: Weather emojis (Unicode standard)
- **Design**: Custom glassmorphism design

## 📧 Support

If you encounter any issues or have questions:
1. Check the Troubleshooting section above
2. Review browser console for error messages
3. Ensure you're using a modern, updated browser
4. Check your internet connection

## 🌟 Acknowledgments

Built with modern web technologies and best practices for a smooth, immersive weather experience.

---

**Enjoy using SkyCast Pro! 🌤️**

For updates and improvements, check back regularly.

Author
Mihir Mendake

GitHub: https://github.com/Mihir-Mendake
