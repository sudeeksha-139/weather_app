/* ==================== WEATHER APP - MAIN SCRIPT ==================== */

// API Configuration - Using Open-Meteo (Free, No API Key Needed!)
const API_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

// DOM Elements
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const themeToggle = document.getElementById("themeToggle");
const tempToggle = document.getElementById("tempToggle");
const refreshBtn = document.getElementById("refreshBtn");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const weatherContent = document.getElementById("weatherContent");
const initialMessage = document.getElementById("initialMessage");
const dateTimeDisplay = document.getElementById("dateTime");
const lastUpdatedDisplay = document.getElementById("lastUpdated");
const suggestionsDropdown = document.getElementById("suggestionsDropdown");
const suggestionsList = document.getElementById("suggestionsList");
const historyList = document.getElementById("historyList");
const tipsContainer = document.getElementById("tipsContainer");
const hourlyContainer = document.getElementById("hourlyContainer");

// State variables
let currentWeatherData = null;
let isFahrenheit = false;
let searchHistory = [];
let map = null;
let mapMarker = null;
let weatherTipsData = [
    { icon: "☔", title: "Carry Umbrella", condition: "rainy" },
    { icon: "😎", title: "Use Sunscreen", condition: "sunny" },
    { icon: "🧥", title: "Wear Warm Clothes", condition: "cold" },
    { icon: "💨", title: "Stay Indoors", condition: "stormy" },
    { icon: "🧢", title: "Wear A Hat", condition: "sunny" },
    { icon: "👕", title: "Light Clothing", condition: "hot" },
    { icon: "🌧️", title: "Watch for Floods", condition: "rainy" },
    { icon: "❄️", title: "Ice on Roads", condition: "snowy" }
];

// City coordinates for landmarks (for auto-suggestions)
const popularCities = [
    // Major Indian Cities 🇮🇳
    "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Jaipur",
    "Ahmedabad", "Lucknow", "Chandigarh", "Kochi", "Indore", "Visakhapatnam", "Surat", "Nagpur",
    "Gurugram", "Bhopal", "Raipur", "Patna", "Vadodara", "Guwahati", "Coimbatore", "Mysore",
    "Shimla", "Manali", "Goa", "Dharamshala", "Dehradun", "Pondicherry", "Guwahati", "Srinagar",
    // International
    "London", "New York", "Tokyo", "Paris", "Dubai", "Sydney", "Toronto",
    "Berlin", "Singapore", "Hong Kong", "Barcelona", "Amsterdam", "Rome",
    "Madrid", "Moscow", "Bangkok", "Istanbul", "Cairo"
];

/* ==================== INITIALIZATION ==================== */
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

function initializeApp() {
    console.log("Initializing Weather Application...");
    
    // Check if Leaflet library is loaded
    if (typeof L === 'undefined') {
        console.error("❌ Leaflet library not loaded! Please check CDN connection.");
        // Retry after a short delay
        setTimeout(initializeApp, 500);
        return;
    }
    
    // Load theme preference
    loadThemePreference();
    
    // Load search history
    loadSearchHistory();
    
    // Update date/time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize map after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeMap();
    }, 100);
    
    // Add event listeners
    searchBtn.addEventListener("click", handleSearch);
    cityInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSearch();
    });
    cityInput.addEventListener("input", handleAutoSuggestions);
    themeToggle.addEventListener("click", toggleTheme);
    tempToggle.addEventListener("click", toggleTemperature);
    refreshBtn.addEventListener("click", handleRefresh);
    
    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
        if (!cityInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
            suggestionsDropdown.classList.remove("active");
        }
    });
}

/* ==================== DATE & TIME SYSTEM ==================== */
function updateDateTime() {
    const now = new Date();
    
    // Format: "Wednesday, Feb 18, 2026 — 07:24 PM"
    const options = {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    };
    
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const formatted = formatter.format(now);
    
    dateTimeDisplay.textContent = formatted.replace(",", " —");
}

