import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPause,
  faVolumeHigh,
  faVolumeXmark,
  faExpand,
  faVideo,
  faShieldHalved,
  faCircleCheck,
  faArrowUpRightFromSquare,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';
import { resolveVideoUrl, parseVideoEmbed } from '../services/mediaStorage';

export function ListingVideoPlayer({ videoUrl, poster = '', title = 'Visite immersive', compact = false }) {
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState(false);

  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);
    setHasStarted(false);

    if (!videoUrl) {
      setResolvedUrl('');
      setLoading(false);
      return;
    }

    resolveVideoUrl(videoUrl)
      .then((url) => {
        if (isMounted) {
          setResolvedUrl(url || videoUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Erreur chargement vidéo:', err);
        if (isMounted) {
          setResolvedUrl(videoUrl);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [videoUrl]);

  if (!videoUrl) return null;

  const currentUrl = resolvedUrl || videoUrl;
  const embedInfo = parseVideoEmbed(currentUrl);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setHasStarted(true);
          })
          .catch((err) => {
            console.warn('Playback error caught:', err);
            // Si le navigateur bloque l'autoplay ou nécessite une interaction
            setHasStarted(true);
          });
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const isIframeEmbed = Boolean(
    embedInfo && (
      embedInfo.type === 'youtube' ||
      embedInfo.type === 'vimeo' ||
      embedInfo.type === 'gdrive' ||
      embedInfo.type === 'dailymotion'
    )
  );

  return (
    <div className={compact ? 'h-full w-full' : 'space-y-4'}>
      {/* Header prestige (masqué si mode compact dans le hero viewer) */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent font-bold">
              <FontAwesomeIcon icon={faVideo} className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                Visite Vidéo Exclusive & Immersive
              </h3>
              <p className="text-xs text-foreground/60">
                Découvrez ce bien d'exception en mouvement et sous tous ses angles
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
            <span>Vidéo Réelle Certifiée</span>
          </span>
        </div>
      )}

      {/* Main Video Frame */}
      <div
        ref={containerRef}
        className={`group relative overflow-hidden bg-neutral-950 shadow-2xl ${
          compact ? 'h-full w-full' : 'aspect-video w-full rounded-2xl border border-foreground/15'
        }`}
      >
        {loading ? (
          <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-white/60 text-xs">
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span>Chargement de la vidéo immersive…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-900 p-6 text-center text-white/70 text-xs space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-accent/20 text-accent flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faVideo} />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Lecture externe disponible</p>
              <p className="text-[11px] text-white/60 mt-1 max-w-sm">
                Ce flux vidéo est hébergé sur un serveur externe sécurisé. Vous pouvez le visionner directement ci-dessous :
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setError(false);
                  setLoading(true);
                  setTimeout(() => setLoading(false), 500);
                }}
                className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs text-white hover:bg-white/20 transition-colors inline-flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faRotateRight} />
                <span>Réessayer</span>
              </button>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-accent px-4 py-1.5 text-xs font-bold text-neutral-950 shadow hover:bg-accent/90 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Ouvrir la vidéo</span>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px]" />
              </a>
            </div>
          </div>
        ) : isIframeEmbed ? (
          /* Lecteur Iframe Universel (YouTube, Google Drive, Vimeo, Dailymotion) */
          <iframe
            src={embedInfo.embedUrl}
            title={title}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          /* Lecteur Vidéo HTML5 natif optimisé */
          <>
            <video
              ref={videoRef}
              src={currentUrl}
              poster={poster}
              playsInline
              preload="metadata"
              controls
              crossOrigin="anonymous"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={(e) => {
                console.warn('HTML5 video error, offering external link option:', e);
                setError(true);
              }}
              className="h-full w-full object-contain bg-black"
            />

            {/* Custom Play Overlay avant lecture */}
            {!hasStarted && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all hover:bg-black/35"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-2xl transition-transform hover:scale-110 active:scale-95">
                  <FontAwesomeIcon icon={faPlay} className="ml-1 text-xl" />
                </div>
                <p className="mt-3 font-heading text-sm font-semibold text-white drop-shadow">
                  Lancer la visite immersive
                </p>
                <span className="mt-1 text-[11px] text-white/70">
                  {embedInfo?.serviceName || 'Vidéo certifiée'}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

