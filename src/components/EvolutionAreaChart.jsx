import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import { formatPrice } from '../data/initialListings';

/**
 * Calcul d'une courbe Spline Bézier cubique continue et ultra-fluide (Catmull-Rom)
 */
function getSmoothSplinePath(pts, tension = 0.35) {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    const p1 = pts[0];
    const p2 = pts[1];
    const cx = (p1.x + p2.x) / 2;
    return `M ${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q ${cx.toFixed(1)},${((p1.y + p2.y) / 2).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Composant Graphe d'Évolution Financière Ultra-Moderne
 * Design ergonomique parfaitement intégré à la charte graphique de Bénin Beyond :
 * - Double courbe ondulée (Vert Émeraude pour le Volume, Or/Ambre pour les Commissions)
 * - Remplissages d'aire semi-transparents avec gradients doux
 * - Compatible Light & Dark mode (utilise le design system bg-card / text-foreground)
 * - Tooltip flottant centré et précis avec montants en FCFA
 * - Réticule et point actif au survol
 * - Sélecteur de période dynamique en Français (6 derniers mois, 30 derniers jours, Cette année)
 */
export function EvolutionAreaChart({
  title = "Évolution des Flux Financiers",
  subtitle = "Volume d'affaires global encaissé & commissions nettes de la plateforme",
  data = [],
  valueLabel = "Volume Global (Paiements)",
  secondaryLabel = "Commissions Plateforme (10%)",
  height = 300
}) {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const periods = [
    { key: '6months', label: '6 derniers mois' },
    { key: '30days', label: '30 derniers jours' },
    { key: 'year', label: 'Cette année' }
  ];

  // Construction d'une série continue reflétant fidèlement l'activité réelle
  const chartPoints = useMemo(() => {
    // 1. Si des données réelles avec plusieurs points sont passées
    if (data && data.length >= 2) {
      return data.map((d, i) => ({
        index: i,
        label: d.label || d.month || `Mois ${i + 1}`,
        date: d.date || d.label || `Période ${i + 1}`,
        primaryValue: Math.max(0, Number(d.value) || Number(d.gmv) || Number(d.net) || 0),
        secondaryValue: Math.max(0, Number(d.secondaryValue) || Number(d.commission) || Math.round((Number(d.value) || 0) * 0.10))
      }));
    }

    // 2. Si 1 seul point existe (démarrage avec 1 réservation récente)
    if (data && data.length === 1) {
      const d = data[0];
      const gmv = Math.max(0, Number(d.value) || Number(d.gmv) || 0);
      const comm = Math.max(0, Number(d.secondaryValue) || Number(d.commission) || Math.round(gmv * 0.10));
      return [
        { index: 0, label: 'Départ', date: 'Initialisation (0 FCFA)', primaryValue: 0, secondaryValue: 0 },
        { index: 1, label: d.label || 'Actuel', date: d.date || 'Réservation récente', primaryValue: gmv, secondaryValue: comm }
      ];
    }

    // 3. Aucune réservation encore enregistrée : REFLÉTER FIDÈLEMENT LE RÉEL DU SITE
    const monthNames = ['Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre'];
    return monthNames.map((month, idx) => ({
      index: idx,
      label: month,
      date: `${month} 2026`,
      primaryValue: 0,
      secondaryValue: 0
    }));
  }, [data]);

  // Dimensions géométriques du canvas SVG adaptatives selon l'écran
  const svgWidth = isMobile ? 420 : 840;
  const svgHeight = isMobile ? 285 : height;
  const paddingLeft = isMobile ? 46 : 60;
  const paddingRight = isMobile ? 18 : 35;
  const paddingTop = isMobile ? 24 : 45;
  const paddingBottom = isMobile ? 32 : 45;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;
  const groundY = paddingTop + innerHeight;

  // Échelle max Y avec marge de 25% (ou échelle étalon de 100 000 FCFA si tout est à 0)
  const maxDataValue = useMemo(() => {
    let max = 0;
    chartPoints.forEach((p) => {
      if (p.primaryValue > max) max = p.primaryValue;
      if (p.secondaryValue > max) max = p.secondaryValue;
    });
    return max > 0 ? max * 1.25 : 100000;
  }, [chartPoints]);

  // Points coordonnés (X, Y)
  const { primaryCoords, secondaryCoords } = useMemo(() => {
    if (chartPoints.length === 0) return { primaryCoords: [], secondaryCoords: [] };

    const step = innerWidth / (chartPoints.length - 1);

    const primary = chartPoints.map((p, idx) => {
      const x = paddingLeft + idx * step;
      const ratio = Math.max(0, Math.min(1, p.primaryValue / maxDataValue));
      const y = groundY - ratio * innerHeight;
      return { x, y, ...p };
    });

    const secondary = chartPoints.map((p, idx) => {
      const x = paddingLeft + idx * step;
      const ratio = Math.max(0, Math.min(1, p.secondaryValue / maxDataValue));
      const y = groundY - ratio * innerHeight;
      return { x, y, ...p };
    });

    return { primaryCoords: primary, secondaryCoords: secondary };
  }, [chartPoints, innerWidth, innerHeight, paddingLeft, groundY, maxDataValue]);


  // Chemins SVG des vagues (Splines + Remplissages d'aire)
  const primarySpline = useMemo(() => getSmoothSplinePath(primaryCoords, 0.38), [primaryCoords]);
  const primaryArea = useMemo(() => {
    if (!primarySpline || primaryCoords.length === 0) return '';
    const first = primaryCoords[0];
    const last = primaryCoords[primaryCoords.length - 1];
    return `${primarySpline} L ${last.x.toFixed(1)},${groundY} L ${first.x.toFixed(1)},${groundY} Z`;
  }, [primarySpline, primaryCoords, groundY]);

  const secondarySpline = useMemo(() => getSmoothSplinePath(secondaryCoords, 0.38), [secondaryCoords]);
  const secondaryArea = useMemo(() => {
    if (!secondarySpline || secondaryCoords.length === 0) return '';
    const first = secondaryCoords[0];
    const last = secondaryCoords[secondaryCoords.length - 1];
    return `${secondarySpline} L ${last.x.toFixed(1)},${groundY} L ${first.x.toFixed(1)},${groundY} Z`;
  }, [secondarySpline, secondaryCoords, groundY]);

  // Point actif : au survol, ou par défaut le dernier mois (actuel)
  const activeIdx = hoveredIdx !== null ? hoveredIdx : Math.max(0, chartPoints.length - 1);
  const activePoint = primaryCoords[activeIdx] || primaryCoords[0];

  // Grille horizontale de repères (100%, 75%, 50%, 25%, 0%)
  const gridRatios = [1.0, 0.75, 0.50, 0.25, 0.0];

  // Helper pour formater les libellés de mois sur mobile (abréviations courtes et nettes)
  const getShortLabel = (label) => {
    if (!isMobile) return label;
    const map = {
      'Janvier': 'Jan', 'Février': 'Fév', 'Mars': 'Mar', 'Avril': 'Avr',
      'Mai': 'Mai', 'Juin': 'Juin', 'Juillet': 'Juil', 'Août': 'Août',
      'Septembre': 'Sept', 'Octobre': 'Oct', 'Novembre': 'Nov', 'Décembre': 'Déc'
    };
    return map[label] || (label && label.length > 5 ? label.slice(0, 4) + '.' : label);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-foreground/10 shadow-sm p-4 sm:p-6 md:p-7 text-foreground select-none transition-all">
      {/* Halo d'ambiance discret aligné sur la charte */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-amber-500/5 blur-3xl" />

      {/* TOP HEADER : TITRE + SÉLECTEUR DE PÉRIODE */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
            <h3 className="font-heading text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground">
              {title}
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs text-foreground/60 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">
            {subtitle}
          </p>
        </div>

        {/* Menu Période en Français */}
        <div className="relative self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 px-3 py-1.5 text-xs font-semibold text-foreground/80 shadow-sm transition-all active:scale-95"
          >
            <span>{periods.find((p) => p.key === selectedPeriod)?.label || '6 derniers mois'}</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 text-foreground/50 transition-transform duration-200" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-card border border-foreground/15 shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95">
              {periods.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setSelectedPeriod(p.key);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                    selectedPeriod === p.key
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground/75 hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  <span>{p.label}</span>
                  {selectedPeriod === p.key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARTOUCHE KPI ACTIF MOBILE : VALEURS VISIBLES DIRECTEMENT */}
      {activePoint && (
        <div className="sm:hidden flex items-center justify-between bg-muted/40 border border-foreground/10 rounded-xl px-3 py-2 mb-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] text-foreground/60 font-medium truncate">{activePoint.date} :</span>
            <span className="font-heading font-black text-foreground text-xs">{formatPrice(activePoint.primaryValue)}</span>
          </div>
          {activePoint.secondaryValue > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{formatPrice(activePoint.secondaryValue)}</span>
            </div>
          )}
        </div>
      )}

      {/* ZONE SVG DU GRAPHE */}
      <div className="relative w-full overflow-visible">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Gradient Vague Primaire (Émeraude / Vert Bénin Beyond) */}
            <linearGradient id="bbPrimaryAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>

            {/* Gradient Vague Secondaire (Ambre / Or Prestige) */}
            <linearGradient id="bbSecondaryAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
            </linearGradient>

            {/* Filtres de brillance douce */}
            <filter id="softGlowPrimary" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#10b981" floodOpacity="0.5" />
            </filter>
            <filter id="softGlowSecondary" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f59e0b" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Grille horizontale de repères discrets */}
          {gridRatios.map((ratio, gIdx) => {
            const y = groundY - ratio * innerHeight;
            const val = Math.round(ratio * maxDataValue);
            const labelStr = val >= 1000000 
              ? `${(val / 1000000).toFixed(1)}M` 
              : val >= 1000 
              ? `${Math.round(val / 1000)}k` 
              : `${val}`;

            return (
              <g key={gIdx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-foreground/10"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - (isMobile ? 6 : 12)}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-foreground/45 text-[10px] sm:text-[10px] font-semibold"
                >
                  {labelStr}
                </text>
              </g>
            );
          })}

          {/* AIRE 1 : Sous la courbe Secondaire (Commissions) */}
          {secondaryArea && (
            <path
              d={secondaryArea}
              fill="url(#bbSecondaryAreaGradient)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* AIRE 2 : Sous la courbe Primaire (Volume Global) */}
          {primaryArea && (
            <path
              d={primaryArea}
              fill="url(#bbPrimaryAreaGradient)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* COURBE 1 : Ligne Secondaire (Ambre / Or) */}
          {secondarySpline && (
            <path
              d={secondarySpline}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={isMobile ? "2.5" : "3"}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#softGlowSecondary)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* COURBE 2 : Ligne Primaire (Émeraude / Vert Bénin Beyond) */}
          {primarySpline && (
            <path
              d={primarySpline}
              fill="none"
              stroke="#10b981"
              strokeWidth={isMobile ? "3" : "3.5"}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#softGlowPrimary)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Réticule vertical fin guidant le regard vers le point actif */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop + (isMobile ? 5 : 10)}
              x2={activePoint.x}
              y2={groundY}
              stroke="currentColor"
              className="text-foreground/25"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Points interactifs survolables */}
          {primaryCoords.map((pt, idx) => {
            const isSelected = idx === activeIdx;

            return (
              <g key={`point-${idx}`} className="cursor-pointer">
                {/* Zone de détection tactile élargie */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isMobile ? 22 : 28}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(idx)}
                  onTouchStart={() => setHoveredIdx(idx)}
                />

                {/* Point actif avec halo lumineux */}
                {isSelected && (
                  <>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isMobile ? 11 : 14}
                      fill="#10b981"
                      fillOpacity="0.25"
                      className="animate-ping"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isMobile ? 7 : 9}
                      fill="#10b981"
                      fillOpacity="0.45"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isMobile ? 4 : 5}
                      fill="#ffffff"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />
                  </>
                )}

                {/* Libellé de l'axe X (Date / Mois) */}
                <text
                  x={pt.x}
                  y={groundY + (isMobile ? 18 : 22)}
                  textAnchor="middle"
                  fill="currentColor"
                  className={`text-[10px] sm:text-[10.5px] transition-colors ${
                    isSelected ? 'text-primary font-bold' : 'text-foreground/50 font-medium'
                  }`}
                >
                  {getShortLabel(pt.label)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* TOOLTIP FLOTTANT HARMONIEUX ET DYNAMIQUE (DESKTOP) */}
        {!isMobile && activePoint && (
          <div
            className="pointer-events-none absolute z-20 flex flex-col items-center justify-center rounded-2xl bg-card/95 border border-foreground/15 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all duration-200"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${(activePoint.y / svgHeight) * 100}%`,
              transform: 'translate(-50%, -125%)'
            }}
          >
            <span className="text-[11px] font-semibold text-foreground/60 tracking-wider">
              {activePoint.date}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-heading text-sm md:text-base font-black text-foreground tracking-tight">
                {formatPrice(activePoint.primaryValue)}
              </span>
            </div>
            {activePoint.secondaryValue > 0 && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold text-foreground/75">
                  Commissions : {formatPrice(activePoint.secondaryValue)}
                </span>
              </div>
            )}
            {/* Petit triangle pointeur vers le bas */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-card" />
          </div>
        )}
      </div>

      {/* LÉGENDE DU BAS */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
            <span className="font-semibold text-foreground/90 text-[11px] sm:text-xs">{valueLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] shrink-0" />
            <span className="font-semibold text-foreground/75 text-[11px] sm:text-xs">{secondaryLabel}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-foreground/50">
          <FontAwesomeIcon icon={faChartLine} className="h-3 w-3 text-emerald-500" />
          <span>Survolez la courbe pour inspecter les flux</span>
        </div>
      </div>
    </div>
  );
}
