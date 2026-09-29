// Initial baseline catalog starts completely fresh and empty ("Comme neuf")
// Packs are created exclusively by the Super-Administrator from the Admin Cockpit.
export const COMBINED_PACKS = [];

export const SAMPLE_DEMO_PACKS = [
  {
    id: "pack-riviera-4x4",
    title: "Pack Riviera & Évasion 4x4",
    tagline: "Villa d'exception + SUV 7 places tout terrain",
    price: 115000,
    regularPrice: 130000,
    priceUnit: "jour",
    savings: 15000,
    location: "Cotonou & Littoral",
    badge: "Offre Privilège",
    included: [
      {
        type: "Hébergement",
        title: "Villa Cotonou Riviera (4 Chambres, Piscine privée)",
        image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
      },
      {
        type: "Véhicule",
        title: "SUV Toyota Fortuner (7 Places, Automatique 4x4)",
        image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80"
      }
    ],
    advantages: [
      "Prise en charge VIP aéroport Cotonou Cadjehoun incluse",
      "Plein de carburant offert au départ",
      "Conciergerie dédiée 24/7",
      "Kilométrage illimité sur tout le Bénin"
    ],
    description: "La formule ultime pour séjourner au Bénin dans des conditions d'excellence. Profitez d'une villa de prestige avec piscine privée sur la lagune de Cotonou, combinée à un SUV 4x4 puissant pour vos trajets urbains et vos escapades vers Ouidah et Grand-Popo.",
    gallery: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "pack-escapade-ouidah",
    title: "Pack Escapade Littorale & Océan",
    tagline: "Loft sous les cocotiers + Berline + Visite historique",
    price: 75000,
    regularPrice: 89000,
    priceUnit: "jour",
    savings: 14000,
    location: "Ouidah & Route des Pêches",
    badge: "Coup de Cœur",
    included: [
      {
        type: "Hébergement",
        title: "Loft Cocotier Ouidah (à 200m de la plage)",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
      },
      {
        type: "Véhicule",
        title: "Berline Hyundai Elantra climatisée",
        image: "https://images.unsplash.com/photo-1523939706065-fa4ac466210d?auto=format&fit=crop&w=1200&q=80"
      }
    ],
    advantages: [
      "Guide touristique imprimé des monuments d'Ouidah offert",
      "Hamac et accès direct plage de Ouidah",
      "Assurance tous risques véhicule incluse",
      "Assistance conciergerie locale"
    ],
    description: "Une parenthèse ressourçante mêlant repos en bord d'océan, autonomie totale grâce à une berline moderne et parcours mémoriel guidé le long de la Route des Esclaves jusqu'à la Porte du Non-Retour.",
    gallery: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1523939706065-fa4ac466210d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "pack-safari-pendjari",
    title: "Pack Expédition Grand Nord & Safari",
    tagline: "SUV 4x4 Expédition + Bivouac de luxe Pendjari",
    price: 260000,
    regularPrice: 295000,
    priceUnit: "forfait",
    savings: 35000,
    location: "Cotonou — Natitingou — Pendjari",
    badge: "Aventure Signature",
    included: [
      {
        type: "Hébergement",
        title: "Séjour bivouac safari tout confort sous les étoiles",
        image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80"
      },
      {
        type: "Véhicule",
        title: "SUV 4x4 préparé piste avec chauffeur-guide",
        image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80"
      }
    ],
    advantages: [
      "Chauffeur-ranger professionnel pour tout le trajet",
      "Tous les repas et droits d'entrée au parc national inclus",
      "Tentes safari de luxe aménagées",
      "Traversée des panoramas de l'Atacora"
    ],
    description: "Le grand voyage au cœur du Bénin sauvage. Partez de Cotonou à bord d'un 4x4 robuste avec ranger expérimenté pour 2 jours complets de safari dans le Parc national de la Pendjari. Rencontre inoubliable avec la faune ouest-africaine.",
    gallery: [
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: "pack-city-business",
    title: "Pack City Business & Mobilité Cotonou",
    tagline: "Appartement design Plateau + Berline avec chauffeur",
    price: 52000,
    regularPrice: 60000,
    priceUnit: "jour",
    savings: 8000,
    location: "Cotonou Plateau & Marina",
    badge: "Business & Confort",
    included: [
      {
        type: "Hébergement",
        title: "Appartement Cotonou Centre (Design & Fibre)",
        image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
      },
      {
        type: "Véhicule",
        title: "Berline Hyundai Elantra avec chauffeur dédié",
        image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80"
      }
    ],
    advantages: [
      "Chauffeur privé disponible pour tous vos rendez-vous",
      "Wifi très haut débit et bureau de travail",
      "Proche ministères, ambassades et Port Autonome",
      "Service blanchisserie express"
    ],
    description: "Conçu pour les professionnels en mission ou les voyageurs urbains exigeants. Un appartement raffiné au cœur du Plateau avec une berline et son chauffeur pour tous vos déplacements professionnels à Cotonou et Porto-Novo.",
    gallery: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];
