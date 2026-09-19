import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const HERO_PANELS = [
  {
    key: 'stay',
    label: 'Séjourner',
    sub: 'Villas & appartements',
    to: '/explore?type=stay',
    img: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'
  },
  {
    key: 'drive',
    label: 'Conduire',
    sub: 'SUV & berlines',
    to: '/explore?type=drive',
    img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
  },
  {
    key: 'discover',
    label: 'Découvrir',
    sub: 'Expériences & tours',
    to: '/explore?type=discover',
    img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80'
  }
];

export function HeroSection() {
  const [hoveredKey, setHoveredKey] = useState(null);

  return (
    <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-secondary">
      <div className="flex h-full flex-col md:flex-row">
        {HERO_PANELS.map((panel) => {
          const isHovered = hoveredKey === panel.key;

          return (
            <Link
              key={panel.key}
              to={panel.to}
              onMouseEnter={() => setHoveredKey(panel.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="group relative h-1/3 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:h-full md:flex-1"
              style={{ flexGrow: isHovered ? 3 : 1 }}
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                style={{ backgroundImage: `url(${panel.img})` }}
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/95 via-secondary/40 to-transparent transition-opacity duration-500 group-hover:from-primary/85" />

              {/* Panel Content */}
              <div className="relative flex h-full flex-col justify-end p-6 md:p-10 z-10">
                <p className="caption text-accent">{panel.sub}</p>
                <h2 className="section-title mt-2 text-3xl leading-none text-white md:text-4xl">
                  {panel.label}
                </h2>
                <div className="mt-4 flex items-center gap-2 text-sm text-white/0 transition-all duration-500 group-hover:text-white/90">
                  <span className="caption">Explorer</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </div>
              </div>

              {/* Separator line */}
              <div className="absolute left-0 top-0 h-full w-px bg-white/20 hidden md:block" />
            </Link>
          );
        })}
      </div>

      {/* Top Branding Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-6 pt-8 md:px-12">
        <div className="flex items-baseline justify-between">
          <span className="section-title text-xl text-white tracking-wide">
            Bénin Beyond
          </span>
          <span className="caption hidden text-white/75 md:block">
            L'art de voyager au Bénin
          </span>
        </div>
      </div>
    </section>
  );
}
