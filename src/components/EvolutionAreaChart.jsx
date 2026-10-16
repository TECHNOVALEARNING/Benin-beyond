import React, { useMemo, useRef, useState } from 'react';
import { formatPrice } from '../data/initialListings';

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const PERIODS = [
  { key: '30days', label: '30 jours' },
  { key: '6months', label: '6 mois' },
  { key: 'year', label: '12 mois' }
];

const VIEW_W = 720;
const VIEW_H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 52 };

/**
 * Courbe lissée monotone (Fritsch–Carlson) qui passe par chaque point :
 * aucune cassure ni angle, et jamais de dépassement sous zéro ou au-dessus d'un pic.
 */
function smoothPath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  const n = pts.length;
  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push((pts[i + 1].y - pts[i].y) / dx[i]);
  }
  // Tangentes : moyenne harmonique des pentes voisines, nulle sur un extremum
  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope[i - 1];
    const s1 = slope[i];
    m[i] = s0 * s1 <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / s0 + (dx[i] + 2 * dx[i - 1]) / s1);
  }
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    const c1x = pts[i].x + h;
    const c1y = pts[i].y + m[i] * h;
    const c2x = pts[i + 1].x - h;
    const c2y = pts[i + 1].y - m[i + 1] * h;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

function niceMax(value) {
  if (value <= 0) return 100000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= value) || 10;
  return step * magnitude;
}

function compactAmount(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)} M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)} k`;
  return String(Math.round(v));
}

/** Regroupe les transactions par jour (30 jours) ou par mois (6 / 12 mois). */
function bucketize(transactions, periodKey) {
  const now = new Date();
  const buckets = [];

  if (periodKey === '30days') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`,
        primary: 0,
        secondary: 0
      });
    }
  } else {
    const count = periodKey === 'year' ? 12 : 6;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTHS_SHORT[d.getMonth()]}${d.getMonth() === 0 || i === count - 1 ? ` ${String(d.getFullYear()).slice(2)}` : ''}`,
        primary: 0,
        secondary: 0
      });
    }
  }

  const index = new Map(buckets.map((b) => [b.key, b]));
  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    if (Number.isNaN(d.getTime())) return;
    const key = periodKey === '30days'
      ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      : `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = index.get(key);
    if (!bucket) return;
    bucket.primary += Math.max(0, Number(tx.value) || 0);
    bucket.secondary += Math.max(0, Number(tx.secondaryValue) || 0);
  });

  return buckets;
}

/**
 * Courbe d'évolution financière : montants encaissés par jour ou par mois.
 * - `transactions` : [{ date, value, secondaryValue }] (une entrée par réservation)
 * - `data` (ancien format, déjà agrégé) : [{ label, value, secondaryValue }]
 */
