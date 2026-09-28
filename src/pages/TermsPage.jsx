import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faScaleBalanced,
  faHandshake,
  faHouse,
  faCar,
  faShieldHalved,
  faArrowLeft,
  faCircleCheck,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { ScrollReveal } from '../components/ScrollReveal';

export function TermsPage() {
  const lastUpdated = '28 Septembre 2026';

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:px-12 md:py-16">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-foreground/60 hover:text-primary transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-[11px]" />
          <span>Retour à l'accueil</span>
        </Link>
      </div>

      {/* Page Header */}
      <ScrollReveal delay={0} y={20} className="border-t border-foreground/15 pt-6">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-accent font-heading">
          <FontAwesomeIcon icon={faScaleBalanced} className="h-3.5 w-3.5" />
          <span>Cadre contractuel & utilisation</span>
        </div>
        <h1 className="font-heading mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          Conditions Générales d'Utilisation (CGU)
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground/70 max-w-3xl">
          Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de la plateforme <strong>Bénin Beyond</strong>, tant pour les voyageurs explorant nos offres que pour les partenaires et propriétaires référençant des hébergements ou véhicules d'exception.
        </p>
        <p className="mt-2 text-xs text-foreground/50">
          Dernière mise à jour : {lastUpdated} • Applicable en République du Bénin.
        </p>
      </ScrollReveal>

      {/* Key Guarantees Strip */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-xs">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faHandshake} className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-foreground">Intermédiaire de confiance</h3>
          <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
            Bénin Beyond garantit la sécurité des transactions et la conformité des biens référencés sur son catalogue.
          </p>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-xs">
          <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-foreground">Audit & Sélection rigoureuse</h3>
          <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
            Chaque hébergement et chaque véhicule fait l'objet d'une vérification préalable (qualité visuelle, IFU, conformité).
          </p>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-xs">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-foreground">Assistance Conciergerie 7j/7</h3>
          <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
            Une équipe dédiée accompagne chaque étape de votre séjour, de la réservation jusqu'à votre départ.
          </p>
        </div>
      </div>

      {/* Structured Legal Content */}
      <div className="mt-12 space-y-10 text-sm leading-relaxed text-foreground/80">
        
        {/* Section 1 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">1</span>
            <span>Objet et rôle de la plateforme</span>
          </h2>
          <p>
            <strong>Bénin Beyond</strong> est une place de marché numérique de prestige conçue pour connecter des voyageurs (touristes, professionnels, diaspora) à une sélection curatée d'hébergements de standing (villas, suites, lofts) et de solutions de mobilité haut de gamme (véhicules avec ou sans chauffeur).
          </p>
          <p>
            Bénin Beyond agit en qualité d'opérateur de plateforme technique et de conciergerie intermédiaire facilitant la mise en relation, la réservation et le paiement sécurisé.
          </p>
        </section>

        {/* Section 2 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4" id="securite">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">2</span>
            <span>Réservations et modalités financières</span>
          </h2>
          <ul className="space-y-2.5 pl-2">
            <li className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
              <span><strong>Confirmation instantanée :</strong> Toute réservation effectuée sur le site donne lieu à une confirmation horodatée avec référence unique (ex: BB-2026-XXXX).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
              <span><strong>Moyens de paiement acceptés :</strong> Les règlements s'effectuent en Francs CFA (XOF) par Mobile Money (MTN Mobile Money, Moov Money) ou par carte bancaire sécurisée.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
              <span><strong>Tarification transparente :</strong> Les tarifs affichés incluent les frais de service de la conciergerie ainsi que les taxes applicables, sans frais cachés.</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">3</span>
            <span>Engagements des Voyageurs</span>
          </h2>
          <p>En utilisant le site et en effectuant une réservation, le voyageur s'engage à :</p>
          <ul className="list-disc pl-5 space-y-2 text-foreground/75">
            <li>Fournir des informations d'identité sincères et vérifiables lors de la création de compte ou de la commande.</li>
            <li>Respecter le règlement intérieur des hébergements réservés (calme nocturne, capacité maximale d'accueil, respect des lieux).</li>
            <li>Pour la location de véhicule : être titulaire d'un permis de conduire en cours de validité (pour la conduite autonome) et respecter le code de la route béninois.</li>
            <li>Signaler immédiatement à la conciergerie toute dégradation, incident ou anomalie survenue durant le séjour.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">4</span>
            <span>Engagements des Partenaires & Propriétaires</span>
          </h2>
          <p>Tout propriétaire ou gestionnaire publiant une annonce s'engage à :</p>
          <ul className="list-disc pl-5 space-y-2 text-foreground/75">
            <li>Soumettre un dossier de conformité KYC complet (IFU valide, pièce d'identité officielle, mandat de gestion).</li>
            <li>Garantir la parfaite conformité du bien avec les photos et descriptions publiées (normes de propreté hôtelière, état mécanique irréprochable des véhicules).</li>
            <li>Honorer l'ensemble des réservations validées aux dates convenues, sans modification unilatérale de tarif.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">5</span>
            <span>Annulation, modification et force majeure</span>
          </h2>
          <p>
            Les conditions d'annulation dépendent des modalités spécifiques indiquées sur chaque fiche de bien :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="p-4 rounded-xl bg-muted/30 border border-foreground/5">
              <strong className="block text-foreground font-heading text-sm">Annulation flexible</strong>
              <p className="text-xs text-foreground/70 mt-1">Remboursement intégral en cas d'annulation effectuée au moins 48 heures avant l'heure de check-in convenue.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-foreground/5">
              <strong className="block text-foreground font-heading text-sm">Médiation Conciergerie</strong>
              <p className="text-xs text-foreground/70 mt-1">En cas de litige ou d'imprévu, notre équipe intervient immédiatement pour proposer un relogement équivalent ou une solution amiable.</p>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">6</span>
            <span>Propriété intellectuelle et juridiction</span>
          </h2>
          <p>
            L'ensemble des contenus, marques, logos, photographies et technologies composant le site <strong>Bénin Beyond</strong> sont protégés par le droit de la propriété intellectuelle. Toute reproduction non autorisée est strictement prohibée.
          </p>
          <p>
            Les présentes conditions sont soumises au droit béninois. Tout différend non résolu à l'amiable relève de la compétence exclusive des juridictions de Cotonou, République du Bénin.
          </p>
        </section>
      </div>

      {/* Contact Callout */}
      <div className="mt-12 rounded-2xl bg-secondary text-secondary-foreground p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-white">Besoin d'éclaircissements sur nos conditions ?</h3>
          <p className="mt-1 text-xs text-secondary-foreground/70 max-w-xl">
            Notre conciergerie juridique et notre service d'accueil sont à votre écoute 7j/7.
          </p>
        </div>
        <a
          href="mailto:contact@beninbeyond.com"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-black hover:bg-accent/90 transition-all shrink-0 shadow-sm"
        >
          <FontAwesomeIcon icon={faEnvelope} />
          <span>Contacter le support</span>
        </a>
      </div>
    </div>
  );
}
