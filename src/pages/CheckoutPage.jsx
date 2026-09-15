import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Printer,
  MapPin,
  Smartphone,
  CreditCard,
  Wallet,
  ShieldCheck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/initialListings';
import { createBooking } from '../services/bookingService';
import { ScrollReveal } from '../components/ScrollReveal';

const STEPS = ['Identité', 'Protection', 'Paiement'];

const PROTECTION_OPTIONS = [
  {
    id: 'cancel',
    label: 'Annulation flexible',
    price: 5000,
    desc: "Remboursement garanti jusqu'à 24h avant le début."
  },
  {
    id: 'damage',
    label: 'Protection dommages',
    price: 7500,
    desc: 'Couverture intégrale véhicules & logements.'
  }
];

const PAYMENT_METHODS = [
  { id: 'momo', label: 'Mobile Money (MTN / Moov)', icon: Smartphone },
  { id: 'card', label: 'Carte bancaire (Visa / Mastercard)', icon: CreditCard },
  { id: 'wallet', label: 'Apple / Google Pay', icon: Wallet }
];

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Calculate options total
  const optionsTotal = PROTECTION_OPTIONS.reduce(
    (sum, opt) => sum + (selectedOptions[opt.id] ? opt.price : 0),
    0
  );
  const finalTotal = subtotal + optionsTotal;

  const toggleOption = (id) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleNextStep = () => {
    setActiveStep((prev) => Math.min(2, prev + 1));
  };

  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!customer.name || !customer.phone) {
      setActiveStep(0);
      alert('Veuillez renseigner votre nom complet et votre téléphone.');
      return;
    }

    setIsSubmitting(true);
    const bookingRef = `BB-${Math.floor(Math.random() * 900000 + 100000)}`;

    const payload = {
      booking_ref: bookingRef,
      customer_name: customer.name,
      customer_email: customer.email || 'voyageur@beninbeyond.bj',
      customer_phone: customer.phone,
      items: items,
      protection_options: selectedOptions,
      payment_method: paymentMethod,
      subtotal: subtotal,
      options_total: optionsTotal,
      total_amount: finalTotal,
      status: 'confirmed'
    };

    const res = await createBooking(payload);
    if (res.success) {
      setConfirmedBooking(res.booking);
      clearCart();
    }
    setIsSubmitting(false);
  };

  // Case 1: Empty cart and not confirmed
  if (items.length === 0 && !confirmedBooking) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center md:px-12">
        <h1 className="section-title text-3xl">Aucune réservation à finaliser</h1>
        <p className="mt-3 text-foreground/60">
          Votre panier est actuellement vide. Choisissez vos expériences pour procéder au règlement.
        </p>
        <Link to="/explore" className="mt-6 inline-block text-primary font-medium hover:underline">
          ← Retour au catalogue
        </Link>
      </div>
    );
  }

  // Case 2: Confirmation screen
  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <ScrollReveal delay={0} y={24} scale={0.96} className="overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-2xl shadow-foreground/5">
          {/* Header Banner */}
          <div className="bg-secondary px-8 py-10 text-center text-secondary-foreground">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </div>
            <h1 className="section-title mt-5 text-3xl">Réservation confirmée</h1>
            <p className="mt-2 text-sm text-secondary-foreground/75">
              Un itinéraire de voyage a été envoyé à {confirmedBooking.customer_email || customer.email || 'votre adresse'}.
            </p>
          </div>

          {/* Details Body */}
          <div className="p-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <span className="caption text-foreground/50">Itinéraire</span>
              <span className="font-mono text-base font-bold text-primary">
                {confirmedBooking.booking_ref}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-xs text-foreground/50 uppercase tracking-wider font-semibold mb-3">
                Prestations réservées
              </p>
              <ul className="space-y-3">
                {(confirmedBooking.items || []).map((it, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm py-1">
                    <span className="flex items-center gap-2 text-foreground/90 font-medium">
                      <MapPin className="h-4 w-4 text-accent" strokeWidth={1.5} />
                      {it.title}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatPrice((it.price || 0) * (it.nights || it.days || it.qty || 1))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">Total réglé</span>
              <span className="font-heading text-2xl font-bold text-primary">
                {formatPrice(confirmedBooking.total_amount || finalTotal)}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-full border border-foreground/20 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" strokeWidth={1.5} />
                <span>Imprimer le récapitulatif</span>
              </button>
              <Link to="/" className="flex-1">
                <button className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all">
                  Retour à l'accueil
                </button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  // Case 3: 3-step checkout flow
  return (
    <div className="mx-auto max-w-8xl px-6 py-12 md:px-12 md:py-16">
      <ScrollReveal delay={0} y={20}>
        <h1 className="section-title border-t border-foreground/15 pt-6 text-3xl md:text-4xl">
          Paiement
        </h1>
      </ScrollReveal>

      {/* Stepper Breadcrumb */}
      <ScrollReveal delay={40} y={15} className="mt-6 flex items-center gap-3">
        {STEPS.map((label, idx) => (
          <React.Fragment key={label}>
            <button
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                idx === activeStep ? 'text-primary' : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  idx === activeStep
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-foreground/70'
                }`}
              >
                {idx + 1}
              </span>
              <span>{label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className="h-px w-8 bg-foreground/15 hidden sm:block" />
            )}
          </React.Fragment>
        ))}
      </ScrollReveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Accordion Steps */}
        <div className="space-y-4">
          {/* Step 1: Identité */}
          <ScrollReveal delay={80} y={20} className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
            <button
              onClick={() => setActiveStep(0)}
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  1
                </span>
                <span className="font-heading font-semibold text-base">Identité</span>
              </span>
            </button>

            {activeStep === 0 && (
              <div className="border-t border-foreground/10 p-6 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block">
                      <span className="caption text-foreground/50">Nom complet</span>
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="Koffi Adjovi"
                        className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                        required
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block">
                      <span className="caption text-foreground/50">Téléphone (avec indicatif)</span>
                      <input
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="+229 01 00 00 00"
                        className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                        required
                      />
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block">
                      <span className="caption text-foreground/50">Email</span>
                      <input
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="vous@email.com"
                        className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                >
                  Continuer
                </button>
              </div>
            )}
          </ScrollReveal>

          {/* Step 2: Protection & Options */}
          <ScrollReveal delay={140} y={20} className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
            <button
              onClick={() => setActiveStep(1)}
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  2
                </span>
                <span className="font-heading font-semibold text-base">Protection & options</span>
              </span>
            </button>

            {activeStep === 1 && (
              <div className="border-t border-foreground/10 p-6 pt-4">
                <div className="space-y-3">
                  {PROTECTION_OPTIONS.map((opt) => {
                    const isChecked = Boolean(selectedOptions[opt.id]);
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                          isChecked
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-foreground/15 hover:border-foreground/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOption(opt.id)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary accent-primary"
                          />
                          <div>
                            <div className="font-heading text-sm font-semibold text-foreground">
                              {opt.label}
                            </div>
                            <div className="text-xs text-foreground/60">{opt.desc}</div>
                          </div>
                        </div>
                        <span className="font-heading text-sm font-bold text-primary">
                          +{formatPrice(opt.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                >
                  Continuer
                </button>
              </div>
            )}
          </ScrollReveal>

          {/* Step 3: Paiement */}
          <ScrollReveal delay={200} y={20} className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
            <button
              onClick={() => setActiveStep(2)}
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  3
                </span>
                <span className="font-heading font-semibold text-base">Moyen de paiement</span>
              </span>
            </button>

            {activeStep === 2 && (
              <div className="border-t border-foreground/10 p-6 pt-4">
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <label
                        key={pm.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                            : 'border-foreground/15 hover:border-foreground/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={isSelected}
                            onChange={() => setPaymentMethod(pm.id)}
                            className="h-4 w-4 text-primary accent-primary"
                          />
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                            <span className="font-medium text-sm text-foreground">
                              {pm.label}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-lg bg-muted/40 p-4 text-xs text-foreground/70 flex items-center gap-2 border border-foreground/10">
                  <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
                  <span>
                    Transactions cryptées SSL 256-bit conformes aux normes bancaires et opérateurs télécoms béninois.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="mt-6 w-full rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? 'Traitement sécurisé en cours…' : `Confirmer et payer ${formatPrice(finalTotal)}`}
                </button>
              </div>
            )}
          </ScrollReveal>
        </div>

        {/* Right Summary Column */}
        <div className="lg:sticky lg:top-8 lg:h-fit">
          <ScrollReveal delay={120} y={24} scale={0.97} className="rounded-xl border border-foreground/10 bg-card p-6 shadow-xl shadow-foreground/5">
            <h2 className="caption text-foreground/50">Détail de la commande</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-foreground/80">
                <span>Prestations ({items.length})</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {optionsTotal > 0 && (
                <div className="flex justify-between text-foreground/80">
                  <span>Protections choisies</span>
                  <span className="font-medium text-primary">+{formatPrice(optionsTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-foreground/80">
                <span>Frais de conciergerie</span>
                <span className="text-emerald-700 font-medium">0 FCFA (Inclus)</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-baseline border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">Total à régler</span>
              <span className="font-heading text-2xl font-bold text-primary">
                {formatPrice(finalTotal)}
              </span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
