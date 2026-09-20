// Initial listings dataset - Clean state as requested (no pre-set dummy items)
// Partners and admins can publish real properties, hotels, and vehicles directly.
export const INITIAL_LISTINGS = [];

// Preserved reference sample if ever needed for demonstration in admin tools
export const SAMPLE_DEMO_LISTINGS = [
  {
    id: "lst_demo_01",
    type: "stay",
    title: "Villa Cotonou Riviera",
    price: 85000,
    price_unit: "nuit",
    badge: "Vérifié par Bénin Beyond",
    featured: true,
    location: "Cotonou",
    summary: "Villa d'exception avec piscine privée et vue dégagée sur la lagune de Cotonou.",
    description: "Une retraite exclusive nichée dans le quartier le plus prisé de la côte littorale.",
    specs: ["4 Chambres", "Piscine privée", "Climatisation", "Wifi fibre"],
    amenities: ["Piscine", "Wifi", "Climatisation", "Cuisine équipée", "Parking gratuit", "Sécurité 24/7"],
    host: { name: "Adjovi Kpondjo", role: "Hôte premium", verified: true },
    rating: 4.9,
    reviews_count: 47,
    map_lat: 6.3654,
    map_lng: 2.4186,
    gallery: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "lst_demo_02",
    type: "drive",
    title: "SUV Toyota Fortuner",
    price: 45000,
    price_unit: "jour",
    badge: "Vérifié par Bénin Beyond",
    featured: true,
    location: "Cotonou",
    summary: "SUV 7 places, idéal pour la côte et le nord.",
    description: "Un SUV robuste et confortable, parfait pour relier Cotonou à Ouidah ou Pendjari.",
    specs: ["Automatique", "SUV", "7 Places", "4x4"],
    amenities: ["Climatisation", "Bluetooth", "GPS", "Siège enfant"],
    host: { name: "Garage de l'Avenue", role: "Partenaire vérifié", verified: true },
    rating: 4.8,
    reviews_count: 28,
    map_lat: 6.3654,
    map_lng: 2.4186,
    gallery: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1549944850-84e00be4203b?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

export function formatPrice(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}
