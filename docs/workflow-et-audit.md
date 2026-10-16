# Bénin Beyond — Fonctionnement de la plateforme et audit

État constaté le 16/10/2026, à partir du code et de la base Supabase en production (lecture seule).

---

## 1. Le voyageur

1. **Il découvre l'offre.** Accueil, « Séjourner » (`/explore`), véhicules, packs, Découvertes (`/decouvertes`). Il n'a pas besoin de compte.
2. **Il choisit un bien.** Sur la fiche, il choisit les dates (ou le nombre de jours pour un véhicule) et ajoute au panier. Le panier mémorise le propriétaire du bien (`owner_id`, `owner_email`).
3. **Il paie** (`/checkout`) :
   - il saisit son nom, son téléphone et son e-mail, et peut ajouter des options de protection ;
   - le site vérifie que les dates sont libres (anti double réservation) ;
   - il est redirigé vers **Nyole** (MTN MoMo, Moov, Celtiis, carte).
4. **Retour de Nyole.** Le navigateur interroge Nyole :
   - paiement confirmé → réservation **confirmée / payée** ;
   - paiement non confirmé → réservation **en attente / non payée** ;
   - paiement refusé ou annulé → aucune réservation.
5. **Compte voyageur.** Il est invité à se connecter (`/login`). Dans `/dashboard/client`, il retrouve ses réservations et son reçu, et peut laisser un avis (modéré par l'équipe avant publication).

⚠️ La réservation est créée **par le navigateur du voyageur** au retour de Nyole (voir § 5.3).

---

## 2. Le propriétaire (hôte / loueur)

1. **Inscription.** Il crée un compte « propriétaire » (e-mail ou Google).
2. **Vérification (KYC)** — `/onboarding/partner` :
   - il choisit son profil (particulier, société, gestionnaire mandaté) et ses catégories de biens ;
   - il dépose ses pièces (CIP, IFU, RCCM, titre foncier, carte grise…) ;
   - il signe, puis le dossier part chez l'équipe.
3. **Publication** — `/dashboard/partner` → « Publier une annonce » :
   - avant certification, l'annonce est enregistrée **en attente** ;
   - dès que l'admin certifie le propriétaire, toutes ses annonces passent **en ligne** ;
   - les annonces suivantes sont publiées immédiatement.
4. **Gestion au quotidien.**
   - **Réservations :** il consulte ses réservations et confirme celles qui sont en attente.
   - **Disponibilités :** il bloque des dates (réservation conclue en direct). Ces dates deviennent indisponibles en ligne.
   - **Annonces :** il les modifie, les prévisualise ou les supprime.
5. **Revenus et reversements** (corrigé, voir § 4) :
   - **Solde disponible** = gains nets des réservations **confirmées ET payées** (montant − 10 % de commission), moins les reversements déjà demandés ou exécutés ;
   - il fait une demande de virement (Mobile Money ou banque) ;
   - l'équipe vérifie, **paie manuellement**, puis marque la demande « payée ».

### La mensualité (abonnement)

**Elle n'existe pas dans le site.** Il n'y avait ni paiement, ni table, ni date d'échéance, ni blocage en cas d'impayé. Seul un texte affichait « Abonnement actif jusqu'au 31/12/2026 » à tous les propriétaires. Ce texte était fictif et je l'ai retiré (tableau de bord propriétaire, page de vérification, fenêtre KYC de l'admin).

Aujourd'hui, le seul revenu de la plateforme est **la commission de 10 % sur chaque réservation**, plus les 500 FCFA des prestataires Découvertes.

Pour mettre en place un abonnement, il faut d'abord décider :
- le montant et la périodicité ;
- ce qui se passe en cas d'impayé (annonces masquées ? compte suspendu ?).

Ensuite il faudra :
- une table `subscriptions` ;
- un paiement Nyole récurrent ou manuel ;
- un contrôle côté serveur.

---

## 3. L'équipe : super-administrateur et assistants

**Super-admin** = `isidoretoudonou@gmail.com`. **Assistants** = rôle `subadmin`.

| Section | Super-admin | Assistant | Ce qu'on y fait |
|---|---|---|---|
| Vue d'ensemble | ✓ | ✓ | Chiffres encaissés, courbe, tâches à traiter |
| Réservations | ✓ | ✓ | Valider une réservation en attente, voir le reçu, supprimer |
| Finances | ✓ | ✓ | Encaissé, commissions, reversé, reste dû, export CSV |
| Modération | ✓ | ✓ | Approuver / refuser une annonce (avec motif), vidéo, photos |
| Biens | ✓ | ✓ | Inventaire complet, mise en ligne / suspension |
| Publier une annonce | ✓ | ✓ | Publier directement, avec option « en ligne immédiatement » |
| Packs | ✓ | ✓ | Offres combinées villa + véhicule |
| Événements | ✓ | ✓ | Agenda culturel affiché sur l'accueil |
| Découvertes | ✓ | ✓ | Valider les restaurants et prestataires, suspendre, supprimer |
| Partenaires | ✓ | ✓ | Dossiers KYC, certifier / refuser, demandes de versement |
| Utilisateurs | ✓ | ✗ | Créer des assistants, changer les rôles, suspendre, supprimer |
| Avis | ✓ | ✓ | Publier / masquer / supprimer, choisir les avis de l'accueil |

**Marquer un reversement « payé »** est réservé au **super-admin** : la règle de sécurité côté base est `is_admin`. Un assistant qui essaie reçoit un message de refus.

---

## 4. Les demandes de reversement

### Ce qui ne marchait pas

**La table et le code ne correspondaient pas.** L'enregistrement dans Supabase échouait **toujours** :
- l'identifiant envoyé était `po_123` alors que la base attend un UUID ;
- les noms de colonnes et les valeurs de « méthode » ne correspondaient pas ;
- le statut « approved » était refusé par la base ;
- aucune règle n'autorisait un propriétaire à créer sa demande.

L'erreur était ignorée sans rien afficher. La demande restait dans le **navigateur du propriétaire** : l'administrateur ne la voyait jamais, sauf sur le même ordinateur.

**Le solde affiché était faux :**
- il comptait les réservations non payées ou annulées ;
- il ne déduisait jamais les reversements déjà demandés ou payés : on pouvait redemander le même argent sans limite.

### Ce qui marche maintenant

1. Le propriétaire voit son **solde disponible réel**.
2. **Sa demande est enregistrée dans Supabase.** La base refuse tout montant supérieur au solde : le contrôle est fait par un déclencheur SQL, pas seulement à l'écran.
3. **L'admin la voit** dans *Partenaires → Demandes de versement*, sur n'importe quel appareil.
4. **Il effectue le virement** depuis son téléphone (MoMo) ou sa banque, en dehors du site.
5. **Il clique « Marquer payé »** (ou « Refuser »). Le statut, la date et l'auteur sont enregistrés.
6. Le propriétaire voit « Virement exécuté » et son solde est mis à jour.

À prévoir plus tard :
- champ « référence du virement » ;
- notification e-mail ou WhatsApp au propriétaire ;
- règle « argent disponible seulement après le départ du voyageur ».

---

## 5. Ce qui était fictif (retiré)

| Élément | Où | Correction |
|---|---|---|
| 9 restaurants et prestataires inventés (faux numéros) | Page Découvertes | Supprimés, y compris des caches navigateur. La page n'affiche que les fiches réelles validées |
| Paiement de 500 FCFA **simulé** (attente de 1,4 s puis « payé ») | Formulaire de référencement | Supprimé. La fiche est envoyée **en attente**. L'équipe encaisse les 500 FCFA (MoMo) puis la publie (« À valider » → « En ligne ») |
| Restaurants publiés sans contrôle | Découvertes | Toute fiche déposée par le public attend la validation de l'équipe |
| « Abonnement actif jusqu'au 31/12/2026 » | Propriétaire, vérification, admin | Retiré |
| Bouton « Insérer pièces spécimens » (faux PDF dans le dossier KYC) | Vérification propriétaire | Retiré |
| « Vues estimées » (= nombre d'annonces × 14) et « taux de conversion » | Statistiques propriétaire | Remplacés par des chiffres réels : annonces en ligne, réservations payées, durée moyenne, revenu net |
| « Relevé comptable généré avec succès » (rien n'était généré) | Finances admin | Remplacé par un **vrai export CSV** des réservations payées |
| « Synthèse certifiée OHADA » | Finances admin | Retiré |
| Paiements inconnus comptés comme « MTN » | Finances admin | Nouvelle ligne « Nyole (canal non précisé) » |
| « Total encaissé » incluant les réservations non payées | Admin et propriétaire | Seules les réservations payées et non annulées sont comptées |
| « Retraits instantanés, 0 frais, 24 h » | Revenus propriétaire | Remplacé par le vrai fonctionnement (paiement manuel après vérification) |
| Colonne « Validé » affichée pour toutes les réservations | Règlements propriétaire | Statut réel (payée / non payée / annulée) |
| Numéro « +229 97 00 00 00 » pré-rempli | Demande de virement | Champ prérempli avec le vrai numéro du propriétaire (ou vide) |

Les événements culturels par défaut (Vodun Days, Gani…) sont de vrais événements. Je les ai gardés.

---

## 6. Supabase : problèmes constatés

### 6.1 Scripts non exécutés sur la base de production ⚠️ priorité

Constaté en lecture seule sur la base en ligne :
- **la table `discoveries` n'existe pas** (erreur 404). C'est pour cela que Découvertes ne s'enregistrait jamais ;
- **les dossiers KYC (`owner_verification_applications`) sont lisibles ET modifiables par n'importe qui** avec la clé publique du site : pièces d'identité, IFU, téléphones.

Ces deux points montrent que **`security_hardening.sql` n'a pas été exécuté**.

**À faire, dans cet ordre (SQL Editor → Run) :**
1. `src/supabase/security_hardening.sql` : verrouille les profils, annonces, réservations, avis et dossiers KYC.
2. `src/supabase/discoveries_and_payouts.sql` (nouveau) : crée la table Découvertes et corrige la table des reversements, son contrôle de solde et ses règles d'accès.

Après le script 1, les actions d'administration exigent une vraie connexion Supabase avec le compte administrateur.

### 6.2 Données personnelles encore visibles publiquement (même après le script 1)
- `profiles` : lecture ouverte à tous (e-mails, téléphones). La page de connexion s'en sert pour dire « compte inconnu ». Il faudra passer par une fonction dédiée avant de fermer cet accès.
- `bookings` : lecture ouverte à tous (noms, téléphones et e-mails des voyageurs). Le site filtre côté navigateur ; il faudra filtrer côté base (voyageur, propriétaire, équipe).

### 6.3 Paiements confirmés par le navigateur
- La réservation « payée » est créée par le navigateur du voyageur après son retour de Nyole :
  - si le voyageur ferme la page avant, **il est débité mais aucune réservation n'existe** ;
  - n'importe qui peut écrire une fausse réservation « payée » (insertion ouverte à tous).
- **Solution :** une fonction serveur (Supabase Edge Function) qui reçoit le webhook de Nyole et crée ou confirme la réservation elle-même.

### 6.4 Données gardées dans le navigateur (`localStorage`)

Plusieurs informations ne vivent que sur l'appareil où l'action a été faite :
- les modifications d'utilisateurs faites par l'admin (`benin_beyond_admin_user_overrides`) ;
- les listes « supprimés » (annonces, réservations, avis, découvertes) ;
- les comptes voyageurs créés automatiquement au paiement (`registerOrLoginClient`) : ils n'ont pas de vrai compte Supabase.

Conséquence : ces actions ne sont pas partagées entre l'ordinateur et le téléphone de l'admin. Quand Supabase refuse une écriture, un message s'affiche désormais (`SyncErrorToast`), mais la donnée reste locale.

### 6.5 Mode hors-ligne
Si les clés Supabase sont absentes, le site bascule dans un mode local avec un mot de passe administrateur par défaut écrit dans le code. Ce n'est pas le cas en production (les clés sont configurées), mais ce mode est à supprimer avant toute mise en ligne publique du code.