/* ==================== THEME TOGGLE ==================== */
function loadThemePreference() {
    const isDark = localStorage.getItem("theme") === "dark";
    if (isDark) {
        document.body.classList.add("dark-mode");
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

/* ==================== TEMPERATURE TOGGLE ==================== */
function toggleTemperature() {
    isFahrenheit = !isFahrenheit;
    tempToggle.querySelector(".temp-unit").textContent = isFahrenheit ? "°F" : "°C";
    
    if (currentWeatherData) {
        updateWeatherDisplay(currentWeatherData);
    }
}

function convertTemp(celsius) {
    if (isFahrenheit) {
        return Math.round((celsius * 9/5) + 32);
    }
    return Math.round(celsius);
}

function getTempUnit() {
    return isFahrenheit ? "°F" : "°C";
}

// Mapping of country names to ISO 3166-1 alpha-2 country codes
const COUNTRY_CODE_MAP = {
    "United Kingdom": "GB", "United States": "US", "Canada": "CA", "Australia": "AU",
    "Japan": "JP", "France": "FR", "Germany": "DE", "Italy": "IT", "Spain": "ES",
    "Netherlands": "NL", "Belgium": "BE", "Switzerland": "CH", "Austria": "AT",
    "Sweden": "SE", "Norway": "NO", "Denmark": "DK", "Finland": "FI", "Poland": "PL",
    "Czech Republic": "CZ", "Hungary": "HU", "Romania": "RO", "Portugal": "PT",
    "Greece": "GR", "Turkey": "TR", "Russia": "RU", "Ukraine": "UA", "China": "CN",
    "India": "IN", "South Korea": "KR", "Thailand": "TH", "Singapore": "SG",
    "Hong Kong": "HK", "Taiwan": "TW", "Malaysia": "MY", "Philippines": "PH",
    "Indonesia": "ID", "Vietnam": "VN", "Brazil": "BR", "Mexico": "MX",
    "Argentina": "AR", "Chile": "CL", "Colombia": "CO", "Peru": "PE",
    "South Africa": "ZA", "Egypt": "EG", "Nigeria": "NG", "Kenya": "KE",
    "United Arab Emirates": "AE", "Saudi Arabia": "SA", "Israel": "IL",
    "Pakistan": "PK", "Bangladesh": "BD", "Sri Lanka": "LK", "Ireland": "IE",
    "New Zealand": "NZ", "Thailand": "TH", "Myanmar": "MM", "Cambodia": "KH",
    "Laos": "LA", "Mongolia": "MN"
};

function getCountryCodeFromName(countryName) {
    if (!countryName) return "";
    
    // Direct lookup
    if (COUNTRY_CODE_MAP[countryName]) {
        return COUNTRY_CODE_MAP[countryName];
    }
    
    // Fuzzy match - check if country name is partially in a key
    for (const [key, code] of Object.entries(COUNTRY_CODE_MAP)) {
        if (key.includes(countryName) || countryName.includes(key)) {
            return code;
        }
    }
    
    return "";
}

/* ==================== WEATHER CODE HELPERS ==================== */
// Convert WMO weather codes to descriptions
function getWeatherDescription(code) {
    const weatherCodes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Foggy",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    };
    return weatherCodes[code] || "Unknown";
}

// Convert WMO weather codes to emoji icons
function getWeatherIcon(code) {
    const iconMap = {
        0: "https://cdn-icons-png.flaticon.com/128/3222/3222684.png", // Clear
        1: "https://cdn-icons-png.flaticon.com/128/3222/3222707.png", // Mainly clear
        2: "https://cdn-icons-png.flaticon.com/128/3222/3222701.png", // Partly cloudy
        3: "https://cdn-icons-png.flaticon.com/128/1779/1779940.png", // Overcast
        45: "https://cdn-icons-png.flaticon.com/128/2530/2530541.png", // Foggy
        48: "https://cdn-icons-png.flaticon.com/128/2530/2530541.png", // Foggy
        51: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Drizzle
        53: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Drizzle
        55: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Drizzle
        61: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Rain
        63: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Rain
        65: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Rain
        71: "https://cdn-icons-png.flaticon.com/128/2913/2913504.png", // Snow
        73: "https://cdn-icons-png.flaticon.com/128/2913/2913504.png", // Snow
        75: "https://cdn-icons-png.flaticon.com/128/2913/2913504.png", // Snow
        80: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Rain showers
        81: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Rain showers
        82: "https://cdn-icons-png.flaticon.com/128/3351/3351979.png", // Rain showers
        85: "https://cdn-icons-png.flaticon.com/128/2913/2913504.png", // Snow showers
        86: "https://cdn-icons-png.flaticon.com/128/2913/2913504.png", // Snow showers
        95: "https://cdn-icons-png.flaticon.com/128/2530/2530514.png", // Thunderstorm
        96: "https://cdn-icons-png.flaticon.com/128/2530/2530514.png", // Thunderstorm
        99: "https://cdn-icons-png.flaticon.com/128/2530/2530514.png"  // Thunderstorm
    };
    
    return iconMap[code] || "https://cdn-icons-png.flaticon.com/128/3222/3222684.png";
}

/* ==================== WEATHER API CALLS ==================== */
async function fetchWeatherByCity(cityName) {
    try {
        showLoader();
        hideError();
        
        console.log(`%c🔍 Searching weather for: ${cityName}`, "color: #3b82f6; font-weight: bold;");
        
        // Step 1: Search for city coordinates
        console.log("%c📡 Step 1: Getting city coordinates...", "color: #8b5cf6;");
        const geoUrl = `${API_BASE_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        console.log("Geo Data:", geoData);
        
        if (!geoData.results || geoData.results.length === 0) {
            showError("❌ City not found. Please try another city name.");
            hideLoader();
            return;
        }
        
        const location = geoData.results[0];
        const { name, country, country_code } = location;
        
        // Explicitly convert to numbers
        let latitude = parseFloat(location.latitude);
        let longitude = parseFloat(location.longitude);
        
        console.log("Raw location data:", { name, country, country_code, lat: location.latitude, lon: location.longitude });
        console.log("Parsed coordinates:", { latitude, longitude, latType: typeof latitude, lonType: typeof longitude });
        
        // Validate coordinates - only use NaN check, not truthiness
        if (isNaN(latitude) || isNaN(longitude)) {
            console.error("❌ Invalid coordinates detected:", { latitude, longitude, isLatNaN: isNaN(latitude), isLonNaN: isNaN(longitude) });
            showError("❌ Invalid location coordinates. Please try again.");
            hideLoader();
            return;
        }
        
        console.log("Location found:", { name, country, country_code, latitude, longitude });
        
        // Step 2: Fetch weather data for coordinates
        console.log("%c📡 Step 2: Getting weather data...", "color: #8b5cf6;");
        const weatherUrl = `${WEATHER_API_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,pressure_msl,cloud_cover,weather_code&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        console.log("Weather Data:", weatherData);
        
        if (!weatherData.current) {
            showError("❌ Could not fetch weather data. Please try again.");
            hideLoader();
            return;
        }
        
        // Format data like Weatherstack for compatibility
        // Final validation before creating formatted data
        console.log("Final coordinate check before display:", { latitude, longitude, latValid: !isNaN(latitude), lonValid: !isNaN(longitude) });
        
        const formattedData = {
            location: {
                name: name,
                country: country,
                country_code: country_code || "",
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude)
            },
            current: {
                temperature: Math.round(weatherData.current.temperature_2m),
                feelslike: Math.round(weatherData.current.temperature_2m), // Approximation
                humidity: weatherData.current.relative_humidity_2m,
                wind_speed: Math.round(weatherData.current.wind_speed_10m),
                pressure: Math.round(weatherData.current.pressure_msl),
                visibility: 10, // Default visibility
                weather_descriptions: [getWeatherDescription(weatherData.current.weather_code)],
                weather_icons: [getWeatherIcon(weatherData.current.weather_code)],
                observation_time: new Date().toISOString()
            }
        };
        
        console.log("%c✅ Data received successfully!", "color: green; font-weight: bold;");
        console.log("Final data before display:", formattedData);
        currentWeatherData = formattedData;
        
        // Double check coordinates are valid before updating display
        const finalLat = parseFloat(formattedData.location.latitude);
        const finalLon = parseFloat(formattedData.location.longitude);
        console.log("Coordinates about to be used:", { finalLat, finalLon, finalLatValid: !isNaN(finalLat), finalLonValid: !isNaN(finalLon) });
        
        updateWeatherDisplay(formattedData);
        addToSearchHistory(name, country);
        
        if (!isNaN(finalLat) && !isNaN(finalLon)) {
            updateMap(finalLat, finalLon, name);
        } else {
            console.error("Skipping map update due to invalid coordinates:", { finalLat, finalLon });
        }
        hideLoader();
        
    } catch (error) {
        console.error("Fetch error:", error);
        showError(`❌ Failed to fetch weather.\n\nError: ${error.message}`);
        hideLoader();
    }
}

async function fetchWeatherByCoordinates(latitude, longitude) {
    try {
        showLoader();
        hideError();
        
        // CRITICAL: Convert coordinates to numbers immediately
        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);
        
        console.log(`%c🗺️ Fetching weather for coordinates: ${latitude}, ${longitude}`, "color: #3b82f6; font-weight: bold;");
        console.log("Parsed geolocation coordinates:", { latitude, longitude, latType: typeof latitude, lonType: typeof longitude });
        
        // Validate coordinates FIRST before any API calls - only check NaN, not truthiness
        if (isNaN(latitude) || isNaN(longitude) || latitude === null || longitude === null) {
            console.error("❌ Invalid geolocation coordinates:", { latitude, longitude });
            showError("❌ Unable to get your location. Please search for a city instead.");
            hideLoader();
            return;
        }
        
        // Step 1: Get city name from coordinates (reverse geocoding)
        console.log("%c📡 Step 1: Getting city name...", "color: #8b5cf6;");
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();
        
        const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.county || "Your Location";
        const country = geoData.address?.country || "Unknown";
        const countryCode = getCountryCodeFromName(country);
        
        console.log("Location found:", { cityName, country, countryCode, latitude, longitude });
        
        // Step 2: Fetch weather data
        console.log("%c📡 Step 2: Getting weather data...", "color: #8b5cf6;");
        const weatherUrl = `${WEATHER_API_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,pressure_msl,cloud_cover,weather_code&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();
        
        console.log("Weather Data:", weatherData);
        
        if (!weatherData.current) {
            showError("❌ Could not fetch weather data. Please try again.");
            hideLoader();
            return;
        }
        
        // Format data
        const formattedData = {
            location: {
                name: cityName,
                country: country,
                country_code: countryCode,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude)
            },
            current: {
                temperature: Math.round(weatherData.current.temperature_2m),
                feelslike: Math.round(weatherData.current.temperature_2m),
                humidity: weatherData.current.relative_humidity_2m,
                wind_speed: Math.round(weatherData.current.wind_speed_10m),
                pressure: Math.round(weatherData.current.pressure_msl),
                visibility: 10,
                weather_descriptions: [getWeatherDescription(weatherData.current.weather_code)],
                weather_icons: [getWeatherIcon(weatherData.current.weather_code)],
                observation_time: new Date().toISOString()
            }
        };
        
        console.log("%c✅ Data received successfully!", "color: green; font-weight: bold;");
        console.log("Final coords check - before display:", { latitude, longitude, latValid: !isNaN(latitude), lonValid: !isNaN(longitude) });
        currentWeatherData = formattedData;
        updateWeatherDisplay(formattedData);
        addToSearchHistory(cityName, country);
        
        // Final validation before map update
        if (!isNaN(latitude) && !isNaN(longitude)) {
            updateMap(latitude, longitude, cityName);
        } else {
            console.error("Skipping map update - invalid coordinates:", { latitude, longitude });
        }
        
        hideLoader();
        cityInput.value = cityName;
        
    } catch (error) {
        console.error("Fetch error:", error);
        showError(`❌ Failed to fetch location weather.\n\nError: ${error.message}`);
        hideLoader();
    }
}

/* ==================== WEATHER DISPLAY ==================== */
function updateWeatherDisplay(data) {
    const current = data.current;
    const location = data.location;
    const tempC = current.temperature;
    const feelsLikeC = current.feelslike;
    
    // Update city and country
    document.getElementById("cityName").textContent = location.name;
    document.getElementById("countryFlag").textContent = getCountryFlag(location.country_code);
    
    // Update weather description
    document.getElementById("weatherDescription").textContent = current.weather_descriptions[0];
    
    // Update temperature
    document.getElementById("tempValue").textContent = convertTemp(tempC) + getTempUnit();
    document.getElementById("feelsLike").textContent = convertTemp(feelsLikeC);
    
    // Update weather icon
    const weatherIcon = document.getElementById("weatherIconLarge");
    weatherIcon.src = current.weather_icons[0];
    weatherIcon.alt = current.weather_descriptions[0];
    
    // Update weather details
    document.getElementById("humidity").textContent = current.humidity + "%";
    document.getElementById("windSpeed").textContent = current.wind_speed + " km/h";
    document.getElementById("pressure").textContent = current.pressure + " mb";
    document.getElementById("visibility").textContent = current.visibility + " km";
    
    // Update last updated timestamp
    const updateTime = new Date(current.observation_time);
    document.getElementById("lastUpdated").textContent = 
        `Last updated: ${updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    // Update dynamic background based on weather
    updateDynamicBackground(current.weather_descriptions[0]);
    
    // Update air quality and UV index
    updateAirQualityAndUV(current, location);
    
    // Generate weather tips
    generateWeatherTips(current.weather_descriptions[0], tempC);
    
    // Generate hourly preview
    generateHourlyPreview(tempC);
    
    // Show weather content
    showWeatherContent();
}

function getCountryFlag(countryCode) {
    // Handle undefined or empty country codes
    if (!countryCode || countryCode.length !== 2) {
        return "🌍"; // Default globe emoji
    }
    
    // Convert country code to flag emoji
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    try {
        return String.fromCodePoint(...codePoints);
    } catch (e) {
        return "🌍"; // Fallback to globe if conversion fails
    }
}

function updateDynamicBackground(weatherDescription) {
    const description = weatherDescription.toLowerCase();
    
    // Remove all background classes
    document.body.classList.remove("bg-clear", "bg-cloudy", "bg-rainy", "bg-sunny", "bg-night");
    
    // Add appropriate background class
    if (description.includes("rain") || description.includes("drizzle")) {
        document.body.classList.add("bg-rainy");
    } else if (description.includes("cloud") || description.includes("overcast")) {
        document.body.classList.add("bg-cloudy");
    } else if (description.includes("sunny") || description.includes("clear")) {
        document.body.classList.add("bg-sunny");
    } else if (description.includes("night") || description.includes("dark")) {
        document.body.classList.add("bg-night");
    } else {
        document.body.classList.add("bg-clear");
    }
}

function updateAirQualityAndUV(current, location) {
    // Mock air quality based on weather conditions
    const description = current.weather_descriptions[0].toLowerCase();
    let aqiScore = "Good";
    let aqiDescription = "Air quality is suitable for outdoor activities";
    let aqiWidth = 80;
    
    if (description.includes("rain") || description.includes("thunderstorm")) {
        aqiScore = "Moderate";
        aqiDescription = "Acceptable for most people. Some sensitive groups may experience issues.";
        aqiWidth = 60;
    } else if (description.includes("haze") || description.includes("mist")) {
        aqiScore = "Unhealthy for Sensitive Groups";
        aqiDescription = "Members of sensitive groups may experience health effects.";
        aqiWidth = 40;
    } else if (description.includes("clear") || description.includes("sunny")) {
        aqiScore = "Excellent";
        aqiDescription = "Perfect conditions for outdoor activities.";
        aqiWidth = 95;
    }
    
    document.getElementById("aqiScore").textContent = aqiScore;
    document.getElementById("aqiDescription").textContent = aqiDescription;
    document.getElementById("aqiBarFill").style.width = aqiWidth + "%";
    
    // Mock UV Index
    const tempC = current.temperature;
    let uvIndex = 2;
    let uvLevel = "Low";
    let uvTip = "No protection required";
    
    if (description.includes("sunny") || description.includes("clear")) {
        uvIndex = Math.min(11, Math.max(1, Math.round((tempC - 10) / 3)));
    } else if (!description.includes("cloud") && !description.includes("rain")) {
        uvIndex = Math.min(8, Math.max(1, Math.round((tempC - 15) / 4)));
    }
    
    if (uvIndex >= 11) {
        uvLevel = "Extreme";
        uvTip = "Avoid sun exposure. Wear protective clothing, SPF 50+ sunscreen, and a hat.";
    } else if (uvIndex >= 8) {
        uvLevel = "Very High";
        uvTip = "Take all precautions. Apply sunscreen SPF 50+, wear a hat and sunglasses.";
    } else if (uvIndex >= 6) {
        uvLevel = "High";
        uvTip = "Apply sunscreen SPF 30+ every 2 hours. Wear protective clothing.";
    } else if (uvIndex >= 3) {
        uvLevel = "Moderate";
        uvTip = "Apply sunscreen SPF 30+. Wear sunglasses and a hat during peak hours.";
    }
    
    document.getElementById("uvIndex").textContent = uvIndex;
    document.getElementById("uvLevel").textContent = uvLevel;
    document.getElementById("uvTip").textContent = uvTip;
}

/* ==================== WEATHER TIPS GENERATION ==================== */
function generateWeatherTips(weatherDescription, tempC) {
    const description = weatherDescription.toLowerCase();
    const tips = [];
    
    // Rain tips
    if (description.includes("rain") || description.includes("drizzle")) {
        tips.push({ icon: "☔", title: "Carry Umbrella", desc: "Don't get caught in the rain!" });
        tips.push({ icon: "🧥", title: "Wear Waterproof Jacket", desc: "Stay dry and comfortable" });
    }
    
    // Sunny tips
    if (description.includes("sunny") || description.includes("clear")) {
        tips.push({ icon: "😎", title: "Use Sunscreen", desc: "Protect your skin with SPF 30+" });
        tips.push({ icon: "🧢", title: "Wear A Hat", desc: "Protect your head from UV rays" });
    }
    
    // Cold weather tips
    if (tempC < 10) {
        tips.push({ icon: "🧥", title: "Wear Warm Clothes", desc: "Layer up for the cold weather" });
        tips.push({ icon: "🧤", title: "Use Gloves", desc: "Protect your hands from frost" });
    }
    
    // Hot weather tips
    if (tempC > 30) {
        tips.push({ icon: "💧", title: "Stay Hydrated", desc: "Drink plenty of water" });
        tips.push({ icon: "👕", title: "Light Clothing", desc: "Wear light colors and loose clothes" });
    }
    
    // Stormy tips
    if (description.includes("thunderstorm") || description.includes("storm")) {
        tips.push({ icon: "⛈️", title: "Stay Indoors", desc: "Avoid outdoor activities" });
        tips.push({ icon: "🏠", title: "Stay Safe", desc: "Keep away from windows and electronics" });
    }
    
    // Snowy tips
    if (description.includes("snow")) {
        tips.push({ icon: "❄️", title: "Snow Warning", desc: "Roads may be slippery" });
        tips.push({ icon: "👢", title: "Wear Proper Footwear", desc: "Use boots with good traction" });
    }
    
    // Default tips if no specific condition
    if (tips.length === 0) {
        tips.push({ icon: "👁️", title: "Check Visibility", desc: "Current visibility: " + document.getElementById("visibility").textContent });
        tips.push({ icon: "💨", title: "Wind Advisory", desc: "Current wind speed: " + document.getElementById("windSpeed").textContent });
    }
    
    // Render tips
    tipsContainer.innerHTML = tips.map(tip => `
        <div class="tip-item">
            <div class="tip-icon">${tip.icon}</div>
            <div class="tip-text">
                <strong>${tip.title}</strong><br>
                ${tip.desc}
            </div>
        </div>
    `).join("");
}

/* ==================== HOURLY PREVIEW GENERATION ==================== */
function generateHourlyPreview(currentTempC) {
    const now = new Date();
    const hours = [];
    
    for (let i = 0; i < 8; i++) {
        const futureHour = new Date(now.getTime() + i * 60 * 60 * 1000);
        const hour = futureHour.getHours();
        const timeStr = hour.toString().padStart(2, '0') + ":00";
        
        // Simulate temperature variation
        const tempVariation = Math.sin(i * 0.5) * 3;
        const temp = convertTemp(currentTempC + tempVariation);
        
        // Simulate weather icon changes (mostly same, some variation)
        const weatherIcons = ["☀️", "⛅", "🌤️", "☁️", "🌥️"];
        const icon = weatherIcons[i % weatherIcons.length];
        
        hours.push({ time: timeStr, temp: temp, icon: icon });
    }
    
    hourlyContainer.innerHTML = hours.map(h => `
        <div class="hourly-item">
            <div class="hourly-time">${h.time}</div>
            <div class="hourly-icon">${h.icon}</div>
            <div class="hourly-temp">${h.temp}${getTempUnit()}</div>
        </div>
    `).join("");
}

/* ==================== SEARCH FUNCTIONALITY ==================== */
function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        fetchWeatherByCity(city);
        suggestionsDropdown.classList.remove("active");
    }
}

/* ==================== REFRESH WEATHER ==================== */
function handleRefresh() {
    // Only refresh if we have current weather data
    if (!currentWeatherData) {
        showError("❌ No weather data to refresh. Please search for a city first.");
        return;
    }
    
    // Get the current city name
    const cityName = currentWeatherData.location.name;
    
    // Add spinning animation
    refreshBtn.classList.add("spinning");
    
    // Re-fetch weather for the current city
    console.log("🔄 Refreshing weather for:", cityName);
    fetchWeatherByCity(cityName);
    
    // Remove spinning animation after a delay
    setTimeout(() => {
        refreshBtn.classList.remove("spinning");
    }, 2000);
}

/* ==================== AUTO-SUGGESTIONS ==================== */
function handleAutoSuggestions() {
    const input = cityInput.value.trim().toLowerCase();
    
    if (input.length === 0) {
        suggestionsDropdown.classList.remove("active");
        return;
    }
    
    const filtered = popularCities.filter(city => 
        city.toLowerCase().includes(input)
    ).slice(0, 8);
    
    if (filtered.length === 0) {
        suggestionsDropdown.classList.remove("active");
        return;
    }
    
    suggestionsList.innerHTML = filtered.map(city => `
        <div class="suggestion-item" onclick="selectSuggestion('${city}')">
            <i class="fas fa-map-marker-alt"></i>
            <span>${city}</span>
        </div>
    `).join("");
    
    suggestionsDropdown.classList.add("active");
}

function selectSuggestion(city) {
    cityInput.value = city;
    suggestionsDropdown.classList.remove("active");
    handleSearch();
}

/* ==================== GEOLOCATION ==================== */
function handleGeolocation() {
    if (!navigator.geolocation) {
        showError("❌ Geolocation is not supported by your browser.");
        return;
    }
    
    locationBtn.disabled = true;
    locationBtn.style.opacity = "0.5";
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            // Ensure coordinates are valid numbers
            if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
                fetchWeatherByCoordinates(latitude, longitude);
            } else {
                showError("❌ Unable to get your location coordinates. Please try searching for a city instead.");
            }
            locationBtn.disabled = false;
            locationBtn.style.opacity = "1";
        },
        (error) => {
            let errorMessage = "❌ ";
            
            // Handle specific permission errors
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage += "Geolocation permission denied. Please enable location access in your browser settings and try again.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMessage += "Your location is unavailable. Please try searching for a city instead.";
            } else if (error.code === error.TIMEOUT) {
                errorMessage += "Location request timed out. Please try again or search for a city.";
            } else {
                errorMessage += `Geolocation error: ${error.message}`;
            }
            
            showError(errorMessage);
            locationBtn.disabled = false;
            locationBtn.style.opacity = "1";
        }
    );
}

