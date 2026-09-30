import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faArrowTrendUp,
  faArrowTrendDown,
  faMinus,
  faCalendarCheck,
  faCircleCheck,
  faBan
} from '@fortawesome/free-solid-svg-icons';
import { formatPrice } from '../data/initialListings';

/**
 * Composant de Graphe d'Évolution Premium (Spline SVG + Gradient sous la courbe)
 * Remplace les anciens graphes en bâtons par une courbe continue et interactive,
 * reflétant fidèlement chaque achat (montée), absence d'achat (plateau) et annulation (baisse).
 */
export function EvolutionAreaChart({
  title = "Évolution Financière",
  subtitle = "Courbe d'évolution réelle selon les transactions enregistrées",
  data = [], // Array of { label, date, value, secondaryValue, count, changeType: 'up' | 'down' | 'flat' }
  valueLabel = "Revenu",
  secondaryLabel = "Commission (10%)",
  colorTheme = "emerald", // 'emerald' | 'amber' | 'primary'
  emptyMessage = "Aucune transaction enregistrée pour l'instant",
  emptySubtext = "La courbe d'évolution s'activera et tracera vos paliers en direct dès la première transaction.",
  height = 260
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Normalize data points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, i) => ({
      index: i,
      label: d.label || d.month || `Période ${i + 1}`,
      date: d.date || d.label || '',
      value: Math.max(0, Number(d.value) || Number(d.gmv) || Number(d.net) || 0),
      secondaryValue: Math.max(0, Number(d.secondaryValue) || Number(d.commission) || 0),
      count: d.count || d.bookingsCount || 1,
      changeType: d.changeType || 'flat'
    }));
  }, [data]);

  // Dimensions SVG
  const svgWidth = 800;
  const svgHeight = height;
  const paddingX = 45;
  const paddingTop = 35;
  const paddingBottom = 40;
  const innerWidth = svgWidth - paddingX * 2;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxValue = useMemo(() => {
    if (points.length === 0) return 100000;
    const max = Math.max(...points.map((p) => p.value));
    return max > 0 ? max * 1.15 : 100000;
  }, [points]);

  const minValue = 0;

  // Calcul des coordonnées (X, Y) pour chaque point
  const coords = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) {
      const y = paddingTop + innerHeight - (points[0].value / maxValue) * innerHeight;
      return [
        { x: paddingX + innerWidth * 0.2, y, ...points[0] },
        { x: paddingX + innerWidth * 0.8, y, ...points[0] }
      ];
    }

    const step = innerWidth / (points.length - 1);
    return points.map((p, idx) => {
      const x = paddingX + idx * step;
      const ratio = Math.max(0, Math.min(1, (p.value - minValue) / (maxValue - minValue)));
      const y = paddingTop + innerHeight - ratio * innerHeight;
      return { x, y, ...p };
    });
  }, [points, innerWidth, innerHeight, paddingX, paddingTop, maxValue, minValue]);

  // Construction de la courbe Bézier fluide (Spline)
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: '', areaPath: '' };
    if (coords.length === 1) {
      const p = coords[0];
      return {
        linePath: `M ${p.x},${p.y}`,
        areaPath: `M ${p.x},${p.y} L ${p.x},${paddingTop + innerHeight} Z`
      };
    }

    let dLine = `M ${coords[0].x},${coords[0].y}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = i > 0 ? coords[i - 1] : coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

      // Facteur de tension pour une courbure douce
      const tension = 0.2;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      dLine += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const groundY = paddingTop + innerHeight;
    const dArea = `${dLine} L ${last.x},${groundY} L ${first.x},${groundY} Z`;

    return { linePath: dLine, areaPath: dArea };
  }, [coords, paddingTop, innerHeight]);

  // Valeur active à afficher (soit survolée, soit la plus récente)
  const activePoint = hoveredIdx !== null && coords[hoveredIdx]
    ? coords[hoveredIdx]
    : coords[coords.length - 1] || null;

  // Calcul du taux d'évolution entre le premier et dernier point
  const trendPercent = useMemo(() => {
    if (points.length < 2) return null;
    const first = points[0].value;
    const last = points[points.length - 1].value;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="rounded-3xl border border-foreground/10 bg-card p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-primary" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-foreground/60 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="h-56 rounded-2xl bg-muted/20 border border-dashed border-foreground/15 flex flex-col items-center justify-center p-6 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faChartLine} className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">{emptyMessage}</p>
          <p className="text-xs text-foreground/60 mt-1 max-w-md leading-relaxed">
            {emptySubtext}
          </p>
        </div>
      </div>
    );
  }

  // Grille horizontale de repères
  const gridSteps = [1, 0.66, 0.33, 0];

  return (
    <div className="rounded-3xl border border-foreground/10 bg-card p-6 md:p-8 shadow-sm transition-all">
      {/* Header bar du graphique avec métrique principale en temps réel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-foreground/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
            </span>
            <h3 className="font-heading text-base font-bold text-foreground">
              {title}
            </h3>
          </div>
          <p className="text-xs text-foreground/60 mt-1">{subtitle}</p>
        </div>

        {/* Live Active Value Banner */}
        {activePoint && (
          <div className="flex items-center gap-4 bg-muted/30 border border-foreground/10 rounded-2xl px-4 py-2 self-start sm:self-auto">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold block">
                {activePoint.label} · {valueLabel}
              </span>
              <span className="font-heading text-lg font-black text-primary">
                {formatPrice(activePoint.value)}
              </span>
            </div>

            {activePoint.secondaryValue > 0 && (
              <div className="border-l border-foreground/10 pl-3">
                <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold block">
                  {secondaryLabel}
                </span>
                <span className="font-heading text-sm font-bold text-accent">
                  {formatPrice(activePoint.secondaryValue)}
                </span>
              </div>
            )}

            {trendPercent !== null && (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  trendPercent >= 0
                    ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                }`}
                title="Taux d'évolution calculé"
              >
                <FontAwesomeIcon icon={trendPercent >= 0 ? faArrowTrendUp : faArrowTrendDown} className="h-3 w-3" />
                <span>{trendPercent >= 0 ? `+${trendPercent}%` : `${trendPercent}%`}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SVG Canvas interactif */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
          style={{ minHeight: `${height}px` }}
        >
          <defs>
            {/* Gradient sous la courbe */}
            <linearGradient id="areaGradientEmerald" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B4D3C" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#0B4D3C" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#0B4D3C" stopOpacity="0.00" />
            </linearGradient>

            {/* Gradient de la ligne principale */}
            <linearGradient id="lineGradientEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0B4D3C" />
              <stop offset="50%" stopColor="#C99700" />
              <stop offset="100%" stopColor="#0B4D3C" />
            </linearGradient>

            {/* Filtre de brillance (glow) pour les points interactifs */}
            <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#C99700" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Lignes de repère horizontales (Grid) */}
          {gridSteps.map((ratio, gIdx) => {
            const y = paddingTop + innerHeight - ratio * innerHeight;
            const val = Math.round(ratio * maxValue);
            return (
              <g key={gIdx} className="transition-opacity">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="currentColor"
                  fillOpacity="0.4"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatPrice(val)}
                </text>
              </g>
            );
          })}

          {/* Aire sous la courbe avec gradient */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#areaGradientEmerald)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Ligne fluide principale */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineGradientEmerald)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Ligne verticale de réticule (Crosshair) au survol */}
          {hoveredIdx !== null && coords[hoveredIdx] && (
            <line
              x1={coords[hoveredIdx].x}
              y1={paddingTop}
              x2={coords[hoveredIdx].x}
              y2={paddingTop + innerHeight}
              stroke="#C99700"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity="0.8"
            />
          )}

          {/* Points de données et zones interactives */}
          {coords.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            const isLast = idx === coords.length - 1;

            return (
              <g key={idx} className="cursor-pointer">
                {/* Zone de contact tactile large pour le hover */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={22}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(idx)}
                />

                {/* Halo lumineux au hover ou sur le dernier point */}
                {(isHovered || isLast) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 8 : 6}
                    fill="#C99700"
                    fillOpacity="0.25"
                    className="animate-ping"
                  />
                )}

                {/* Point extérieur */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4.5}
                  fill={isHovered ? "#C99700" : "#0B4D3C"}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  filter={isHovered ? "url(#pointGlow)" : undefined}
                  className="transition-all duration-200"
                />

                {/* Libellé sur l'axe X (Date / Mois) */}
                <text
                  x={pt.x}
                  y={paddingTop + innerHeight + 22}
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity={isHovered ? "1" : "0.65"}
                  fontSize={isHovered ? "11.5" : "10.5"}
                  fontWeight={isHovered ? "bold" : "500"}
                  className="transition-all"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Info Legend en bas */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/60 border-t border-foreground/10 pt-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-full bg-gradient-to-r from-primary via-accent to-primary" />
              <span>{valueLabel}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span>{secondaryLabel}</span>
            </span>
          </div>

          <span className="text-[11px] text-foreground/50">
            Survolez les points pour consulter les détails par palier
          </span>
        </div>
      </div>
    </div>
  );
}