export function EvolutionAreaChart({
  title = 'Évolution des revenus',
  subtitle = '',
  transactions = null,
  data = [],
  valueLabel = 'Volume encaissé',
  secondaryLabel = 'Commissions'
}) {
  const [period, setPeriod] = useState('6months');
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const points = useMemo(() => {
    if (Array.isArray(transactions)) return bucketize(transactions, period);
    return (data || []).map((d, i) => ({
      key: String(i),
      label: d.label || d.month || '',
      primary: Math.max(0, Number(d.value) || 0),
      secondary: Math.max(0, Number(d.secondaryValue) || 0)
    }));
  }, [transactions, data, period]);

  const total = points.reduce((s, p) => s + p.primary, 0);
  const totalSecondary = points.reduce((s, p) => s + p.secondary, 0);

  // Variation entre la première et la seconde moitié de la période
  const half = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, half).reduce((s, p) => s + p.primary, 0);
  const secondHalf = points.slice(half).reduce((s, p) => s + p.primary, 0);
  const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : null;

  const maxY = niceMax(Math.max(...points.map((p) => Math.max(p.primary, p.secondary)), 0));
  const innerW = VIEW_W - PAD.left - PAD.right;
  const innerH = VIEW_H - PAD.top - PAD.bottom;
  const xAt = (i) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v) => PAD.top + innerH - (v / maxY) * innerH;

  const primaryPts = points.map((p, i) => ({ x: xAt(i), y: yAt(p.primary) }));
  const secondaryPts = points.map((p, i) => ({ x: xAt(i), y: yAt(p.secondary) }));
  const primaryLine = smoothPath(primaryPts);
  const areaPath = primaryPts.length > 1
    ? `${primaryLine} L ${primaryPts[primaryPts.length - 1].x},${PAD.top + innerH} L ${primaryPts[0].x},${PAD.top + innerH} Z`
    : '';

  const labelEvery = points.length > 12 ? 5 : 1;
  const active = hoverIdx !== null ? points[hoverIdx] : null;

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const ratio = (x - PAD.left) / innerW;
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  return (
    <section className="rounded-2xl border border-foreground/10 bg-card p-5 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-foreground/50">{subtitle}</p>}
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-heading text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatPrice(active ? active.primary : total)}
            </span>
            {active ? (
              <span className="text-xs text-foreground/50">{active.label}</span>
            ) : trend !== null ? (
              <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend >= 0 ? '+' : ''}{trend}% sur la période
              </span>
            ) : (
              <span className="text-xs text-foreground/50">sur la période</span>
            )}
          </div>
        </div>

        {Array.isArray(transactions) && (
          <div className="inline-flex shrink-0 rounded-lg bg-muted p-0.5 text-xs" role="tablist" aria-label="Période">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={period === p.key}
                onClick={() => { setPeriod(p.key); setHoverIdx(null); }}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  period === p.key ? 'bg-card text-foreground shadow-sm' : 'text-foreground/55 hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="relative mt-5">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full overflow-visible"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
          role="img"
          aria-label={`${title} : ${formatPrice(total)} sur la période`}
        >
          <defs>
            <linearGradient id="bb-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.12" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Repères horizontaux */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const y = PAD.top + innerH - r * innerH;
            return (
              <g key={r}>
                <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={y} y2={y} stroke="currentColor" className="text-foreground/[0.07]" strokeDasharray={r === 0 ? undefined : '3 4'} />
                <text x={PAD.left - 10} y={y + 3.5} textAnchor="end" className="fill-foreground/40" fontSize="10.5">
                  {compactAmount(maxY * r)}
                </text>
              </g>
            );
          })}

          {/* Libellés de l'axe X */}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text key={p.key} x={xAt(i)} y={VIEW_H - 8} textAnchor="middle" className="fill-foreground/40" fontSize="10.5">
                {p.label}
              </text>
            ) : null
          )}

          {areaPath && <path d={areaPath} fill="url(#bb-chart-fill)" />}

          {/* Commissions : ligne fine en pointillés */}
          <path d={smoothPath(secondaryPts)} fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />

          {/* Volume : courbe principale */}
          <path d={primaryLine} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />

          {hoverIdx !== null && (
            <g>
              <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={PAD.top} y2={PAD.top + innerH} stroke="currentColor" className="text-foreground/15" />
              <circle cx={xAt(hoverIdx)} cy={yAt(points[hoverIdx].secondary)} r="3" fill="hsl(var(--card))" stroke="hsl(var(--accent))" strokeWidth="1.5" />
              <circle cx={xAt(hoverIdx)} cy={yAt(points[hoverIdx].primary)} r="4" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
            </g>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-foreground/10 bg-card px-3 py-2 text-xs shadow-md"
            style={{ left: `${(xAt(hoverIdx) / VIEW_W) * 100}%` }}
          >
            <p className="font-medium text-foreground">{active.label}</p>
            <p className="mt-1 flex items-center gap-1.5 text-foreground/70">
              <span className="h-0.5 w-3 rounded bg-primary" />
              {formatPrice(active.primary)}
            </p>
            <p className="flex items-center gap-1.5 text-foreground/70">
              <span className="h-0.5 w-3 rounded bg-accent" />
              {formatPrice(active.secondary)}
            </p>
          </div>
        )}
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-foreground/55">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded bg-primary" />
          {valueLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0 w-4 border-t-[1.5px] border-dashed border-accent" />
          {secondaryLabel} · {formatPrice(totalSecondary)}
        </span>
      </footer>
    </section>
  );
}

export default EvolutionAreaChart;
