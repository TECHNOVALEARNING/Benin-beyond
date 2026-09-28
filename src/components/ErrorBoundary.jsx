import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faRotateRight,
  faHouse,
  faShieldHalved
} from '@fortawesome/free-solid-svg-icons';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Bénin Beyond Error Boundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12">
          <div className="max-w-md w-full bg-card border border-foreground/15 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl">
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
                Bénin Beyond Résilience
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground">
                Affichage momentanément interrompu
              </h2>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Une interruption d'affichage a été interceptée pour préserver l'intégrité de vos données. Cliquez sur le bouton ci-dessous pour relancer l'application en toute sécurité.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-muted/40 rounded-xl text-left border border-foreground/10 text-[11px] font-mono text-foreground/70 break-all max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-all"
              >
                <FontAwesomeIcon icon={faRotateRight} className="h-3.5 w-3.5" />
                Actualiser la page
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/20 bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-all"
              >
                <FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5 text-foreground/50" />
                Page d'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
