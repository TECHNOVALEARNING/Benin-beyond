import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudLightning,
  Clock,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Wind,
  Droplets,
  Thermometer,
  Radio
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const BENIN_CITIES = [
  { id: 'cotonou', name: 'Cotonou', region: 'Littoral', lat: 6.3654, lon: 2.4186 },
  { id: 'ouidah', name: 'Ouidah', region: 'Cité Mémorielle', lat: 6.3625, lon: 2.0819 },
  { id: 'natitingou', name: 'Pendjari / Nord', region: 'Atacora & Faune', lat: 10.3042, lon: 1.3796 },
  { id: 'portonovo', name: 'Porto-Novo', region: 'Capitale', lat: 6.4969, lon: 2.6283 }
];

const CULTURAL_EVENTS = [
  {
    id: 'vodun-days',
    title: 'Vodun Days',
    badge: 'Festival International',
    period: '09 — 10 Janvier',
    location: 'Ouidah · Plage & Temple des Pythons',
    description: 'La plus grande célébration mondiale des arts, musiques rituelles et traditions séculaires sur le littoral d’Ouidah.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/998c78e0f_generated_826b4e25.png',
    tag: 'Culture & Spiritualité'
  },
  {
    id: 'gaani',
    title: 'Fête de la Gaani',
    badge: 'Célébration Royale',
    period: 'Novembre / Décembre',
    location: 'Nikki · Cour Impériale du Borgou',
    description: 'Somptueuse parade de centaines de cavaliers bariba aux caparaçons brodés, son des trompettes sacrées et hommage au Roi.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/786f87a7e_generated_f72ae80f.png',
    tag: 'Patrimoine Équestre'
  },
  {
    id: 'safari-pendjari',
    title: 'Saison des Safaris de la Pendjari',
    badge: 'Pleine Saison',
    period: 'Décembre — Mai',
    location: 'Parc National de la Pendjari · Atacora',
    description: 'Période royale pour l’observation des éléphants, lions, cobes de Buffon et bivouacs confortables sous la voûte céleste.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/53eb159f6_generated_5c492777.png',
    tag: 'Faune & Aventure'
  },
  {
    id: 'tresors-abomey',
    title: 'Trésors Royaux & Palais d’Abomey',
    badge: 'Patrimoine UNESCO',
    period: 'Toute l’année',
    location: 'Abomey · Palais des Rois',
    description: 'Immersion dans l’épopée du Danxomè, contemplation des trônes et statues des souverains restitués dans leurs palais historiques.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/f7eb9d7b5_generated_bd25ef85.png',
    tag: 'Histoire & Mémoire'
  },
  {
    id: 'regates-ganvie',
    title: 'Régates & Fêtes du Lac Nokoué',
    badge: 'Tradition Lacustre',
    period: 'Saison Touristique',
    location: 'Ganvié · Cité lacustre',
    description: 'Joutes nautiques en pirogues d’apparat, danses au fil de l’eau et animation festive du grand marché flottant.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/06b54fa79_generated_43e6e90f.png',
    tag: 'Vie sur l’Eau'
  }
];

function getWeatherInfo(code, isDay) {
  if (code === 0) {
    return {
      label: isDay ? 'Ensoleillé' : 'Nuit claire',
      icon: isDay ? Sun : Moon,
      condition: isDay ? 'Ciel dégagé' : 'Ciel étoilé'
    };
  }
  if (code === 1 || code === 2) {
    return {
      label: isDay ? 'Éclaircies' : 'Nuit voilée',
      icon: isDay ? CloudSun : CloudMoon,
      condition: isDay ? 'Passages nuageux' : 'Ciel partiellement voilé'
    };
  }
  if (code === 3) {
    return {
      label: 'Couvert',
      icon: Cloud,
      condition: 'Ciel couvert'
    };
  }
  if (code === 45 || code === 48) {
    return {
      label: 'Brume côtière',
      icon: Wind,
      condition: 'Brume & humidité'
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      label: 'Bruine légère',
      icon: CloudRain,
      condition: 'Bruine passagère'
    };
  }
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
    return {
      label: isDay ? 'Pluie côtière' : 'Averse nocturne',
      icon: CloudRain,
      condition: 'Précipitations'
    };
  }
  if (code >= 95) {
    return {
      label: 'Orage tropical',
      icon: CloudLightning,
      condition: 'Activité orageuse'
    };
  }
  return {
    label: isDay ? 'Climat doux' : 'Nuit tempérée',
    icon: isDay ? Sun : Moon,
    condition: 'Climat béninois'
  };
}

