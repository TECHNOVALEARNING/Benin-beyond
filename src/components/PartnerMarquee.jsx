import React from 'react';
import { 
  Building2, 
  Plane, 
  ShieldCheck, 
  Sparkles, 
  CreditCard, 
  Landmark, 
  Palmtree, 
  Car, 
  Award 
} from 'lucide-react';

const PARTNERS = [
  {
    id: 'benin-tourisme',
    name: 'Bénin Tourisme',
    sub: 'Agence Nationale du Tourisme',
    icon: Landmark,
    accent: '#d99f2b'
  },
  {
    id: 'novotel-orisha',
    name: 'Novotel Orisha',
    sub: 'Hôtellerie 4★ Supérieur Cotonou',
    icon: Building2,
    accent: '#2a6f97'
  },
  {
    id: 'air-france',
    name: 'Air France',
    sub: 'Liaisons Premium Cotonou — Paris',
    icon: Plane,
    accent: '#012169'
  },
  {
    id: 'sobebra',
    name: 'Sobebra Prestige',
    sub: 'Art de Vivre & Terroirs',
    icon: Award,
    accent: '#c85a17'
  },
  {
    id: 'mtn-momo',
    name: 'MTN MoMo Bénin',
    sub: 'Paiement Sécurisé Sans Frais',
    icon: CreditCard,
    accent: '#ffcc00'
  },
  {
    id: 'club-med',
    name: 'Club Med Bénin',
    sub: 'Resort Éco-Luxe d’Avlo',
    icon: Palmtree,
    accent: '#2b9348'
  },
  {
    id: 'seme-city',
    name: 'Sèmè City',
    sub: 'Pôle International d’Innovation',
    icon: Sparkles,
    accent: '#9d4edd'
  },
  {
    id: 'celtiis-cash',
    name: 'Celtiis Cash',
    sub: 'Réseau National Digital',
    icon: ShieldCheck,
    accent: '#0077b6'
  },
  {
    id: 'littoral-mobility',
    name: 'Bénin VIP Drive',
    sub: 'Flotte Véhicules de Prestige',
    icon: Car,
    accent: '#bc6c25'
  }
];

export function PartnerMarquee({ className = '' }) {
  // Duplicate partners array to allow seamless 100% infinite looping
  const duplicatedPartners = [...PARTNERS, ...PARTNERS];

  return (
    <div className={`relative w-full overflow-hidden py-10 bg-secondary/30 border-y border-foreground/5 select-none ${className}`}>
      {/* Editorial Header */}
      <div className="mx-auto max-w-8xl px-6 md:px-12 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <p className="caption text-xs uppercase tracking-widest text-foreground/60 font-semibold">
            Écosystème & Partenaires Officiels de Confiance
          </p>
        </div>
        <span className="text-[11px] text-foreground/40 font-mono hidden sm:inline">
          Accréditations • Conciergerie • Hôtellerie
        </span>
      </div>

      {/* Infinite Scrolling Track */}
      <div className="relative flex w-full overflow-hidden group">
        {/* Left & Right Gradient Shadows for seamless fade in/out */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 md:w-32 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 md:w-32 bg-gradient-to-l from-background via-background/60 to-transparent" />

        {/* Marquee Wrapper with continuous animation and pause on hover */}
        <div className="flex items-center gap-6 animate-marquee shrink-0 group-hover:[animation-play-state:paused]">
          {duplicatedPartners.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.id}-${index}`}
                className="group/item flex items-center gap-3.5 rounded-2xl border border-foreground/10 bg-card/80 px-5 py-3.5 backdrop-blur-md transition-all duration-300 hover:border-accent hover:scale-[1.03] hover:shadow-lg hover:shadow-accent/10 cursor-pointer shrink-0"
              >
                {/* Brand Monogram / Icon container (ready to replace with custom SVG/PNG logo) */}
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover/item:scale-110 shadow-sm"
                  style={{
                    backgroundColor: `${item.accent}15`,
                    color: item.accent,
                    border: `1px solid ${item.accent}30`
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>

                {/* Brand Name & Subtitle */}
                <div className="flex flex-col">
                  <span className="font-heading text-sm font-bold text-foreground transition-colors group-hover/item:text-primary whitespace-nowrap">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-foreground/60 whitespace-nowrap">
                    {item.sub}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
