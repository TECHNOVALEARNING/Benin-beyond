import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faLock,
  faUserShield,
  faEye,
  faFileContract,
  faDatabase,
  faArrowLeft,
  faEnvelope,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { ScrollReveal } from '../components/ScrollReveal';
import { useLanguage } from '../context/LanguageContext';

export function PrivacyPolicyPage() {
  const { t } = useLanguage();
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
          <span>{t("Retour à l'accueil")}</span>
        </Link>
      </div>

      {/* Page Header */}
      <ScrollReveal delay={0} y={20} className="border-t border-foreground/15 pt-6">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-accent font-heading">
          <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5" />
          <span>{t("Protection des données personnelles")}</span>
        </div>
        <h1 className="font-heading mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          {t("Politique de Confidentialité")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground/70 max-w-3xl">
          {t("Chez")} <strong>Bénin Beyond</strong>{t(", la protection de votre vie privée et de vos données à caractère personnel est une priorité absolue. Cette politique décrit en toute transparence quelles informations nous recueillons, comment nous les utilisons, et les mesures prises pour assurer leur intégrité et leur stricte confidentialité.")}
        </p>
        <p className="mt-2 text-xs text-foreground/50">
          {t('Dernière mise à jour : {date} • Conforme au Code du Numérique en République du Bénin (Loi n° 2017-20 / APDP) et aux standards internationaux.', { date: t(lastUpdated) })}
        </p>
      </ScrollReveal>

      {/* Key Highlights Strip */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-xs">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-foreground">{t("Chiffrement de bout en bout")}</h3>
          <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
            {t("Toutes les transactions et transmissions d'informations sensibles sont chiffrées selon les protocoles SSL/TLS les plus rigoureux.")}
          </p>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-xs">
          <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faUserShield} className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-foreground">{t("Aucune revente de données")}</h3>
          <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
            {t("Vos coordonnées personnelles ne sont ni vendues, ni louées, ni cédées à des courtiers de données publicitaires tiers.")}
          </p>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-xs">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-3">
            <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-sm font-bold text-foreground">{t("Contrôle & Transparence")}</h3>
          <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
            {t("Vous conservez à tout moment un droit d'accès, de rectification et d'effacement de l'ensemble de vos données enregistrées.")}
          </p>
        </div>
      </div>

      {/* Structured Legal Content */}
      <div className="mt-12 space-y-10 text-sm leading-relaxed text-foreground/80">
        
        {/* Section 1 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">1</span>
            <span>{t("Responsable du traitement des données")}</span>
          </h2>
          <p>
            {t("Le traitement de vos données est assuré par l'équipe de gouvernance de")} <strong>Bénin Beyond</strong>{t(", plateforme curatée d'hospitalité et de mobilité, opérant depuis Cotonou, République du Bénin.")}
          </p>
          <p>
            Pour toute question relative à vos données personnelles ou pour exercer vos droits, vous pouvez contacter notre délégué à la protection des données par e-mail à :{' '}
            <a href="mailto:contact@beninbeyond.com" className="font-semibold text-primary underline">
              contact@beninbeyond.com
            </a>{' '}
            ou via notre assistance conciergerie.
          </p>
        </section>

        {/* Section 2 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4" id="donnees">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">2</span>
            <span>{t("Quelles données collectons-nous ?")}</span>
          </h2>
          <p>
            {t("Dans le cadre du bon fonctionnement de notre place de marché, nous sommes amenés à collecter les catégories d'informations suivantes :")}
          </p>
          <ul className="space-y-2.5 pl-2">
            <li className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
              <span><strong>{t("Données d'identification et de contact :")}</strong> {t("Nom, prénom, adresse e-mail, numéro de téléphone (utilisé pour les confirmations de réservation par SMS / WhatsApp).")}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
              <span><strong>{t("Données relatives aux réservations :")}</strong> {t("Dates de séjour, type d'hébergement sélectionné, choix de véhicules, préférences de conciergerie et historique des commandes.")}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
              <span><strong>{t("Données des Partenaires & Hôtes :")}</strong> {t("Nom ou raison sociale, coordonnées, annonces publiées et informations de reversement (numéro Mobile Money ou compte bancaire).")}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <FontAwesomeIcon icon={faCheckCircle} className="h-3.5 w-3.5 text-accent mt-1 shrink-0" />
              <span><strong>{t("Données techniques de connexion :")}</strong> {t("Adresse IP anonymisée, type de navigateur, journaux d'activité sécurisés afin de prévenir les tentatives de fraude et garantir la stabilité du service.")}</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">3</span>
            <span>{t("Comment vos données sont-elles utilisées ?")}</span>
          </h2>
          <p>
            {t("Chaque information recueillie répond à une finalité opérationnelle précise et légitime :")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="p-4 rounded-xl bg-muted/30 border border-foreground/5">
              <strong className="block text-foreground font-heading text-sm">{t("Gestion des réservations")}</strong>
              <p className="text-xs text-foreground/70 mt-1">{t("Transmettre à l'hôte les dates et informations nécessaires pour préparer votre accueil personnalisé dans les meilleures conditions.")}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-foreground/5">
              <strong className="block text-foreground font-heading text-sm">{t("Qualité des annonces")}</strong>
              <p className="text-xs text-foreground/70 mt-1">{t("Contrôler la qualité des annonces et traiter les signalements afin de protéger les voyageurs.")}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-foreground/5">
              <strong className="block text-foreground font-heading text-sm">{t("Sécurité des paiements")}</strong>
              <p className="text-xs text-foreground/70 mt-1">{t("Faciliter le règlement sécurisé par Mobile Money (MTN / Moov) ou carte bancaire avec émission instantanée de reçus officiels.")}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-foreground/5">
              <strong className="block text-foreground font-heading text-sm">{t("Support & Conciergerie 7j/7")}</strong>
              <p className="text-xs text-foreground/70 mt-1">{t("Permettre à nos conseillers de vous assister en temps réel en cas de besoin ou de modification de planning.")}</p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">4</span>
            <span>{t("Sécurité et hébergement de vos données")}</span>
          </h2>
          <p>
            {t("Nos bases de données reposent sur une infrastructure de pointe hautement sécurisée dotée d'un chiffrement robuste et de protocoles stricts de confidentialité et de contrôle d'accès.")}
          </p>
          <p>
            {t("Seuls les personnels autorisés de Bénin Beyond ont accès aux informations strictement requises pour le traitement de votre dossier. Aucune donnée bancaire n'est stockée en clair sur nos serveurs.")}
          </p>
        </section>

        {/* Section 5 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">5</span>
            <span>{t("Vos droits sur vos données")}</span>
          </h2>
          <p>
            {t("Conformément aux dispositions légales de la République du Bénin et aux normes internationales de protection des données, vous disposez des droits suivants :")}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-foreground/75">
            <li><strong>{t("Droit d'accès et d'information :")}</strong> {t("Obtenir une copie complète des données enregistrées vous concernant.")}</li>
            <li><strong>{t("Droit de rectification :")}</strong> {t("Corriger des données inexactes ou incomplètes depuis votre espace personnel ou via le support.")}</li>
            <li><strong>{t("Droit à l'effacement :")}</strong> {t("Demander la suppression définitive de votre compte et des informations associées, sous réserve des obligations comptables et fiscales légales.")}</li>
            <li><strong>{t("Droit d'opposition :")}</strong> {t("Refuser toute sollicitation promotionnelle à tout moment.")}</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="rounded-2xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">6</span>
            <span>{t("Cookies et technologies de navigation")}</span>
          </h2>
          <p>
            {t("Bénin Beyond utilise exclusivement des cookies techniques essentiels pour maintenir votre session de connexion, retenir vos sélections de panier et assurer la fluidité de votre expérience de réservation. Nous n'utilisons pas de traceurs intrusifs à visée publicitaire tierce.")}
          </p>
        </section>
      </div>

      {/* Contact Callout */}
      <div className="mt-12 rounded-2xl bg-secondary text-secondary-foreground p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-white">{t("Une question sur vos données personnelles ?")}</h3>
          <p className="mt-1 text-xs text-secondary-foreground/70 max-w-xl">
            {t("Notre équipe de conformité et notre conciergerie sont à votre disposition pour vous répondre en toute clarté.")}
          </p>
        </div>
        <a
          href="mailto:contact@beninbeyond.com"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-black hover:bg-accent/90 transition-all shrink-0 shadow-sm"
        >
          <FontAwesomeIcon icon={faEnvelope} />
          <span>{t("Contacter la protection des données")}</span>
        </a>
      </div>
    </div>
  );
}
