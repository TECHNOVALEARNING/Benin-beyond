import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun,
  faMoon,
  faCloud,
  faCloudSun,
  faCloudMoon,
  faCloudShowersHeavy,
  faBolt,
  faClock,
  faCalendarDays,
  faLocationDot,
  faChevronLeft,
  faChevronRight,
  faWind,
  faDroplet,
  faTemperatureHalf,
  faTowerBroadcast,
  faGem
} from '@fortawesome/free-solid-svg-icons';
import { ScrollReveal } from './ScrollReveal';
import { getEvents } from '../services/eventService';

const BENIN_CITIES = [
  { id: 'cotonou', name: 'Cotonou', region: 'Littoral', lat: 6.3654, lon: 2.4186 },
  { id: 'ouidah', name: 'Ouidah', region: 'Cité Mémorielle', lat: 6.3625, lon: 2.0819 },
  { id: 'natitingou', name: 'Pendjari / Nord', region: 'Atacora & Faune', lat: 10.3042, lon: 1.3796 },
  { id: 'portonovo', name: 'Porto-Novo', region: 'Capitale', lat: 6.4969, lon: 2.6283 }
];

function getWeatherInfo(code, isDay) {
  if (code === 0) {
    return {
      label: isDay ? 'Ensoleillé' : 'Nuit claire',
      icon: isDay ? faSun : faMoon,
      condition: isDay ? 'Ciel dégagé' : 'Ciel étoilé'
    };
  }
  if (code === 1 || code === 2) {
    return {
      label: isDay ? 'Éclaircies' : 'Nuit voilée',
      icon: isDay ? faCloudSun : faCloudMoon,
      condition: isDay ? 'Passages nuageux' : 'Ciel partiellement voilé'
    };
  }
  if (code === 3) {
    return {
      label: 'Couvert',
      icon: faCloud,
      condition: 'Ciel couvert'
    };
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return {
      label: 'Averses tropicales',
      icon: faCloudShowersHeavy,
      condition: 'Pluie tropicale'
    };
  }
  if ([95, 96, 99].includes(code)) {
    return {
      label: 'Orage tropical',
      icon: faBolt,
      condition: 'Activité orageuse'
    };
  }
  return {
    label: isDay ? 'Climat doux' : 'Nuit tempérée',
    icon: isDay ? faSun : faMoon,
    condition: 'Climat béninois'
  };
}

