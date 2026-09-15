import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const MEDIA_BASE = "https://media.base44.com/images/public/6a7561b29fa797d5bba5f614";

const HERO_PANELS = [
  {
    key: 'stay',
    label: 'Séjourner',
    sub: 'Villas & appartements',
    to: '/explore?type=stay',
    img: `${MEDIA_BASE}/c5a6a8d83_generated_62656531.png`
  },
  {
    key: 'drive',
    label: 'Conduire',
    sub: 'SUV & berlines',
    to: '/explore?type=drive',
    img: `${MEDIA_BASE}/786f87a7e_generated_f72ae80f.png`
  },
  {
    key: 'discover',
    label: 'Découvrir',
    sub: 'Expériences & tours',
    to: '/explore?type=discover',
    img: `${MEDIA_BASE}/06b54fa79_generated_43e6e90f.png`
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
