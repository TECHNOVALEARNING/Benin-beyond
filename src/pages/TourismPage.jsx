import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Compass, Landmark, Mountain, Sparkles, ArrowUpRight, BedDouble, Car, Info } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';

const TOURISM_SITES = [
  {
    id: 'ganvie',
    category: 'nature',
    title: 'Ganvié — La Cité Lacustre du Lac Nokoué',
    badge: 'Merveille Lacustre Unique',
    location: 'Lac Nokoué · Abomey-Calavi',
    tagline: 'La Venise de l’Afrique de l’Ouest',
    description:
      'Bâtie au XVIIe siècle par le peuple Tofinu cherchant refuge sur les eaux sacrées du lac Nokoué, Ganvié rassemble plus de 30 000 habitants vivant dans de remarquables maisons sur pilotis. Le marché flottant matinal animé par les piroguières, les ruelles aquatiques et les pièges à poissons "acadjas" créent un univers hors du temps.',
    highlights: ['Marché flottant à l’aube', 'Habitations séculaires sur pilotis', 'Artisanat lagonaire & pêche traditionnelle'],
    tips: 'Départ en pirogue depuis l’embarcadère d’Abomey-Calavi (à 25 min de Cotonou). Visite matinale recommandée pour la lumière et l’animation du marché.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/06b54fa79_generated_43e6e90f.png'
  },
  {
    id: 'ouidah',
    category: 'monuments',
    title: 'Ouidah — La Porte du Non-Retour & La Route des Esclaves',
    badge: 'Patrimoine Mémoriel Mondial',
    location: 'Ouidah Plage & Cité Historique',
    tagline: 'Berceau d’Histoire & de Spiritualité',
    description:
      'Dressée face aux déferlantes de l’océan Atlantique, la Porte du Non-Retour est le monument emblématique commémorant les millions d’êtres humains déportés lors de la traite négrière. La célèbre Route des Esclaves s’étire sur 4 kilomètres entre la place Chacha, l’Arbre de l’Oubli et le littoral. Ouidah abrite également le Fort Portugais et le Temple des Pythons.',
    highlights: ['Mémorial monumental face à l’océan', 'Route des Esclaves historique', 'Temple sacré des Pythons & Forêt sacrée de Kpassè'],
    tips: 'Site en accès libre face à la plage. Visite conseillée en fin d’après-midi pour assister au coucher de soleil sur l’Atlantique.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/998c78e0f_generated_826b4e25.png'
  },
  {
    id: 'abomey',
    category: 'monuments',
    title: 'Abomey — Les Palais Royaux du Danxomè',
    badge: 'Patrimoine Mondial de l’UNESCO',
    location: 'Abomey · Cité Royale du Zou',
    tagline: 'La Grande Épopée des Rois & des Amazones',
    description:
      'Capitale politique du prestigieux royaume du Danxomè fondé au XVIIe siècle, Abomey abrite l’ensemble monumental des palais royaux classés à l’UNESCO. Les cours intérieures des rois Ghézo et Glèlè conservent des bas-reliefs en terre cuite polychrome d’une valeur inestimable, les trônes royaux et célèbrent la mémoire légendaire des Agoodjié, les redoutables guerrières Amazones du Danxomè.',
    highlights: ['Bas-reliefs en argile polychromes UNESCO', 'Trônes royaux et trésors des souverains', 'Mémoire héroïque des Amazones Agoodjié'],
    tips: 'À 2h30 de route de Cotonou. Visites guidées proposées par les conservateurs du musée historique d’Abomey.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/f7eb9d7b5_generated_bd25ef85.png'
  },
  {
    id: 'pendjari',
    category: 'nature',
    title: 'Parc National de la Pendjari & Chaîne de l’Atacora',
    badge: 'Réserve de Biosphère UNESCO',
    location: 'Parc de la Pendjari · Atacora',
    tagline: 'Le Grand Sanctuaire Faunique d’Afrique de l’Ouest',
    description:
      'S’étendant sur des centaines de milliers d’hectares au pied des falaises de l’Atacora, la Pendjari est la réserve animalière la plus préservée d’Afrique de l’Ouest. Elle abrite les derniers grands troupeaux d’éléphants, de lions d’Afrique occidentale, de buffles, de cobes de Buffon et d’innombrables rapaces au milieu de paysages de savane arborée grandioses.',
    highlights: ['Safaris fauniques matinaux et au crépuscule', 'Collines et panoramas de l’Atacora', 'Cascades rafraîchissantes de Tanougou et Kota'],
    tips: 'Période idéale d’observation : de Décembre à Mai. Accès recommandé en véhicule tout-terrain 4x4 avec guide ranger.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/53eb159f6_generated_5c492777.png'
  },
  {
    id: 'cotonou',
    category: 'monuments',
    title: 'Cotonou — Monument Amazone & Boulevard de la Marina',
    badge: 'Symbole Contemporain',
    location: 'Cotonou Littoral',
    tagline: 'La Vigueur et la Fierté de la Nation',
    description:
      'Haute de 30 mètres et sculptée dans le bronze, la statue monumentale de l’Amazone domine le boulevard de la Marina face à l’océan. Elle rend un vibrant hommage aux femmes guerrières qui ont forgé la bravoure du pays. Non loin, l’esplanade des Amazones, la Place de l’Étoile Rouge et le mythique marché Dantokpa témoignent du dynamisme urbain et culturel béninois.',
    highlights: ['Statue colossale de l’Amazone (30m)', 'Boulevard paysager face à l’océan', 'Fresques murales et street-art le long du Port'],
    tips: 'Accès libre 24h/24. Magnifiquement illuminée en soirée, parfaite pour une balade crépusculaire au bord de l’eau.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/8d23f1177_generated_fc0ecad1.png'
  },
  {
    id: 'porto-novo',
    category: 'monuments',
    title: 'Porto-Novo — Capitale Historique & Style Afro-Brésilien',
    badge: 'Cité aux Trois Noms',
    location: 'Porto-Novo · Lagune',
    tagline: 'Architecture Baroque Agouda & Musées Royaux',
    description:
      'Porto-Novo dévoile une ambiance paisible et un charme architectural unique hérité des artisans "Agoudas" revenus du Brésil au XIXe siècle. Sa Grande Mosquée au style baroque brésilien inspiré de Salvador de Bahia, le Musée Honmè (ancien palais des rois Toffa) et le Musée ethnographique Alexandre Sènou Adandé offrent une plongée culturelle d’une exceptionnelle richesse.',
    highlights: ['Grande Mosquée afro-brésilienne', 'Palais royal Musée Honmè', 'Jardin des Plantes et de la Nature (JPN)'],
    tips: 'À 35 minutes de Cotonou par l’autoroute côtière. Idéal pour une journée de découverte patrimoniale et artisanale.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/6cfb8c5b3_generated_5f9dba90.png'
  },
  {
    id: 'grand-popo',
    category: 'nature',
    title: 'Grand-Popo & La Bouche du Roy',
    badge: 'Éco-Tourisme & Estuaire Sauvage',
    location: 'Grand-Popo · Fleuve Mono',
    tagline: 'La Rencontre Magique du Fleuve et de l’Océan',
    description:
      'À la frontière maritime du Togo, Grand-Popo est un havre de paix naturel entre plages de sable blond et lagunes calmes. La Bouche du Roy marque l’embouchure spectaculaire où le fleuve Mono se jette dans l’Atlantique, créant des mangroves préservées abritant des îles aux oiseaux et un sanctuaire de protection des tortues marines.',
    highlights: ['Embouchure naturelle de la Bouche du Roy', 'Navigation douce dans les mangroves', 'Villages de pêcheurs et plages sauvages'],
    tips: 'Excursion en barque motorisée avec les écoguides locaux le long du fleuve Mono. Halte idéale pour se détendre.',
    image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/84aa52bc0_generated_f9756aa3.png'
  }
];

