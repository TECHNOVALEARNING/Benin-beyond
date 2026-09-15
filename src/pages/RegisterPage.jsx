import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  Building, 
  Car, 
  CheckCircle2, 
  Info, 
  Compass 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ScrollReveal } from '../components/ScrollReveal';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [accountType, setAccountType] = useState('owner'); // default to owner to emphasize user's new request
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [assetTypes, setAssetTypes] = useState(['stay', 'drive']);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const toggleAssetType = (type) => {
    setAssetTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    const res = register({
      name,
      email,
      role: accountType,
      company: accountType === 'owner' ? company : undefined
    });

    if (res.success) {
      setSuccessMsg('Compte créé avec succès ! Préparation de votre espace...');
      setTimeout(() => {
        if (accountType === 'owner') {
          navigate('/dashboard/partner');
        } else {
          navigate('/');
        }
      }, 700);
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
            <div
              onClick={() => setAccountType('client')}
              className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                accountType === 'client'
                  ? 'border-primary bg-primary/10 ring-2 ring-primary shadow-md'
                  : 'border-foreground/10 bg-card/70 hover:border-foreground/25'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Compass className={`h-5 w-5 ${accountType === 'client' ? 'text-primary' : 'text-foreground/50'}`} />
                <span className="font-heading text-sm font-bold text-foreground">
                  Voyageur
                </span>
              </div>
              <p className="text-[11px] text-foreground/65 leading-snug">
                Pour réserver des villas, louer des véhicules et commander des packs.
              </p>
            </div>

            <div
              onClick={() => setAccountType('owner')}
              className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                accountType === 'owner'
                  ? 'border-accent bg-accent/15 ring-2 ring-accent shadow-md'
                  : 'border-foreground/10 bg-card/70 hover:border-foreground/25'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Building className={`h-5 w-5 ${accountType === 'owner' ? 'text-accent' : 'text-foreground/50'}`} />
                <span className="font-heading text-sm font-bold text-foreground">
                  Propriétaire / Hôte
                </span>
              </div>
              <p className="text-[11px] text-foreground/65 leading-snug">
                Pour louer/vendre vos logements, villas, appartements ou véhicules.
              </p>
            </div>
          </div>

          {/* Main Form Container */}
          <div className="rounded-3xl border border-foreground/10 bg-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="mb-4 rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Nom complet / Représentant
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
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
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
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
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
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
                      Types de biens que vous souhaitez proposer
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAssetType('stay')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                          assetTypes.includes('stay')
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'border-foreground/10 text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        🏡 Logements (Villas & Appartements)
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAssetType('drive')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                          assetTypes.includes('drive')
                            ? 'bg-accent/20 border-accent text-accent-foreground'
                            : 'border-foreground/10 text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        🚗 Véhicules (Location ou Vente)
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
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
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary/95 active:scale-[0.98] transition-all"
              >
                <span>
                  {accountType === 'owner'
                    ? "Activer mon espace Propriétaire"
                    : "Créer mon compte Voyageur"}
                </span>
                <ArrowRight className="h-4 w-4" />
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
