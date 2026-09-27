// Initial listings dataset - Biens & Véhicules curatés de prestige au Bénin
export const INITIAL_LISTINGS = [
  {
    id: "6a7562469fa797d5bba5f683",
    type: "stay",
    subcategory: "villa",
    title: "Villa Cotonou Riviera",
    price: 85000,
    price_unit: "nuit",
    badge: "Vérifié par Bénin Beyond",
    featured: true,
    location: "Cotonou, Haie Vive",
    status: "active",
    summary: "Villa d'exception avec piscine privée et vue dégagée sur la lagune de Cotonou.",
    description: "Une retraite exclusive nichée dans le quartier le plus prisé de la côte littorale. Vastes ouvertures sur la lagune, patio intérieur, et mobilier façonné par des artisans de Porto-Novo. Idéale pour un séjour familial ou professionnel VIP.",
    specs: ["4 Chambres", "Piscine privée", "Climatisation", "Wifi fibre"],
    amenities: ["Piscine", "Wifi", "Climatisation", "Cuisine équipée", "Parking gratuit", "Sécurité 24/7"],
    host: {
      name: "Adjovi Kpondjo",
      role: "Hôte premium",
      verified: true
    },
    rating: 4.9,
    reviews_count: 47,
    map_lat: 6.3654,
    map_lng: 2.4186,
    gallery: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80"
    ],
    created_date: "2026-08-07T04:42:46.105000",
    updated_date: "2026-08-07T04:43:47.536000"
  },
  {
    id: "6a7562469fa797d5bba5f684",
    type: "stay",
    subcategory: "apartment",
    title: "Appartement Standing Cotonou Centre",
    price: 35000,
    price_unit: "nuit",
    badge: "Standing Exclusif",
    featured: false,
    location: "Cotonou, Les Cocotiers",
    status: "active",
    summary: "Appartement design au cœur de la ville, proche des centres d'affaires et ambassades.",
    description: "Un appartement lumineux mêlant lignes modernes et textiles d'art béninois. Situé à deux pas du quartier résidentiel et des meilleurs restaurants du Plateau, parfait pour un séjour d'affaires ou d'agrément.",
    specs: ["2 Chambres", "Climatisation", "Wifi fibre", "Ascenseur"],
    amenities: ["Wifi", "Climatisation", "Cuisine équipée", "Ascenseur", "Parking sécurisé"],
    host: {
      name: "Marc Hounkpatin",
      role: "Hôte vérifié",
      verified: true
    },
    rating: 4.7,
    reviews_count: 32,
    map_lat: 6.3725,
    map_lng: 2.3922,
    gallery: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80"
    ],
    created_date: "2026-08-07T04:42:46.105000",
    updated_date: "2026-08-07T04:43:47.536000"
  },
  {
    id: "6a7562469fa797d5bba5f685",
    type: "stay",
    subcategory: "villa",
    title: "Loft Cocotier & Plage Ouidah",
    price: 42000,
    price_unit: "nuit",
    badge: "Coup de Cœur",
    featured: false,
    location: "Ouidah, Plage",
    status: "active",
    summary: "Loft intimiste à 200m de l'océan, pour une parenthèse littorale bercée par la brise marine.",
    description: "Un loft ouvert sur une terrasse sous les cocotiers, à quelques pas de la plage d'Ouidah et des sites mémoriels. Décor épuré, hamac, coucher de soleil spectaculaire et tranquillité absolue.",
    specs: ["1 Chambre VIP", "Terrasse privée", "Climatisation", "Wifi"],
    amenities: ["Wifi", "Climatisation", "Terrasse", "Plage à 200m", "Cuisine"],
    host: {
      name: "Léa Aïkpe",
      role: "Hôte vérifiée",
      verified: true
    },
    rating: 4.8,
    reviews_count: 21,
    map_lat: 6.3625,
    map_lng: 2.0819,
    gallery: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80"
    ],
    created_date: "2026-08-07T04:42:46.105000",
    updated_date: "2026-08-07T04:43:47.536000"
  },
  {
    id: "6a7562469fa797d5bba5f686",
    type: "drive",
    subcategory: "car",
    title: "SUV Toyota Fortuner VIP",
    price: 45000,
    price_unit: "jour",
    badge: "Vérifié par Bénin Beyond",
    featured: true,
    location: "Cotonou (Aéroport & Ville)",
    status: "active",
    summary: "SUV 7 places tout confort, idéal pour les trajets littoraux et les pistes régionales.",
    description: "Un SUV robuste et confortable, parfait pour relier Cotonou à Ouidah, Abomey ou le Parc National de la Pendjari. Chauffeur professionnel disponible sur demande, prise en charge à l'aéroport Cadjehoun ou à votre hôtel.",
    specs: ["Automatique", "SUV 4x4", "7 Places", "Climatisation Bi-zone"],
    amenities: ["Climatisation", "Bluetooth", "GPS Bénin", "Chauffeur optionnel"],
    host: {
      name: "Garage de l'Avenue VIP",
      role: "Partenaire vérifié",
      verified: true
    },
    rating: 4.8,
    reviews_count: 28,
    map_lat: 6.3654,
    map_lng: 2.4186,
    gallery: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1549944850-84e00be4203b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80"
    ],
    created_date: "2026-08-07T04:42:46.105000",
    updated_date: "2026-08-07T04:43:47.536000"
  },
  {
    id: "6a7562469fa797d5bba5f687",
    type: "drive",
    subcategory: "car",
    title: "Berline Mercedes Luxe & Chauffeur",
    price: 35000,
    price_unit: "jour",
    badge: "Prestige Affaires",
    featured: false,
    location: "Cotonou & Porto-Novo",
    status: "active",
    summary: "Berline haut standing pour déplacements professionnels, délégations et réceptions.",
    description: "Élégante et prestigieuse, cette berline offre une conduite silencieuse et un habitacle feutré. Idéale pour les réceptions de cadres dirigeants, les délégations internationales et les déplacements officiels à Cotonou et Porto-Novo.",
    specs: ["Automatique", "Berline Luxe", "5 Places", "Intérieur Cuir"],
    amenities: ["Climatisation", "Bluetooth audio", "Wifi embarqué", "Chauffeur en tenue"],
    host: {
      name: "Garage de l'Avenue VIP",
      role: "Partenaire vérifié",
      verified: true
    },
    rating: 4.9,
    reviews_count: 24,
    map_lat: 6.3654,
    map_lng: 2.4186,
    gallery: [
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1523939706065-fa4ac466210d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80"
    ],
    created_date: "2026-08-07T04:42:46.105000",
    updated_date: "2026-08-07T04:43:47.536000"
  }
];

export const SAMPLE_DEMO_LISTINGS = INITIAL_LISTINGS;

export function formatPrice(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
}