export function BeninLiveSection() {
  const [activeEventIndex, setActiveEventIndex] = useState(0);
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
    // Rafraîchissement automatique toutes les 5 minutes
    const weatherInterval = setInterval(fetchRealWeather, 300000);
    return () => {
      isMounted = false;
      clearInterval(weatherInterval);
    };
  }, [selectedCity]);

  // Défilement automatique des événements culturels
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveEventIndex((prev) => (prev + 1) % CULTURAL_EVENTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextEvent = () => {
    setActiveEventIndex((prev) => (prev + 1) % CULTURAL_EVENTS.length);
  };

  const prevEvent = () => {
    setActiveEventIndex((prev) => (prev - 1 + CULTURAL_EVENTS.length) % CULTURAL_EVENTS.length);
  };

  const weatherInfo = getWeatherInfo(weatherData.code, weatherData.isDay);
  const WeatherIcon = weatherInfo.icon;

  return (
    <section className="border-y border-foreground/10 bg-muted/40">
      {/* 1. Live Status Bar (Météo Réelle API, Heure WAT, Couleurs Marron Harmoniques) */}
      <ScrollReveal delay={0} y={20} className="border-b border-foreground/10 bg-card/75 backdrop-blur-md px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-8xl flex-wrap items-center justify-between gap-5">
          
          {/* A. Heure locale Bénin (Couleur Marron / Terracotta unifiée, sans vert) */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Clock className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-foreground tracking-tight">
                  {timeString || '22:30:00'}
                </span>
                
                {/* Badge WAT avec pulsation Marron / Terracotta */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span>WAT (GMT+1)</span>
                </span>

                {/* Statut En direct en Marron / Terracotta */}
                <span className="text-[11px] text-primary font-bold hidden sm:inline-flex items-center gap-1">
                  • En direct
                </span>
              </div>
              <p className="text-[11px] text-foreground/60">Fuseau officiel · République du Bénin</p>
            </div>
          </div>

          {/* B. Météo Réelle en Direct (Connectée à l'API Open-Meteo, Gestion Jour/Nuit) */}
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
                weatherData.isDay
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                  : 'bg-primary/10 text-primary border-primary/25'
              }`}
            >
              <WeatherIcon
                className={`h-5 w-5 ${weatherData.isDay ? 'animate-[spin_16s_linear_infinite]' : ''}`}
                strokeWidth={2}
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

              {/* Indicateurs précis : Ressenti, Humidité, Vent et Sélecteur de Ville */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-foreground/65 mt-0.5">
                <span className="flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-primary" /> Ressenti {weatherData.apparentTemp}°C
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-primary" /> {weatherData.humidity}% Humidité
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3 text-primary" /> {weatherData.windSpeed} km/h
                </span>

                {/* Sélecteur de ville béninoise pour la météo */}
                <span className="text-foreground/30">•</span>
                <div className="flex items-center gap-1 text-[11px]">
                  <MapPin className="h-3 w-3 text-primary" />
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

          {/* C. Climat & Recommandation Saisonnière */}
          <div className="hidden xl:flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary font-medium">
            <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Le Bénin vous accueille toute l'année</span>
          </div>

        </div>
      </ScrollReveal>

      {/* 2. Cultural & Touristic Events Section */}
      <div className="mx-auto max-w-8xl px-6 py-10 md:px-12">
        <ScrollReveal delay={50} y={20} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <p className="caption text-accent font-semibold tracking-wider">
              En direct du Bénin
            </p>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mt-1">
              Événements culturels & Saison touristique
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevEvent}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card hover:bg-muted text-foreground transition-colors"
              title="Événement précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextEvent}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card hover:bg-muted text-foreground transition-colors"
              title="Événement suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </ScrollReveal>

        {/* Dynamic Events Cards Grid/Row */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CULTURAL_EVENTS.slice(0, 3).map((event, idx) => {
            const isFeatured = idx === activeEventIndex % 3;
            return (
              <ScrollReveal
                key={event.id}
                delay={idx * 120}
                className="h-full"
              >
                <div
                  onClick={() => setActiveEventIndex(idx)}
                  className={`group relative h-full overflow-hidden rounded-2xl border bg-card transition-all duration-500 cursor-pointer ${
                    isFeatured
                      ? 'border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]'
                      : 'border-foreground/10 hover:border-foreground/25 hover:shadow-md'
                  }`}
                >
                  {/* Event Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
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
                      <Calendar className="h-3.5 w-3.5 text-accent" />
                      <span>{event.period}</span>
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="p-5">
                    <h4 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h4>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground/60">
                      <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span>{event.location}</span>
                    </p>

                    <p className="mt-2.5 text-xs leading-relaxed text-foreground/75 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
