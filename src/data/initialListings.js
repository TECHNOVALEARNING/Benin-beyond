// Dataset d'annonces initiales — État propre et vérifié (aucun élément fictif)
// Seuls les biens réels publiés par les propriétaires certifiés et l'administrateur
// dans la base de données Supabase sont affichés sur la plateforme.
export const INITIAL_LISTINGS = [];

export function formatPrice(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}
