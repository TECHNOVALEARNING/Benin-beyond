import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLayerGroup,
  faShieldHalved,
  faPhone,
  faCircleCheck,
  faHouse,
  faCar
} from '@fortawesome/free-solid-svg-icons';
import { getPacks } from '../services/packService';
import { PackCard } from '../components/PackCard';
import { ScrollReveal } from '../components/ScrollReveal';

export function PacksPage() {
  const [packs, setPacks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getPacks();
      setPacks(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filteredPacks = packs.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'cotonou') return p.location?.toLowerCase().includes('cotonou');
    if (filter === 'littoral') return p.location?.toLowerCase().includes('ouidah') || p.location?.toLowerCase().includes('littoral');
    if (filter === 'safari') return p.location?.toLowerCase().includes('pendjari');
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
            <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Tout inclus</div>
            <div className="text-[11px] text-foreground/60">Assurances & conciergerie</div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={140} y={15} scale={0.97} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
            <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Prise aéroport</div>
            <div className="text-[11px] text-foreground/60">Cadjehoun VIP</div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={210} y={15} scale={0.97} className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
            <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Assistance 24/7</div>
            <div className="text-[11px] text-foreground/60">Équipe locale dédiée</div>
          </div>
        </ScrollReveal>
      </div>

      {/* 3. Empty State or Packs Grid */}
      {loading ? (
        <div className="mt-16 text-center py-12 text-sm text-foreground/50">
          Chargement des formules exclusives...
        </div>
      ) : packs.length === 0 ? (
        <ScrollReveal delay={100} y={20} className="mt-12">
          <div className="rounded-3xl border border-dashed border-foreground/20 bg-card/60 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <FontAwesomeIcon icon={faLayerGroup} className="h-7 w-7" />
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              Formules Signature en Préparation
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-foreground/70 leading-relaxed">
              L'administration Bénin Beyond configure actuellement des packs combinant nos meilleures résidences privées et véhicules d'exception. En attendant, composez votre séjour sur mesure en explorant notre catalogue.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/residences"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary/90 transition-all shadow-md"
              >
                <FontAwesomeIcon icon={faHouse} className="h-3 w-3" />
                <span>Explorer les Hébergements</span>
              </Link>
              <Link
                to="/explore?type=drive"
                className="inline-flex items-center gap-2 rounded-xl border border-foreground/15 bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-all"
              >
                <FontAwesomeIcon icon={faCar} className="h-3 w-3" />
                <span>Explorer les Véhicules</span>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      ) : (
        <>
          {/* Filter Pills */}
          <ScrollReveal delay={50} y={15} className="mt-8 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-foreground text-background'
                  : 'border border-foreground/15 bg-card text-foreground hover:bg-muted'
              }`}
            >
              Tous les packs ({packs.length})
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

          {/* Packs Grid */}
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
        </>
      )}
    </div>
  );
}