/* ==================== VOICE SEARCH ==================== */
function handleVoiceSearch() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showError("❌ Voice search is not supported in your browser.");
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.language = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    
    voiceBtn.style.background = "linear-gradient(135deg, #ef4444, #f87171)";
    voiceBtn.title = "Listening...";
    
    recognition.onstart = () => {
        console.log("🎤 Listening for voice input...");
    };
    
    recognition.onresult = (event) => {
        if (event.results && event.results.length > 0) {
            const transcript = event.results[0][0].transcript;
            console.log("🎤 Voice input received:", transcript);
            cityInput.value = transcript;
            handleSearch();
        }
        voiceBtn.style.background = "linear-gradient(135deg, var(--primary-color), var(--secondary-color))";
        voiceBtn.title = "Voice Search";
    };
    
    recognition.onerror = (event) => {
        let errorMessage = "❌ ";
        
        // Handle specific permission and error cases
        if (event.error === "not-allowed" || event.error === "permission-denied") {
            errorMessage += "Microphone permission denied. Please enable microphone access in your browser settings.";
        } else if (event.error === "no-speech") {
            errorMessage += "No speech detected. Please try speaking again.";
        } else if (event.error === "network") {
            errorMessage += "Network error. Please check your internet connection.";
        } else if (event.error === "service-not-allowed") {
            errorMessage += "Voice search service not available. Please search manually.";
        } else {
            errorMessage += `Voice search error: ${event.error}. Please try again or search manually.`;
        }
        
        console.error("🎤 Voice error:", event.error);
        showError(errorMessage);
        voiceBtn.style.background = "linear-gradient(135deg, var(--primary-color), var(--secondary-color))";
        voiceBtn.title = "Voice Search";
    };
    
    recognition.onend = () => {
        voiceBtn.style.background = "linear-gradient(135deg, var(--primary-color), var(--secondary-color))";
        voiceBtn.title = "Voice Search";
    };
    
    recognition.start();
}

