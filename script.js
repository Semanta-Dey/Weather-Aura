document.addEventListener('DOMContentLoaded', () => {
            const API_KEY = "c99d88d48736985c8d5104a99b1904ca";
            const DEFAULT_CITY = "London";

            const container = document.querySelector('.container');
            const searchInput = document.getElementById('search-input');
            const searchIconBtn = document.getElementById('search-icon-btn');
            const currentLocationBtn = document.getElementById('current-location-btn');
            
            const DOMElements = {
                currentTemp: document.getElementById('current-temp'),
                weatherIcon: document.getElementById('current-weather-icon'),
                description: document.getElementById('current-description'),
                date: document.getElementById('current-date'),
                location: document.getElementById('current-location'),
                forecastList: document.getElementById('forecast-list'),
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
                hourlyForecast: document.getElementById('hourly-forecast-container')
            };

            let debounceTimeout;
            const debounce = (func, delay) => {
                return (...args) => {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => {
                        func.apply(this, args);
                    }, delay);
                };
            };
            
            const fetchCitySuggestions = async (query) => {
                if (query.length < 2) { 
                    DOMElements.searchResultsList.parentElement.classList.remove('active');
                    DOMElements.searchResultsList.innerHTML = "";
                    return;
                }
                try {
                    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`;
                    const response = await fetch(geoUrl);
                    if (!response.ok) throw new Error("Failed to fetch suggestions.");
                    const data = await response.json();
                    
                    DOMElements.searchResultsList.parentElement.classList.add('active');
                    DOMElements.searchResultsList.innerHTML = "";
                    
                    if (data.length === 0) {
                        DOMElements.searchResultsList.innerHTML = `<li class="view-item" style="cursor: default;"><span class="item-text">No results found.</span></li>`;
                        return;
                    }

                    data.forEach(city => {
                        const { name, lat, lon, country, state } = city;
                        const listItem = document.createElement('li');
                        listItem.classList.add('view-item');
                        listItem.dataset.lat = lat;
                        listItem.dataset.lon = lon;
                        
                        const stateText = state ? `, ${state}` : '';
                        listItem.innerHTML = `
                            <span class="material-symbols-outlined">location_city</span>
                            <span class="item-text">${name}${stateText}, ${country}</span>
                        `;
                        DOMElements.searchResultsList.appendChild(listItem);
                    });
                } catch (error) {
                    console.error("Suggestion fetch error:", error);
                    DOMElements.searchResultsList.parentElement.classList.remove('active');
                }
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
                            throw new Error(`${cod}: ${message}`);
                        }
                    }

                    const [geoData, weatherData, forecastData, airPollutionData] = await Promise.all(responses.map(res => res.json()));
                    updateUI(weatherData, forecastData, airPollutionData, geoData[0]);

                } catch (error) {
                    console.error("Detailed Fetch Error:", error);
                    alert(`Error: ${error.message}. Please check your API key and network connection.`);
                } finally {
                    container.classList.remove('loading');
                }
            };

            const getWeatherByCity = async (city) => {
                if (!city) return;
                try {
                    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;
                    const response = await fetch(geoUrl);
                    if(!response.ok) throw new Error("Failed to fetch city coordinates.");
                    const data = await response.json();
                    if (data.length > 0) {
                        const { lat, lon } = data[0];
                        fetchWeatherData(lat, lon);
                    } else {
                        alert('City not found.');
                    }
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            };
            
            const updateUI = (weather, forecast, airPollution, location) => {
                const { main, weather: [weatherDetails], dt, sys, visibility } = weather;
                
                DOMElements.currentTemp.textContent = Math.round(main.temp);
                DOMElements.weatherIcon.src = `https://openweathermap.org/img/wn/${weatherDetails.icon}@4x.png`;
                DOMElements.description.textContent = weatherDetails.description;
                DOMElements.date.textContent = new Date(dt * 1000).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
                DOMElements.location.textContent = `${location?.name ?? 'Unknown'}, ${location?.country ?? ''}`;
                DOMElements.sunrise.textContent = new Date(sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                DOMElements.sunset.textContent = new Date(sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                DOMElements.humidity.textContent = `${main.humidity}`;
                DOMElements.pressure.textContent = `${main.pressure}`;
                DOMElements.visibility.textContent = `${(visibility / 1000).toFixed(1)}`;
                DOMElements.feelsLike.textContent = `${Math.round(main.feels_like)}`;

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
                            <p class="temp">${Math.round(item.main.temp)}°</p>
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
                
                DOMElements.forecastList.innerHTML = '';
                Object.keys(dailyData).slice(0, 5).forEach(date => {
                    const day = dailyData[date];
                    const mostFrequentIcon = day.icons.sort((a,b) => day.icons.filter(v => v===a).length - day.icons.filter(v => v===b).length).pop();
                    DOMElements.forecastList.innerHTML += `
                        <li class="forecast-item">
                            <img src="https://openweathermap.org/img/wn/${mostFrequentIcon}@2x.png" alt="Weather" class="weather-icon">
                            <p class="temp">${Math.round(day.temp_max)}°</p>
                            <p class="day">${new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                        </li>
                    `;
                });
            };

            const getAqiData = (aqi) => {
                const levels = [
                    { text: 'Good', color: '#88FF8B', bgColor: '#313f31'},
                    { text: 'Fair', color: '#D4FF88', bgColor: '#3e4431'},
                    { text: 'Moderate', color: '#FFE088', bgColor: '#444131'},
                    { text: 'Poor', color: '#FFB388', bgColor: '#443731'},
                    { text: 'Very Poor', color: '#FF8888', bgColor: '#443131'}
                ];
                return levels[aqi - 1] || { text: 'Unknown', color: '#A4A6B9', bgColor: '#38383a' };
            };
            
            const debouncedFetchSuggestions = debounce(fetchCitySuggestions, 500);

            searchInput.addEventListener('input', () => {
                debouncedFetchSuggestions(searchInput.value.trim());
            });

            DOMElements.searchResultsList.addEventListener('click', (e) => {
                const listItem = e.target.closest('.view-item');
                if (!listItem || !listItem.dataset.lat) return; 

                const lat = listItem.dataset.lat;
                const lon = listItem.dataset.lon;

                fetchWeatherData(lat, lon);

                DOMElements.searchResultsList.parentElement.classList.remove('active');
                searchInput.value = "";
            });

            const handleSearch = () => {
                const city = searchInput.value.trim();
                if(city) {
                    getWeatherByCity(city);
                }
                searchInput.value = "";
                searchInput.blur();
                DOMElements.searchResultsList.parentElement.classList.remove('active');
            };

            searchInput.addEventListener('keyup', e => {
                if (e.key === 'Enter') {
                    handleSearch();
                }
            });

            searchIconBtn.addEventListener('click', handleSearch);

            currentLocationBtn.addEventListener('click', () => {
                navigator.geolocation.getCurrentPosition(
                    pos => fetchWeatherData(pos.coords.latitude, pos.coords.longitude),
                    err => alert(`Error: ${err.message}`)
                );
            });
            
            getWeatherByCity(DEFAULT_CITY);
        });