import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Mail, 
  Crown, 
  Building, 
  UserCheck, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ScrollReveal } from '../components/ScrollReveal';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('client');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Destination after login
  const from = location.state?.from?.pathname || null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    const res = login(email, password, selectedRole);
    if (res.success) {
      setSuccessMsg('Connexion réussie ! Redirection en cours...');
      setTimeout(() => {
        if (from) {
          navigate(from);
        } else if (res.user.role === 'admin') {
          navigate('/admin');
        } else if (res.user.role === 'owner') {
          navigate('/dashboard/partner');
        } else {
          navigate('/');
        }
      }, 600);
    }
  };

  const handleQuickDemo = (role) => {
    const demoUser = loginAsDemo(role);
    setSuccessMsg(`Session Démo activée (${demoUser.name}) ! Redirection...`);
    setTimeout(() => {
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'owner') {
        navigate('/dashboard/partner');
      } else {
        navigate('/');
      }
    }, 400);
  };

  return (
    <div className="relative min-h-[90vh] w-full flex items-center justify-center px-4 py-16">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <ScrollReveal delay={0} y={20}>
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <span className="font-heading text-3xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
                Bénin Beyond
              </span>
            </Link>
            <p className="caption text-xs uppercase tracking-widest text-accent font-semibold mt-2">
              Portail Authentification
            </p>
            <h1 className="font-heading text-2xl font-bold text-foreground mt-2">
              Connexion à votre espace
            </h1>
            <p className="text-xs text-foreground/60 mt-1.5">
              Accédez à vos réservations, gérez vos biens ou administrez la plateforme
            </p>
          </div>

          {/* 1-Click Demo Sandbox Banner */}
          <div className="mb-6 rounded-2xl border border-accent/40 bg-accent/10 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-accent animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Accès Démo Immédiat (1-Clic)
              </span>
            </div>
            <p className="text-[11px] text-foreground/75 mb-3 leading-relaxed">
              Testez immédiatement toutes les fonctionnalités sans saisir de mot de passe :
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/15 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
              >
                <Crown className="h-3.5 w-3.5 shrink-0" />
                <span>Démo Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('owner')}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent/20 px-3 py-2.5 text-xs font-semibold text-accent-foreground hover:bg-accent hover:text-black transition-all shadow-sm active:scale-95"
              >
                <Building className="h-3.5 w-3.5 shrink-0" />
                <span>Démo Propriétaire</span>
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border border-foreground/10 bg-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Feedback messages */}
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
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-2">
                  Profil de connexion
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/60 p-1 border border-foreground/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('client')}
                    className={`rounded-lg py-1.5 font-medium transition-all ${
                      selectedRole === 'client'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Voyageur
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('owner')}
                    className={`rounded-lg py-1.5 font-medium transition-all ${
                      selectedRole === 'owner'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Propriétaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`rounded-lg py-1.5 font-medium transition-all ${
                      selectedRole === 'admin'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre.email@domaine.com"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-foreground/80">
                    Mot de passe
                  </label>
                  <span className="text-[11px] text-primary/80 hover:text-primary cursor-pointer">
                    Mot de passe oublié ?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary/95 active:scale-[0.98] transition-all"
              >
                <span>Se connecter</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {/* Switch to Register */}
            <div className="mt-6 text-center text-xs text-foreground/60 border-t border-foreground/10 pt-4">
              <span>Vous n'avez pas encore de compte ? </span>
              <Link
                to="/register"
                className="font-semibold text-primary hover:underline"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
