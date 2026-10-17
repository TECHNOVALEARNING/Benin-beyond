/**
 * Libellé du moyen de paiement affiché aux voyageurs, propriétaires et à l'équipe.
 * Le nom du prestataire technique de paiement n'est jamais affiché.
 */
export function formatPaymentMethod(method) {
  const raw = String(method || '').trim();
  if (!raw) return 'Paiement en ligne';
  if (!/nyole/i.test(raw)) return raw;

  // Ancien format « Nyole (Opérateur) » : on garde l'opérateur s'il est utile
  const inner = raw.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (inner && !/nyole|paydunya/i.test(inner)) return inner;
  return 'Mobile Money / Carte';
}
