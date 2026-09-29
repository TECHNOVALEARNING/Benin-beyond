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
  faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import { resolveVideoUrl, parseVideoEmbed } from '../services/mediaStorage';

export function ListingVideoPlayer({ videoUrl, poster = '', title = 'Visite immersive' }) {
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState(false);

  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);

    if (!videoUrl) {
      setResolvedUrl('');
      setLoading(false);
      return;
    }

    resolveVideoUrl(videoUrl)
      .then((url) => {
        if (isMounted) {
          if (!url) {
            setError(true);
          } else {
            setResolvedUrl(url);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Erreur chargement vidéo:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [videoUrl]);

  if (!videoUrl) return null;

  const embedInfo = parseVideoEmbed(resolvedUrl || videoUrl);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setHasStarted(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      {/* Header prestige */}
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

      {/* Main Video Frame */}
      <div
        ref={containerRef}
        className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-950 border border-foreground/15 shadow-2xl"
      >
        {loading ? (
          <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-white/60 text-xs">
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span>Chargement de la vidéo immersive…</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-900 p-6 text-center text-white/60 text-xs">
            <FontAwesomeIcon icon={faVideo} className="text-2xl text-accent mb-2" />
            <p className="font-semibold text-white">Vidéo temporairement indisponible</p>
            <p className="text-[11px] text-white/50 mt-1 max-w-sm">
              Le flux vidéo est en cours de traitement ou le fichier est en cours de synchronisation.
            </p>
          </div>
        ) : embedInfo && (embedInfo.type === 'youtube' || embedInfo.type === 'vimeo') ? (
          /* Iframe pour YouTube ou Vimeo */
          <iframe
            src={embedInfo.embedUrl}
            title={title}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          /* Lecteur Vidéo HTML5 natif optimisé */
          <>
            <video
              ref={videoRef}
              src={resolvedUrl}
              poster={poster}
              playsInline
              preload="metadata"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setError(true)}
              className="h-full w-full object-contain bg-black"
            />

            {/* Custom Play Overlay avant lecture */}
            {!hasStarted && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all hover:bg-black/30"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-2xl transition-transform hover:scale-110 active:scale-95">
                  <FontAwesomeIcon icon={faPlay} className="ml-1 text-xl" />
                </div>
                <p className="mt-3 font-heading text-sm font-semibold text-white drop-shadow">
                  Lancer la visite immersive
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
