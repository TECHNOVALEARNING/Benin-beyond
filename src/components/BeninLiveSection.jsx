import React, { useState, useEffect } from 'react';
import { Sun, Clock, Calendar, MapPin, ChevronLeft, ChevronRight, Wind, Droplets } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

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

export function BeninLiveSection() {
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [timeString, setTimeString] = useState('');

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

  // Défilement automatique des événements
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

  return (
    <section className="border-y border-foreground/10 bg-muted/40">
      {/* 1. Live Status Bar (Météo, Heure, Climat béninois) */}
      <ScrollReveal delay={0} y={20} className="border-b border-foreground/10 bg-card/60 backdrop-blur-sm px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-8xl flex-wrap items-center justify-between gap-4">
          {/* Heure locale Bénin */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground">
                  {timeString || '12:00:00'}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span>WAT (GMT+1)</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold hidden sm:inline">
                  • En direct
                </span>
              </div>
              <p className="text-[11px] text-foreground/60">Heure locale · Cotonou, Bénin</p>
            </div>
          </div>

          {/* Météo côtière en direct */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Sun className="h-5 w-5 animate-[spin_12s_linear_infinite]" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-base font-bold text-foreground">
                  29°C
                </span>
                <span className="text-xs text-foreground/80 font-medium">
                  Ensoleillé · Climat côtier
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-foreground/60">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-primary/70" /> 76% Humidité
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3 text-primary/70" /> 16 km/h Brise marine
                </span>
              </div>
            </div>
          </div>

          {/* Période touristique recommandée */}
          <div className="hidden lg:flex items-center rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs text-accent-foreground font-medium">
            <span>Saison propice aux séjours balnéaires et safaris dans la Pendjari</span>
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