/* ==================== SEARCH HISTORY ==================== */
function loadSearchHistory() {
    const saved = localStorage.getItem("searchHistory");
    searchHistory = saved ? JSON.parse(saved) : [];
    renderSearchHistory();
}

function addToSearchHistory(city, country) {
    const item = `${city}, ${country}`;
    
    // Remove if already exists (to avoid duplicates)
    searchHistory = searchHistory.filter(h => h !== item);
    
    // Add to beginning
    searchHistory.unshift(item);
    
    // Keep only last 5
    searchHistory = searchHistory.slice(0, 5);
    
    // Save to localStorage
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
    renderSearchHistory();
}

function renderSearchHistory() {
    if (searchHistory.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">No recent searches</p>';
        return;
    }
    
    historyList.innerHTML = searchHistory.map((item, index) => `
        <div class="history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; background: var(--glass-bg-current); margin-bottom: 6px; border: 1px solid var(--border);">
            <div onclick="fetchWeatherByCity('${item.split(',')[0]}')" style="flex: 1; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-history"></i>
                <span>${item}</span>
            </div>
            <button onclick="deleteSearchHistory(${index}, event)" title="Delete" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px 8px; font-size: 0.9rem; hover: color: var(--primary-color); transition: all 0.2s;">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join("");
}

function deleteSearchHistory(index, event) {
    // Prevent triggering the city search
    event.stopPropagation();
    
    // Remove from array
    searchHistory.splice(index, 1);
    
    // Save updated history
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
    
    // Re-render
    renderSearchHistory();
    
    console.log("✅ Deleted search history item at index", index);
}

/* ==================== MAP INTEGRATION ==================== */
function initializeMap() {
    try {
        // Ensure DOM element exists and is visible
        const mapElement = document.getElementById("weatherMap");
        if (!mapElement) {
            console.error("❌ Map container 'weatherMap' not found in DOM");
            return;
        }
        
        console.log("📍 Map element found:", mapElement);
        console.log("📍 Map element computed style:", {
            display: getComputedStyle(mapElement).display,
            visibility: getComputedStyle(mapElement).visibility,
            width: mapElement.clientWidth,
            height: mapElement.clientHeight
        });
        
        // Ensure element has height
        if (mapElement.clientHeight === 0) {
            console.log("⚠️ Map element has 0 height, setting explicit style");
            mapElement.style.height = "500px";
            mapElement.style.minHeight = "500px";
        }
        
        // Clear any existing map
        if (map) {
            map.remove();
            map = null;
        }
        
        console.log("📍 Creating new map instance...");
        
        // Initialize map with all options
        map = L.map("weatherMap", {
            preferCanvas: true,
            attributionControl: true,
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true,
            doubleClickZoom: true
        });
        
        // Ensure the map element is visible
        mapElement.style.display = "block";
        mapElement.style.visibility = "visible";
        
        // Set initial view AFTER map is created
        if (map) {
            map.setView([20, 0], 2);
            console.log("✅ Map view set to [20, 0], zoom: 2");
        }
        
        // Add OSM tile layer
        const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 1,
            crossOrigin: 'anonymous',
            tileSize: 256,
            subdomains: ['a', 'b', 'c']
        });
        
        osmLayer.addTo(map);
        console.log("✅ OSM tile layer added");
        
        // Force size recalculation multiple times
        const invalidateSizes = () => {
            if (map && mapElement) {
                console.log("📍 Invalidating map size...");
                console.log("   Element size:", { width: mapElement.clientWidth, height: mapElement.clientHeight });
                map.invalidateSize(true); // force: true
                console.log("✅ Map size invalidated");
            }
        };
        
        // Invalidate immediately
        invalidateSizes();
        
        // Invalidate again after short delay
        setTimeout(invalidateSizes, 50);
        setTimeout(invalidateSizes, 100);
        setTimeout(invalidateSizes, 200);
        
        // Event listeners
        map.on('load', () => {
            console.log("✅ Map fully loaded");
            invalidateSizes();
        });
        
        map.on('error', (error) => {
            console.error("❌ Map error:", error);
        });
        
        osmLayer.on('tileload', () => {
            console.log("📍 Tiles loading...");
        });
        
        osmLayer.on('load', () => {
            console.log("✅ All tiles loaded!");
        });
        
        osmLayer.on('error', (error) => {
            console.error("❌ Tile layer error:", error);
        });
        
        console.log("✅ Map initialization completed!");
        
    } catch (error) {
        console.error("❌ Failed to initialize map:", error.message);
        console.error("Stack:", error.stack);
    }
}

function updateMap(latitude, longitude, cityName) {
    try {
        // Ensure we have the map object
        if (!map) {
            console.error("Map not initialized");
            return;
        }
        
        // Parse to ensure they are numbers
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        
        console.log("updateMap called with:", { latitude, longitude, lat, lon, latNaN: isNaN(lat), lonNaN: isNaN(lon) });
        
        // Validate coordinates - check specifically for NaN
        if (isNaN(lat) || isNaN(lon)) {
            console.error("❌ Cannot update map - Invalid coordinates (NaN):", { latitude, longitude, lat, lon });
            return;
        }
        
        // Also check they are reasonable values (between -90/90 for lat, -180/180 for lon)
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            console.error("❌ Cannot update map - Coordinates out of range:", { lat, lon });
            return;
        }
        
        console.log("✅ Updating map with valid coordinates:", { lat, lon });
        
        // Invalidate size before updating view
        map.invalidateSize();
        
        // Update map view with animation
        map.flyTo([lat, lon], 13, {
            duration: 2,
            easeLinearity: 0.25
        });
        
        // Remove old marker if exists
        if (mapMarker) {
            map.removeLayer(mapMarker);
        }
        
        // Add new marker with popup
        mapMarker = L.marker([lat, lon]).addTo(map);
        mapMarker.bindPopup(`
            <div style="text-align: center; padding: 10px;">
                <strong>${cityName}</strong><br>
                ${document.getElementById("tempValue").textContent}<br>
                ${document.getElementById("weatherDescription").textContent}
            </div>
        `).openPopup();
        
        console.log("✅ Map updated successfully");
        
    } catch (error) {
        console.error("❌ Error updating map:", error.message, { latitude, longitude });
    }
}

/* ==================== UI STATE MANAGEMENT ==================== */
function showLoader() {
    loader.classList.add("active");
    weatherContent.classList.remove("active");
    initialMessage.classList.add("hidden");
}

function hideLoader() {
    loader.classList.remove("active");
}

function showWeatherContent() {
    weatherContent.classList.add("active");
    initialMessage.classList.add("hidden");
}

function hideWeatherContent() {
    weatherContent.classList.remove("active");
    initialMessage.classList.remove("hidden");
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.add("active");
    weatherContent.classList.remove("active");
    initialMessage.classList.add("hidden");
}

function hideError() {
    errorMessage.classList.remove("active");
}

/* ==================== UTILITIES & HELPERS ==================== */
console.log("%c⚡ WeatherFlow Started", "color: #3b82f6; font-size: 16px; font-weight: bold;");
console.log("%c✅ Script loaded successfully", "color: green; font-weight: bold;");
console.log("%c🌍 API: Open-Meteo (FREE - No API Key!)", "color: #8b5cf6;");
console.log("%c💾 Features: Theme, Temp Unit, Geolocation, Voice Search, Map, History", "color: #10b981;");
console.log("%c✨ App is ready! Search for any city", "color: #3b82f6; font-weight: bold;");