const CATEGORIES = [
  { key: 'all', label: 'Tous les trésors', icon: Compass },
  { key: 'monuments', label: 'Monuments & Histoire', icon: Landmark },
  { key: 'nature', label: 'Paysages & Réserves', icon: Mountain }
];

export function TourismPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredSites =
    selectedCategory === 'all'
      ? TOURISM_SITES
      : TOURISM_SITES.filter((s) => s.category === selectedCategory);

  return (
    <div className="min-h-screen">
      {/* 1. Monumental Hero Section */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 mx-auto max-w-8xl px-6 md:px-12">
          <ScrollReveal delay={0} y={20}>
            <div className="inline-flex items-center gap-2 mb-6">

            </div>
            
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-tight">
              Monuments, Paysages & Trésors Historiques à Visiter
            </h1>

            <p className="mt-6 max-w-3xl text-base sm:text-lg text-secondary-foreground/80 leading-relaxed">
              Le Bénin est une terre d'histoire vivante, de sanctuaires naturels préservés et de cités lacustres millénaires. 
              Ce guide a été conçu pour les voyageurs et curieux du monde entier afin de vous présenter les lieux incontournables à explorer lors de votre venue.
            </p>

            {/* Note informative de gratuité d'accès */}
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs sm:text-sm text-secondary-foreground/90 backdrop-blur-sm">
              <Info className="h-4 w-4 text-accent shrink-0" />
              <span>
                Les sites patrimoniaux et monuments présentés ci-dessous sont des repères culturels pour enrichir votre séjour.
              </span>
            </div>
          </ScrollReveal>

          {/* Filtres par Catégorie */}
          <ScrollReveal delay={100} y={20} className="mt-12 flex flex-wrap gap-2.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20'
                      : 'bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </ScrollReveal>
        </div>
      </section>

      {/* 2. Sites & Merveilles Grid */}
      <section className="mx-auto max-w-8xl px-6 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {filteredSites.map((site, index) => (
            <ScrollReveal
              key={site.id}
              id={site.id}
              delay={index * 80}
              y={30}
              className="group flex flex-col overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-sm hover:shadow-xl transition-all duration-500"
            >
              {/* Image & Badges */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={site.image}
                  alt={site.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Badge UNESCO / Merveille */}
                <div className="absolute left-4 top-4">
                  <span className="rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-bold tracking-wide uppercase text-accent backdrop-blur-md border border-white/15">
                    {site.badge}
                  </span>
                </div>

                {/* Localisation */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-1.5 text-xs font-semibold drop-shadow-md">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                    <span>{site.location}</span>
                  </div>
                </div>
              </div>

              {/* Contenu Curaté */}
              <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
                <div>
                  <p className="caption text-accent font-semibold tracking-wider text-xs">
                    {site.tagline}
                  </p>
                  <h2 className="font-heading mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {site.title}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                    {site.description}
                  </p>

                  {/* Points Clés */}
                  <div className="mt-5 space-y-2 border-t border-foreground/10 pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                      À ne pas manquer sur place :
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/80">
                      {site.highlights.map((hl, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Conseil Pratique Voyageur */}
                  <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-xs text-foreground/80 border border-foreground/5">
                    <p className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      <span>Conseil au voyageur</span>
                    </p>
                    <p className="leading-relaxed text-foreground/70">{site.tips}</p>
                  </div>
                </div>

                {/* Passerelles Logement & Véhicules Bénin Beyond */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-5 text-xs">
                  <span className="text-foreground/60 font-medium">
                    Préparez votre trajet vers ce lieu :
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/explore?type=stay"
                      className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3.5 py-1.5 font-semibold text-foreground hover:bg-muted hover:text-primary transition-colors"
                    >
                      <BedDouble className="h-3.5 w-3.5 text-primary" />
                      <span>Trouver un logement</span>
                    </Link>
                    <Link
                      to="/explore?type=drive"
                      className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3.5 py-1.5 font-semibold text-foreground hover:bg-muted hover:text-primary transition-colors"
                    >
                      <Car className="h-3.5 w-3.5 text-accent" />
                      <span>Louer un véhicule</span>
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* 3. Call to Action Hébergement & Mobilité */}
      <section className="border-t border-foreground/10 bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center md:px-12">
          <ScrollReveal delay={0} y={20}>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              Séjournez et déplacez-vous en toute sérénité à travers le Bénin
            </h3>
            <p className="mt-4 text-sm text-foreground/75 leading-relaxed">
              Pour profiter pleinement de ces merveilles patrimoniales, Bénin Beyond met à votre disposition 
              des villas et appartements de standing ainsi qu’une flotte complète de berlines et SUV 4x4.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/explore?type=stay"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
              >
                <span>Explorer les logements</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/explore?type=drive"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background px-7 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95"
              >
                <span>Découvrir la flotte de véhicules</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
