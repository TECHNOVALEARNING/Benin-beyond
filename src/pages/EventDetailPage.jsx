import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCalendarDays,
  faLocationDot,
  faLightbulb,
  faBed,
  faCar,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { getEventById, getEvents, sortByNextDate } from '../services/eventService';
import { useLanguage } from '../context/LanguageContext';

// Ville à proposer dans la recherche de logements (« Ouidah · Plage… » -> « Ouidah »)
const cityOf = (location) => String(location || '').split(/[·,–]/)[0].trim();

export function EventDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [event, setEvent] = useState(null);
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getEventById(id), getEvents()]).then(([found, all]) => {
      if (!active) return;
      setEvent(found);
      setOthers(sortByNextDate(all || []).filter((e) => String(e.id) !== String(id)).slice(0, 3));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <div className="h-[50vh] animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-xl px-6 py-32 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">{t('Événement introuvable')}</h1>
        <p className="mt-2 text-sm text-foreground/60">{t('Cet événement n’existe plus ou a été déplacé.')}</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
          {t("Retour à l'accueil")}
        </Link>
      </div>
    );
  }

  const paragraphs = String(event.long_description || event.description || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const city = cityOf(event.location);

  return (
    <article className="animate-fade-in">
      {/* Bandeau photo */}
      <header className="relative h-[52vh] min-h-[340px] w-full overflow-hidden bg-neutral-900 md:h-[60vh]">
        <img src={event.image} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-between px-6 py-6 text-white md:px-10 md:py-10">
          <Link to="/" className="inline-flex w-fit items-center gap-2 rounded-full bg-black/35 px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors hover:bg-black/50">
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
            <span>{t('Retour')}</span>
          </Link>
          <div>
            {event.badge && (
              <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-black">
                {event.badge}
              </span>
            )}
            <h1 className="mt-3 max-w-3xl font-heading text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">{event.title}</h1>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5 text-accent" />
                {event.period}
              </span>
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-accent" />
                {event.location}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:px-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <div>
          {event.tag && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{event.tag}</p>}
          <p className="mt-3 text-lg leading-relaxed text-foreground/85">{event.description}</p>
          {paragraphs.length > 0 && paragraphs.join('') !== event.description && (
            <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground/70">
              {paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}

          {event.tips && (
            <div className="mt-8 flex gap-3 rounded-2xl border border-foreground/10 bg-card p-5">
              <FontAwesomeIcon icon={faLightbulb} className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-semibold text-foreground">{t('Conseil pratique')}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/70">{event.tips}</p>
              </div>
            </div>
          )}
        </div>

        {/* Préparer son séjour */}
        <aside className="h-fit rounded-2xl border border-foreground/10 bg-card p-6 lg:sticky lg:top-24">
          <p className="font-heading text-base font-bold text-foreground">{t('Préparer votre venue')}</p>
          <p className="mt-1 text-sm text-foreground/60">{t('Trouvez où dormir et comment vous déplacer pour cet événement.')}</p>
          <div className="mt-5 space-y-2.5">
            <Link
              to={`/explore?type=stay${city ? `&city=${encodeURIComponent(city)}` : ''}`}
              className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faBed} className="h-3.5 w-3.5" />
                {t('Voir les logements')}
              </span>
              <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
            </Link>
            <Link
              to="/explore?type=drive"
              className="flex items-center justify-between rounded-xl border border-foreground/15 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faCar} className="h-3.5 w-3.5" />
                {t('Louer un véhicule')}
              </span>
              <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Autres événements */}
      {others.length > 0 && (
        <section className="mx-auto max-w-5xl border-t border-foreground/10 px-6 py-12 md:px-10">
          <h2 className="font-heading text-xl font-bold text-foreground">{t('À découvrir aussi')}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {others.map((o) => (
              <Link key={o.id} to={`/evenements/${encodeURIComponent(o.id)}`} className="group">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                  <img src={o.image} alt={o.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <p className="mt-2.5 text-xs text-foreground/55">{o.period}</p>
                <p className="font-heading text-sm font-bold text-foreground group-hover:text-primary">{o.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
