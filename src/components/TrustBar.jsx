import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faCircleCheck,
  faLocationDot,
  faHeadset
} from '@fortawesome/free-solid-svg-icons';
import { ScrollReveal } from './ScrollReveal';

const TRUST_PILLARS = [
  {
    icon: faShieldHalved,
    title: 'Paiement sécurisé',
    text: 'Mobile Money, carte & wallets — transactions cryptées bout-en-bout.'
  },
  {
    icon: faCircleCheck,
    title: 'Vérifié par Bénin Beyond',
    text: 'Chaque annonce est inspectée sur place par notre équipe locale.'
  },
  {
    icon: faLocationDot,
    title: 'Ancrage local',
    text: 'Proximité cartographiée des sites : Ganvié, Ouidah, Abomey, Pendjari.'
  },
  {
    icon: faHeadset,
    title: 'Conciergerie 24/7',
    text: 'Une équipe francophone disponible avant, pendant et après votre séjour.'
  }
];

export function TrustBar() {
  return (
    <section className="border-y border-foreground/10 bg-muted/40">
      <div className="mx-auto grid max-w-8xl gap-px overflow-hidden px-6 py-4 md:grid-cols-4 md:px-12">
        {TRUST_PILLARS.map((item, idx) => (
          <ScrollReveal
            key={item.title}
            delay={idx * 80}
            y={20}
            scale={0.97}
            className="flex flex-col gap-3 border-foreground/10 p-6 md:border-l md:first:border-l-0"
          >
            <FontAwesomeIcon icon={item.icon} className="h-6 w-6 text-accent" />
            <h3 className="font-heading text-sm font-semibold">
              {item.title}
            </h3>
            <p className="text-sm leading-relaxed text-foreground/65">
              {item.text}
            </p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
