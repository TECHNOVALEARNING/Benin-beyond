# Bénin Beyond — Clone Premium (React + Supabase)

Clone fidèle et haute performance de la plateforme **Bénin Beyond Stay** ([benin-beyond-stay.base44.app](https://benin-beyond-stay.base44.app/)).

Réalisé avec **React (Vite)**, **Tailwind CSS**, **Lucide Icons** et **Supabase**.

---

## 🌟 Fonctionnalités

1. **Expérience Visuelle & Design System** :
   - Palette authentique (Terracotta béninois, vert sombre, ambre doré, sable chaud).
   - Typographies Google Fonts : `Syne` (titres élégants) et `Inter` (lecture fluide).
   - Barre de navigation flottante glassmorphism en bas d'écran avec badge panier en temps réel.
   - Hero 3 volets interactifs extensibles au survol (*Séjourner*, *Conduire*, *Découvrir*).
   - Bandeau de réassurance (Paiement sécurisé, Vérifié par Bénin Beyond, Ancrage local, Conciergerie 24/7).

2. **Catalogue & Découverte (`/explore`)** :
   - Filtrage dynamique par catégorie (*Tout*, *Séjourner*, *Conduire*, *Découvrir*).
   - Moteur de recherche instantané par lieu ou titre.
   - Tri intelligent (Mis en avant, Prix croissant, Prix décroissant, Mieux notés).
   - Badges de vérification et aperçu des caractéristiques au survol.

3. **Fiche Détaillée & Réservation (`/listing/:id`)** :
   - Galerie photos plein format avec défilement horizontal.
   - Spécifications, équipements complets, hôte vérifié et coordonnées.
   - Widget interactif de réservation : calcul en direct du nombre de nuits/jours, choix du nombre de personnes et calcul dynamique du montant total en FCFA.

4. **Panier Persistant (`/panier`)** :
   - Gestion d'articles, durées et montants.
   - Suppression d'articles et récapitulatif détaillé.
   - Sauvegarde automatique dans le navigateur.

5. **Tunnel de Paiement 3 étapes (`/checkout`)** :
   - Étape 1 : Identité et coordonnées du voyageur.
   - Étape 2 : Protections additionnelles (Annulation flexible, Protection dommages).
   - Étape 3 : Sélection du moyen de paiement (MTN/Moov Mobile Money, Carte bancaire, Apple/Google Pay).
   - Écran de confirmation avec génération du numéro d'itinéraire officiel (ex: `BB-849201`), récapitulatif des prestations, bouton d'impression et sauvegarde.

6. **Intégration Supabase** :
   - Mode hybride résilient : l'application fonctionne immédiatement avec les 8 annonces réelles initiales.
   - Synchronisation complète avec votre base PostgreSQL Supabase pour les tables `listings` et `bookings`.

---

## 🚀 Démarrage Rapide

### 1. Installation des dépendances

```bash
npm install
```

### 2. Démarrage du serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`.

### 3. Build de production

```bash
npm run build
```

---

## 🗄️ Configuration Supabase (Optionnelle)

Pour connecter votre propre base Supabase :

1. Créez un projet sur [Supabase](https://supabase.com/).
2. Dans l'éditeur SQL de votre projet Supabase, exécutez le script contenu dans [`src/supabase/schema.sql`](./src/supabase/schema.sql).
3. Créez un fichier `.env` à la racine :
   ```env
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-anon
   ```
4. Pour insérer automatiquement les 8 annonces réelles dans votre base Supabase, lancez :
   ```bash
   node seed_supabase.js
   ```
