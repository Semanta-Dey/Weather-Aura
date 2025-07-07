document.addEventListener('DOMContentLoaded', () => {
            const API_KEY = "c99d88d48736985c8d5104a99b1904ca";
            const DEFAULT_CITY = "London";

            const container = document.querySelector('.container');
            const searchInput = document.getElementById('search-input');
            const currentLocationBtn = document.getElementById('current-location-btn');
            
            const desktopThemeBtn = document.getElementById('desktop-theme-btn');
            const mobileThemeBtn = document.getElementById('mobile-theme-btn');
            const unitToggleBtn = document.getElementById('unit-toggle-btn');
            
            let globalWeatherData = {};
            let globalForecastData = {};
            let isFahrenheit = localStorage.getItem('unit') === 'fahrenheit';

            // EDITED: Updated to select both desktop and mobile forecast lists
            const DOMElements = {
                currentTemp: document.getElementById('current-temp'),
                currentTempUnit: document.getElementById('current-temp-unit'),
                weatherIcon: document.getElementById('current-weather-icon'),
                description: document.getElementById('current-description'),
                date: document.getElementById('current-date'),
                location: document.getElementById('current-location'),
                forecastListDesktop: document.getElementById('forecast-list-desktop'),
                forecastListMobile: document.getElementById('forecast-list-mobile'),
                searchResultsList: document.getElementById('search-results-list'),
                aqiStatus: document.getElementById('aqi-status'),
                pm2_5: document.getElementById('pm2_5'),
                so2: document.getElementById('so2'),
                no2: document.getElementById('no2'),
                o3: document.getElementById('o3'),
                sunrise: document.getElementById('sunrise-time'),
                sunset: document.getElementById('sunset-time'),
                humidity: document.getElementById('humidity'),
                pressure: document.getElementById('pressure'),
                visibility: document.getElementById('visibility'),
                feelsLike: document.getElementById('feels-like'),
                feelsLikeUnit: document.getElementById('feels-like-unit'),
                hourlyForecast: document.getElementById('hourly-forecast-container')
            };
            
            const celsiusToFahrenheit = (celsius) => Math.round((celsius * 9/5) + 32);

            const updateAllTemperatures = () => {
                if (!globalWeatherData.main || !globalForecastData.list) return;

                const unitSymbol = isFahrenheit ? '°F' : '°C';
                const convert = (temp) => isFahrenheit ? celsiusToFahrenheit(temp) : Math.round(temp);
                
                DOMElements.currentTemp.textContent = convert(globalWeatherData.main.temp);
                DOMElements.currentTempUnit.textContent = unitSymbol;
                
                DOMElements.feelsLike.textContent = convert(globalWeatherData.main.feels_like);
                DOMElements.feelsLikeUnit.textContent = unitSymbol;

                document.querySelectorAll('.hourly-item .temp').forEach((item, index) => {
                    if (globalForecastData.list[index]) {
                        const tempCelsius = globalForecastData.list[index].main.temp;
                        item.textContent = `${convert(tempCelsius)}°`;
                    }
                });

                document.querySelectorAll('.forecast-item .temp').forEach(item => {
                    const tempCelsius = parseFloat(item.dataset.tempCelsius);
                    if (!isNaN(tempCelsius)) {
                        item.textContent = `${convert(tempCelsius)}°`;
                    }
                });
            };
            
            const fetchWeatherData = async (lat, lon) => {
                container.classList.add('loading');
                try {
                    const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
                    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
                    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
                    const airPollutionUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

                    const responses = await Promise.all([ fetch(geoUrl), fetch(weatherUrl), fetch(forecastUrl), fetch(airPollutionUrl) ]);
                    
                    for (const res of responses) {
                        if (!res.ok) {
                            const { cod, message } = await res.json();
                            throw new Error(`API Error ${cod}: ${message}`);
                        }
                    }

                    const [geoData, weatherData, forecastData, airPollutionData] = await Promise.all(responses.map(res => res.json()));

                    globalWeatherData = weatherData;
                    globalForecastData = forecastData;
                    
                    updateUI(weatherData, forecastData, airPollutionData, geoData[0]);

                } catch (error) {
                    console.error("Detailed Fetch Error:", error);
                    alert(`Error fetching weather data. Please try again later or check the city name. \nDetails: ${error.message}`);
                } finally {
                    container.classList.remove('loading');
                }
            };
            
            const updateUI = (weather, forecast, airPollution, location) => {
                const { weather: [weatherDetails], dt, sys, visibility, main } = weather;
                DOMElements.weatherIcon.src = `https://openweathermap.org/img/wn/${weatherDetails.icon}@4x.png`;
                DOMElements.description.textContent = weatherDetails.description;
                DOMElements.date.textContent = new Date(dt * 1000).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
                DOMElements.location.textContent = `${location?.name ?? 'Unknown'}, ${location?.country ?? ''}`;
                DOMElements.sunrise.textContent = new Date(sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                DOMElements.sunset.textContent = new Date(sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                DOMElements.humidity.textContent = `${main.humidity}`;
                DOMElements.pressure.textContent = `${main.pressure}`;
                DOMElements.visibility.textContent = `${(visibility / 1000).toFixed(1)}`;
                
                const { list: [air] } = airPollution;
                const aqiData = getAqiData(air.main.aqi);
                DOMElements.aqiStatus.textContent = aqiData.text;
                DOMElements.aqiStatus.style.backgroundColor = aqiData.bgColor;
                DOMElements.aqiStatus.style.color = aqiData.color;
                DOMElements.pm2_5.textContent = air.components.pm2_5.toFixed(2);
                DOMElements.so2.textContent = air.components.so2.toFixed(2);
                DOMElements.no2.textContent = air.components.no2.toFixed(2);
                DOMElements.o3.textContent = air.components.o3.toFixed(2);

                DOMElements.hourlyForecast.innerHTML = '';
                for (let i = 0; i < 8; i++) {
                    const item = forecast.list[i];
                    DOMElements.hourlyForecast.innerHTML += `
                        <div class="hourly-item">
                            <p class="time">${new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</p>
                            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="Weather" class="weather-icon">
                            <p class="temp">--°</p>
                        </div>
                    `;
                }
                
                const dailyData = {};
                forecast.list.forEach(item => {
                    const date = new Date(item.dt * 1000).toISOString().split('T')[0];
                    if (!dailyData[date]) dailyData[date] = { temp_max: -Infinity, icons: [] };
                    dailyData[date].temp_max = Math.max(dailyData[date].temp_max, item.main.temp_max);
                    dailyData[date].icons.push(item.weather[0].icon);
                });
                
                // EDITED: Clears both forecast lists
                DOMElements.forecastListDesktop.innerHTML = '';
                DOMElements.forecastListMobile.innerHTML = '';

                Object.keys(dailyData).slice(1, 6).forEach(date => {
                    const day = dailyData[date];
                    const mostFrequentIcon = day.icons.sort((a,b) => day.icons.filter(v => v===a).length - day.icons.filter(v => v===b).length).pop();
                    const forecastItemHTML = `
                        <li class="forecast-item">
                            <img src="https://openweathermap.org/img/wn/${mostFrequentIcon}@2x.png" alt="Weather" class="weather-icon">
                            <p class="temp" data-temp-celsius="${day.temp_max}">--°</p>
                            <p class="day">${new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        </li>
                    `;
                    // EDITED: Populates both forecast lists
                    DOMElements.forecastListDesktop.innerHTML += forecastItemHTML;
                    DOMElements.forecastListMobile.innerHTML += forecastItemHTML;
                });

                updateAllTemperatures();
            };
            
            // --- Helper functions and event listeners ---
            const getAqiData = (aqi) => {
                const levels = [ { text: 'Good', color: '#88FF8B', bgColor: '#293829'}, { text: 'Fair', color: '#D4FF88', bgColor: '#3e4431'}, { text: 'Moderate', color: '#FFE088', bgColor: '#444131'}, { text: 'Poor', color: '#FFB388', bgColor: '#443731'}, { text: 'Very Poor', color: '#FF8888', bgColor: '#443131'} ];
                return levels[aqi - 1] || { text: 'Unknown', color: '#A4A6B9', bgColor: '#38383a' };
            };
            const debounce = (func, delay) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), delay); }; };
            const fetchCitySuggestions = async (query) => { if (query.length < 2) { DOMElements.searchResultsList.parentElement.classList.remove('active'); DOMElements.searchResultsList.innerHTML = ""; return; } try { const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`); if (!res.ok) throw new Error("Failed to fetch suggestions."); const data = await res.json(); DOMElements.searchResultsList.parentElement.classList.add('active'); DOMElements.searchResultsList.innerHTML = ""; if (data.length === 0) { DOMElements.searchResultsList.innerHTML = `<li class="view-item" style="cursor: default;"><span class="item-text">No results found.</span></li>`; return; } data.forEach(city => { const { name, lat, lon, country, state } = city; const li = document.createElement('li'); li.classList.add('view-item'); li.dataset.lat = lat; li.dataset.lon = lon; const stateText = state ? `, ${state}` : ''; li.innerHTML = `<span class="material-symbols-outlined">location_city</span><span class="item-text">${name}${stateText}, ${country}</span>`; DOMElements.searchResultsList.appendChild(li); }); } catch (error) { DOMElements.searchResultsList.parentElement.classList.remove('active'); } };
            const debouncedFetchSuggestions = debounce(fetchCitySuggestions, 500);
            searchInput.addEventListener('input', () => debouncedFetchSuggestions(searchInput.value.trim()));
            DOMElements.searchResultsList.addEventListener('click', (e) => { const li = e.target.closest('.view-item'); if (li && li.dataset.lat) { fetchWeatherData(li.dataset.lat, li.dataset.lon); DOMElements.searchResultsList.parentElement.classList.remove('active'); searchInput.value = ""; } });
            const getWeatherByCity = async (city) => { if (city) { try { const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`); const data = await res.json(); if (data.length) fetchWeatherData(data[0].lat, data[0].lon); else { alert('City not found.'); container.classList.remove('loading'); } } catch (e) { alert(e.message); container.classList.remove('loading'); } } };
            const handleSearch = () => { const city = searchInput.value.trim(); if(city) getWeatherByCity(city); searchInput.value = ""; searchInput.blur(); DOMElements.searchResultsList.parentElement.classList.remove('active'); };
            searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') handleSearch(); });
            document.getElementById('search-icon-btn').addEventListener('click', handleSearch);
            currentLocationBtn.addEventListener('click', () => { navigator.geolocation.getCurrentPosition(pos => fetchWeatherData(pos.coords.latitude, pos.coords.longitude), err => alert(err.message)); });
            
            let isLightTheme = localStorage.getItem('theme') === 'light';
            const applyTheme = (isLight) => { const icon = isLight ? 'dark_mode' : 'light_mode'; document.body.classList.toggle('light-theme', isLight); desktopThemeBtn.querySelector('.material-symbols-outlined').textContent = icon; mobileThemeBtn.querySelector('.material-symbols-outlined').textContent = icon; localStorage.setItem('theme', isLight ? 'light' : 'dark'); };
            const toggleTheme = () => { isLightTheme = !isLightTheme; applyTheme(isLightTheme); };
            desktopThemeBtn.addEventListener('click', toggleTheme);
            mobileThemeBtn.addEventListener('click', toggleTheme);

            const applyUnit = (isF) => {
                unitToggleBtn.classList.toggle('fahrenheit-active', isF);
                updateAllTemperatures();
            };
            const toggleUnit = () => {
                isFahrenheit = !isFahrenheit;
                localStorage.setItem('unit', isFahrenheit ? 'fahrenheit' : 'celsius');
                applyUnit(isFahrenheit);
            };
            unitToggleBtn.addEventListener('click', toggleUnit);

            applyTheme(isLightTheme);
            unitToggleBtn.classList.toggle('fahrenheit-active', isFahrenheit); // Set initial button state
            getWeatherByCity(DEFAULT_CITY);
        });