// Dataset d'annonces initiales — État propre et vérifié (aucun élément fictif)
// Seuls les biens réels publiés par les propriétaires certifiés et l'administrateur
// dans la base de données Supabase sont affichés sur la plateforme.
export const INITIAL_LISTINGS = [];

// Prix public converti dans la devise du visiteur (geopricing) ; formatPriceXOF pour les montants comptables
export { formatLocalPrice as formatPrice, formatXOF as formatPriceXOF } from "../utils/currency";
