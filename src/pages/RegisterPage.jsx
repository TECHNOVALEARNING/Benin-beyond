import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCompass,
  faBuilding,
  faCircleInfo,
  faCircleCheck,
  faUser,
  faEnvelope,
  faLock,
  faArrowRight,
  faHouse,
  faCar,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ScrollReveal } from '../components/ScrollReveal';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loginWithGoogle, user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const initialType = searchParams.get('type') === 'owner' ? 'owner' : 'client';
  const [accountType, setAccountType] = useState(initialType);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [assetTypes, setAssetTypes] = useState(['stay', 'drive']);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Redirection automatique si déjà connecté ou suite à redirection OAuth Google
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'owner' || user.role === 'partner') {
        navigate('/dashboard/partner', { replace: true });
      } else if (user.role === 'client') {
        navigate('/dashboard/client', { replace: true });
      }
    }
  }, [user, navigate]);

  const toggleAssetType = (type) => {
    setAssetTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name || !email || !password) {
      setError('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name,
        email,
        role: accountType,
        company: accountType === 'owner' ? company : undefined,
        password
      });

      if (res.success) {
        setSuccessMsg('Compte initialisé avec succès ! Redirection en cours...');
        setTimeout(() => {
          if (res.user.role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (res.user.role === 'owner' || res.user.role === 'partner') {
            navigate('/dashboard/partner', { replace: true });
          } else {
            navigate('/dashboard/client', { replace: true });
          }
        }, 400);
      } else {
        setError(res.error || "Impossible de créer le compte.");
      }
    } catch (err) {
      setError("Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      const res = await loginWithGoogle(accountType, company);
      if (res?.success && res.user) {
        if (res.user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (res.user.role === 'owner' || res.user.role === 'partner') {
          navigate('/dashboard/partner', { replace: true });
        } else {
          navigate('/dashboard/client', { replace: true });
        }
      } else if (res?.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion Google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="relative min-h-[90vh] w-full flex items-center justify-center px-4 py-16">
      {/* Background Ambience */}
      <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <ScrollReveal delay={0} y={20}>
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <span className="font-heading text-3xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
                Bénin Beyond
              </span>
            </Link>
            <p className="caption text-xs uppercase tracking-widest text-accent font-semibold mt-2">
              Rejoindre l'écosystème
            </p>
            <h1 className="font-heading text-2xl font-bold text-foreground mt-2">
              Créer votre compte
            </h1>
            <p className="text-xs text-foreground/60 mt-1.5 max-w-sm mx-auto">
              Rejoignez le réseau de référence pour voyager ou valoriser vos biens au Bénin
            </p>
          </div>

          {/* Account Type Selection Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setAccountType('client')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                accountType === 'client'
                  ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary'
                  : 'border-foreground/10 bg-card/60 hover:bg-card'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FontAwesomeIcon icon={faCompass} className="text-primary h-4 w-4" />
                <span className="font-semibold text-xs text-foreground">Voyageur Privé</span>
              </div>
              <p className="text-[11px] text-foreground/60">
                Réservations, conciergerie VIP & e-vouchers
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('owner')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                accountType === 'owner'
                  ? 'border-accent bg-accent/10 shadow-md ring-1 ring-accent'
                  : 'border-foreground/10 bg-card/60 hover:bg-card'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FontAwesomeIcon icon={faBuilding} className="text-accent h-4 w-4" />
                <span className="font-semibold text-xs text-foreground">Partenaire Pro</span>
              </div>
              <p className="text-[11px] text-foreground/60">
                Hôtels, Villas de prestige & Flotte automobile
              </p>
            </button>
          </div>

          {/* Main Form Container */}
          <div className="rounded-3xl border border-foreground/10 bg-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="mb-4 rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2">
                <FontAwesomeIcon icon={faCircleInfo} className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google Quick Button */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loadingGoogle || loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-foreground/15 bg-white text-gray-800 py-3 text-sm font-semibold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingGoogle ? 'Connexion Google...' : 'Continuer avec Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-foreground/10" />
              <span className="absolute bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-foreground/50">
                ou avec vos coordonnées
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Nom complet / Représentant
                </label>
                <div className="relative">
                  <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Patrice Hounkpati"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Adresse e-mail professionnelle ou personnelle
                </label>
                <div className="relative">
                  <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patrice@domaine.com"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Specific fields for Owners */}
              {accountType === 'owner' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                      Nom de votre société ou agence (optionnel)
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon icon={faBuilding} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Ex: Cotonou Luxury Living / Prestige Auto"
                        className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                      Catégorie de votre établissement / activité
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAssetType('hotel')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                          assetTypes.includes('hotel')
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'border-foreground/10 text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        <FontAwesomeIcon icon={faBuilding} className="h-3 w-3 text-primary" />
                        <span>Hôtel / Établissement Hôtelier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAssetType('stay')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                          assetTypes.includes('stay')
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'border-foreground/10 text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        <FontAwesomeIcon icon={faHouse} className="h-3 w-3 text-primary" />
                        <span>Villa & Appartement Privé</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAssetType('drive')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                          assetTypes.includes('drive')
                            ? 'bg-accent/20 border-accent text-accent-foreground'
                            : 'border-foreground/10 text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        <FontAwesomeIcon icon={faCar} className="h-3 w-3 text-accent" />
                        <span>Véhicules & Flotte VIP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAssetType('restaurant')}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                          assetTypes.includes('restaurant')
                            ? 'bg-amber-500/20 border-amber-500 text-amber-700'
                            : 'border-foreground/10 text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        <FontAwesomeIcon icon={faCompass} className="h-3 w-3 text-amber-600" />
                        <span>Restaurant & Gastronomie</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Traveler Frictionless Advice */}
              {accountType === 'client' && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground/75 leading-relaxed">
                  <p className="font-semibold text-primary mb-1">
                    💡 Bon à savoir pour les voyageurs :
                  </p>
                  <p>
                    Dès votre première réservation ou commande (villa, hôtel ou véhicule VIP), votre espace client et vos vouchers officiels sont automatiquement activés avec votre adresse e-mail !
                  </p>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || loadingGoogle}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary/95 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
                    <span>Création du compte...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {accountType === 'owner'
                        ? "Activer mon espace Propriétaire"
                        : "Créer mon compte Voyageur"}
                    </span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Login */}
            <div className="mt-6 text-center text-xs text-foreground/60 border-t border-foreground/10 pt-4">
              <span>Vous avez déjà un compte ? </span>
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Se connecter
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