export function BeninLiveSection() {
  const [events, setEvents] = useState([]);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timeString, setTimeString] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('cotonou');

  // Météo temps réel (Open-Meteo API)
  const [weatherData, setWeatherData] = useState({
    temp: 27,
    apparentTemp: 30,
    humidity: 80,
    windSpeed: 16,
    isDay: false,
    code: 2,
    loading: false
  });

  const selectedCity = BENIN_CITIES.find((c) => c.id === selectedCityId) || BENIN_CITIES[0];

  // Chargement dynamique des événements pilotés par l'administrateur
  useEffect(() => {
    let isMounted = true;
    getEvents().then((data) => {
      if (isMounted) {
        setEvents(data || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Horloge synchronisée sur le fuseau du Bénin (GMT+1 / WAT)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const beninTime = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Africa/Porto-Novo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
      setTimeString(beninTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Récupération de la météo réelle via Open-Meteo API
  useEffect(() => {
    let isMounted = true;

    const fetchRealWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=Africa%2FPorto-Novo`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.current) {
          setWeatherData({
            temp: Math.round(data.current.temperature_2m),
            apparentTemp: Math.round(data.current.apparent_temperature),
            humidity: Math.round(data.current.relative_humidity_2m),
            windSpeed: Math.round(data.current.wind_speed_10m),
            isDay: Boolean(data.current.is_day),
            code: data.current.weather_code,
            loading: false
          });
        }
      } catch (err) {
        console.warn('API Météo temps réel indisponible, utilisation des données locales:', err);
      }
    };

    fetchRealWeather();
    const weatherInterval = setInterval(fetchRealWeather, 300000);
    return () => {
      isMounted = false;
      clearInterval(weatherInterval);
    };
  }, [selectedCity]);

  // Défilement / switcher automatique si les événements dépassent 3
  useEffect(() => {
    if (events.length <= 3 || isPaused) return;

    const timer = setInterval(() => {
      setActiveEventIndex((prev) => (prev + 1) % events.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [events.length, isPaused]);

  const nextEvent = () => {
    if (events.length <= 1) return;
    setActiveEventIndex((prev) => (prev + 1) % events.length);
  };

  const prevEvent = () => {
    if (events.length <= 1) return;
    setActiveEventIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  // Sélection des événements à afficher (3 événements visibles avec rotation fluide si > 3)
  const visibleEvents = useMemo(() => {
    if (events.length === 0) return [];
    if (events.length <= 3) return events;

    const items = [];
    for (let i = 0; i < 3; i++) {
      items.push(events[(activeEventIndex + i) % events.length]);
    }
    return items;
  }, [events, activeEventIndex]);

  const weatherInfo = getWeatherInfo(weatherData.code, weatherData.isDay);

  return (
    <section className="relative w-full border-y border-foreground/10 bg-card/60 backdrop-blur-md">
      {/* 1. Direct Time & Weather Bar */}
      <ScrollReveal delay={0} y={15} className="border-b border-foreground/10 py-3.5 px-6 md:px-12">
        <div className="mx-auto max-w-8xl flex flex-wrap items-center justify-between gap-4">
          
          {/* A. Heure Officielle du Bénin */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <FontAwesomeIcon icon={faClock} className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                  {timeString || '12:00:00'}
                </span>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span>WAT (GMT+1)</span>
                </span>

                <span className="text-[11px] text-primary font-bold hidden sm:inline-flex items-center gap-1">
                  • En direct
                </span>
              </div>
              <p className="text-[11px] text-foreground/60">Fuseau officiel · République du Bénin</p>
            </div>
          </div>

          {/* B. Météo Réelle en Direct */}
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
                weatherData.isDay
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                  : 'bg-primary/10 text-primary border-primary/25'
              }`}
            >
              <FontAwesomeIcon
                icon={weatherInfo.icon}
                className={`h-5 w-5 ${weatherData.isDay ? 'animate-[spin_16s_linear_infinite]' : ''}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold text-foreground">
                  {weatherData.temp}°C
                </span>
                <span className="text-xs text-foreground/90 font-semibold">
                  {weatherInfo.label}
                </span>
              </div>

              {/* Indicateurs : Ressenti, Humidité, Vent et Sélecteur */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-foreground/65 mt-0.5">
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faTemperatureHalf} className="h-3 w-3 text-primary" /> Ressenti {weatherData.apparentTemp}°C
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faDroplet} className="h-3 w-3 text-primary" /> {weatherData.humidity}% Humidité
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faWind} className="h-3 w-3 text-primary" /> {weatherData.windSpeed} km/h
                </span>

                <span className="text-foreground/30">•</span>
                <div className="flex items-center gap-1 text-[11px]">
                  <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 text-primary" />
                  <select
                    value={selectedCityId}
                    onChange={(e) => setSelectedCityId(e.target.value)}
                    className="bg-transparent font-semibold text-foreground hover:text-primary cursor-pointer border-none p-0 focus:outline-none focus:ring-0 text-[11px]"
                    title="Changer de ville pour la météo"
                  >
                    {BENIN_CITIES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-card text-foreground">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* C. Recommandation Saisonnière */}
          <div className="hidden xl:flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary font-medium">
            <FontAwesomeIcon icon={faTowerBroadcast} className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Le Bénin vous accueille toute l'année</span>
          </div>

        </div>
      </ScrollReveal>

      {/* 2. Cultural & Touristic Events Section */}
      {events.length > 0 && (
        <div
          className="mx-auto max-w-8xl px-6 py-10 md:px-12"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <ScrollReveal delay={50} y={20} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <p className="caption text-accent font-semibold tracking-wider flex items-center gap-2">
                <FontAwesomeIcon icon={faGem} className="h-3.5 w-3.5" />
                <span>En direct du Bénin</span>
              </p>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mt-1">
                Événements culturels & Saison touristique
              </h3>
            </div>

            {/* Navigation Switcher Controls (visibles si plus de 3 événements) */}
            {events.length > 3 && (
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold text-foreground/50">
                  {activeEventIndex + 1} / {events.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={prevEvent}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card hover:bg-primary hover:text-white text-foreground transition-all active:scale-95 shadow-sm"
                    title="Événement précédent"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={nextEvent}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card hover:bg-primary hover:text-white text-foreground transition-all active:scale-95 shadow-sm"
                    title="Événement suivant"
                  >
                    <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </ScrollReveal>

          {/* Dynamic Events Cards Grid with Smooth Transition */}
          <div
            className={`grid gap-6 ${
              visibleEvents.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : visibleEvents.length === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {visibleEvents.map((event, idx) => (
              <div
                key={`${event.id}-${idx}`}
                className="group relative h-full overflow-hidden rounded-2xl border border-foreground/10 bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col"
              >
                {/* Event Image */}
                <div className="relative h-48 w-full overflow-hidden bg-muted shrink-0">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badge */}
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm">
                      {event.badge}
                    </span>
                  </div>

                  {/* Period tag */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-semibold text-white">
                    <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5 text-accent" />
                    <span>{event.period}</span>
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h4>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground/60">
                      <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 text-primary/70 shrink-0" />
                      <span>{event.location}</span>
                    </p>

                    <p className="mt-2.5 text-xs leading-relaxed text-foreground/75 line-clamp-2">
                      {event.description}
                    </p>
                  </div>

                  {event.tag && (
                    <div className="mt-4 pt-3 border-t border-foreground/5 flex items-center justify-between text-[11px] text-foreground/50">
                      <span className="rounded-md bg-foreground/5 px-2 py-0.5 text-primary font-medium">
                        {event.tag}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Indicator Dots if > 3 */}
          {events.length > 3 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {events.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => setActiveEventIndex(dotIdx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    dotIdx === activeEventIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-foreground/20 hover:bg-foreground/40'
                  }`}
                  title={`Aller à l'événement ${dotIdx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
