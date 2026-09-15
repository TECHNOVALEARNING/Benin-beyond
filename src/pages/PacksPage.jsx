import React, { useState } from 'react';
import { Layers, ShieldCheck, Sparkles, PhoneCall, CheckCircle2 } from 'lucide-react';
import { COMBINED_PACKS } from '../data/packsData';
import { PackCard } from '../components/PackCard';
import { ScrollReveal } from '../components/ScrollReveal';

export function PacksPage() {
  const [filter, setFilter] = useState('all');

  const filteredPacks = COMBINED_PACKS.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'cotonou') return p.location.toLowerCase().includes('cotonou');
    if (filter === 'littoral') return p.location.toLowerCase().includes('ouidah') || p.location.toLowerCase().includes('littoral');
    if (filter === 'safari') return p.location.toLowerCase().includes('pendjari');
    return true;
  });

  return (
    <div className="mx-auto max-w-8xl px-6 py-12 md:px-12 md:py-16">
      {/* 1. Page Header */}
      <ScrollReveal delay={0} y={20} className="border-t border-foreground/15 pt-6">
        <p className="caption text-primary font-semibold tracking-wider text-xs">
          Formules Tout-en-un
        </p>
        <h1 className="font-heading mt-2 text-2xl sm:text-3xl font-bold text-foreground">
          Packs Combinés Hébergement & Mobilité
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/70">
          Associez nos villas et lofts d’exception à des véhicules tout-terrain, berlines avec chauffeur ou visites patrimoniales privées. Profitez d’une économie immédiate et d’une prise en charge VIP dès votre arrivée au Bénin.
        </p>
      </ScrollReveal>

      {/* 2. Perks Strip with staggered entry */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-2xl border border-foreground/10 bg-card p-4 sm:p-5 shadow-sm">
        <ScrollReveal delay={0} y={15} scale={0.97} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground font-bold">
            %
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Tarif remisé</div>
            <div className="text-[11px] text-foreground/60">Jusqu'à -35 000 FCFA/j</div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={70} y={15} scale={0.97} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Tout inclus</div>
            <div className="text-[11px] text-foreground/60">Assurances & conciergerie</div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={140} y={15} scale={0.97} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Prise aéroport</div>
            <div className="text-[11px] text-foreground/60">Cadjehoun VIP</div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={210} y={15} scale={0.97} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Assistance 24/7</div>
            <div className="text-[11px] text-foreground/60">Équipe locale dédiée</div>
          </div>
        </ScrollReveal>
      </div>

      {/* 3. Filter Pills */}
      <ScrollReveal delay={50} y={15} className="mt-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-foreground text-background'
              : 'border border-foreground/15 bg-card text-foreground hover:bg-muted'
          }`}
        >
          Tous les packs ({COMBINED_PACKS.length})
        </button>
        <button
          onClick={() => setFilter('cotonou')}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
            filter === 'cotonou'
              ? 'bg-foreground text-background'
              : 'border border-foreground/15 bg-card text-foreground hover:bg-muted'
          }`}
        >
          Cotonou & Littoral
        </button>
        <button
          onClick={() => setFilter('littoral')}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
            filter === 'littoral'
              ? 'bg-foreground text-background'
              : 'border border-foreground/15 bg-card text-foreground hover:bg-muted'
          }`}
        >
          Ouidah & Océan
        </button>
        <button
          onClick={() => setFilter('safari')}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
            filter === 'safari'
              ? 'bg-foreground text-background'
              : 'border border-foreground/15 bg-card text-foreground hover:bg-muted'
          }`}
        >
          Safari & Grand Nord
        </button>
      </ScrollReveal>

      {/* 4. Packs Grid */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {filteredPacks.map((pack, idx) => (
          <ScrollReveal
            key={pack.id}
            delay={(idx % 2) * 120}
            className="h-full"
          >
            <PackCard pack={pack} />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
