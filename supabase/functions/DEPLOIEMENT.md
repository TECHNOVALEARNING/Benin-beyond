# Mise en service de la fonction serveur « benin-beyond »

Tout le travail côté serveur du site tient dans **un seul fichier** : `supabase/functions/benin-beyond/index.ts`.
Vous ne déployez donc **qu'une seule fonction** dans Supabase. Elle regroupe trois rôles :

| Adresse | Rôle |
|---|---|
| `…/benin-beyond/nyole-checkout` | Enregistre la réservation (en attente de paiement) puis crée la session de paiement Nyole avec la clé secrète. |
| `…/benin-beyond/nyole-webhook` | Reçoit les notifications de Nyole. C'est le seul endroit qui passe une réservation à « payée ». Il enregistre aussi le paiement et envoie les e-mails de confirmation. |
| `…/benin-beyond/translate` | Traduit en anglais les textes écrits par les propriétaires (DeepL). |

Il est **normal** de ne voir aucune fonction dans Supabase aujourd'hui : c'est la première.

## Ce qui change pour les paiements

| Avant | Maintenant |
|---|---|
| La réservation « payée » était créée par le navigateur du voyageur à son retour de Nyole. S'il fermait la page, il était débité sans réservation. | La réservation est enregistrée **avant** le départ vers Nyole, en statut « en attente / non payée ». |
| N'importe qui pouvait écrire une fausse réservation « payée » dans la base. | Seul le serveur peut la passer à « payée », après avoir redemandé le statut à Nyole avec la clé secrète. |
| La session de paiement était créée depuis le navigateur. | Elle est créée par le serveur avec la clé secrète, qui n'est jamais envoyée au navigateur. |

Une réservation en attente qui n'est jamais payée ne bloque plus les dates au bout d'une heure. Si Nyole signale une annulation, elle passe en « annulée ».

## Ordre des étapes (à respecter)

### 1. Préparer la base (SQL, sans risque)
Supabase → **SQL Editor** : la base doit contenir les colonnes de paiement Nyole (`nyole_session_id`,
`nyole_order_id`) sur `bookings`, la table `listing_reports` et la table `translations`.
(Les scripts SQL ne sont plus conservés dans le dépôt : ils sont rédigés au besoin.)

### 2. Enregistrer les secrets
Supabase → **Edge Functions** → **Secrets** → **Add new secret** :

| Nom | Valeur |
|---|---|
| `NYOLE_SECRET_KEY` | **obligatoire** : votre clé **secrète** Nyole (`af_live_sec_...`), dans app.nyole.com → *API et journaux* |
| `SITE_URL` | l'adresse publique du site, sans `/` final (ex. `https://benin-beyond.vercel.app`) |
| `BREVO_API_KEY` | clé Brevo pour les e-mails (voir plus bas) |
| `NOTIFY_FROM_EMAIL` | adresse d'expédition validée dans Brevo |
| `ADMIN_NOTIFY_EMAIL` | *(facultatif)* votre adresse, pour recevoir une copie de chaque réservation payée |
| `DEEPL_API_KEY` | *(facultatif)* clé DeepL pour la traduction automatique (voir plus bas) |
| `NYOLE_WEBHOOK_SECRET` | *(facultatif)* uniquement si Nyole vous affiche une clé de signature distincte pour les webhooks |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement par Supabase : ne les ajoutez pas.

### 3. Déployer la fonction
**Option A, depuis le tableau de bord Supabase (sans installation)**
1. **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom de la fonction : `benin-beyond` (exactement ce nom).
3. Effacer le code proposé et coller **tout** le contenu de `supabase/functions/benin-beyond/index.ts`, puis **Deploy**.
4. Ouvrir la fonction → **Details / Settings** → **désactiver** « Enforce JWT verification » (ou « Verify JWT ») → **Save**.
   Nyole n'envoie pas de jeton Supabase, et les voyageurs qui paient sans compte non plus.

**Option B, en ligne de commande (dans le dossier du projet)**
```bash
npx supabase login
```
```bash
npx supabase functions deploy benin-beyond --no-verify-jwt --project-ref VOTRE_REF_PROJET
```
`VOTRE_REF_PROJET` est l'identifiant du projet, visible dans l'URL Supabase (`https://VOTRE_REF_PROJET.supabase.co`).

À chaque modification du fichier `index.ts`, recommencez cette étape 3 (coller le nouveau contenu → Deploy).

### 4. Déclarer l'URL du webhook dans Nyole
app.nyole.com → **API et journaux** (app.nyole.com/developer) → Webhooks → ajouter l'URL :

```
https://VOTRE_REF_PROJET.supabase.co/functions/v1/benin-beyond/nyole-webhook
```

Événements à cocher : `payment.completed`, `payment.cancelled`, `payment.failed` et `payment.updated` (ou « tous »).

### 5. Mettre en ligne la nouvelle version du site
Publier le site (fusion de la branche puis déploiement Vercel habituel).

### 6. Verrouiller la base (SQL)
Une fois le site publié : le déclencheur `bookings_protect_payment_fields` doit être actif dans la base.
À partir de là, plus aucune réservation « payée » ne peut être écrite depuis un navigateur.

## E-mails de confirmation (Brevo)
Quand une réservation passe à « payée », la fonction envoie :
- au **voyageur** : la confirmation, avec la référence, les dates et le montant ;
- au **propriétaire** : l'avis de nouvelle réservation, avec son gain net ;
- à **l'équipe** (si `ADMIN_NOTIFY_EMAIL` est rempli) : une copie.

Mise en place :
1. Créer un compte gratuit sur https://www.brevo.com (300 e-mails par jour).
2. Menu **Expéditeurs, domaines et IP dédiées** → **Expéditeurs** → ajouter l'adresse qui enverra les e-mails, puis cliquer sur le lien de validation reçu par e-mail.
3. Menu **SMTP et API** → onglet **Clés API** → **Générer une nouvelle clé**, puis la copier (elle ne s'affiche qu'une fois).
4. Ajouter dans les secrets Supabase : `BREVO_API_KEY`, `NOTIFY_FROM_EMAIL` et, si vous le souhaitez, `ADMIN_NOTIFY_EMAIL`.

Une clé API ne doit jamais être envoyée par message ni collée ailleurs que dans les secrets Supabase. Si c'est arrivé, supprimez-la dans Brevo et générez-en une nouvelle.

Conseil : avec une adresse Gmail comme expéditeur, une partie des e-mails peut arriver dans les spams. Pour une meilleure délivrabilité, ajoutez plus tard votre nom de domaine dans Brevo (menu **Domaines**).

Sans ces secrets, les paiements fonctionnent normalement : seuls les e-mails ne partent pas.

## Traduction automatique en anglais (DeepL)
Quand un visiteur passe le site en **EN**, les textes de l'interface sont déjà traduits. Les textes écrits par les propriétaires et prestataires (titres, descriptions, équipements, avis) sont traduits automatiquement avec **DeepL** (offre gratuite : 500 000 caractères par mois). Chaque texte n'est traduit qu'une fois, puis gardé en mémoire.

Mise en place :
1. Créer un compte **DeepL API Free** sur https://www.deepl.com/pro-api. Une carte bancaire est demandée pour vérifier l'identité, mais l'offre gratuite n'est pas facturée.
2. DeepL → **Compte** → **Clé d'authentification** : copier la clé (elle se termine par `:fx`).
3. Ajouter le secret `DEEPL_API_KEY` dans Supabase.

Sans cette étape, le site fonctionne : les textes des propriétaires restent simplement en français.

## Signalements d'annonces
Une fois la table `listing_reports` créée (étape 1), les signalements des voyageurs apparaissent dans l'admin → **Modération**, avec les boutons « Classer » et « Suspendre l'annonce ».

## Vérifier que tout marche
1. Faire une petite réservation réelle (ou avec une clé de test `af_test_sec_...` dans `NYOLE_SECRET_KEY`).
2. Après le paiement, la page affiche la confirmation. Dans Supabase → **Table Editor** → `bookings`, la ligne a `payment_status = paid`, et une ligne existe dans `payments`.
3. Faire un second essai en **fermant l'onglet** juste après avoir payé. La réservation doit quand même passer à `paid` au bout de quelques secondes, grâce au webhook.
4. En cas de problème : Supabase → **Edge Functions** → `benin-beyond` → **Logs**, et côté Nyole → **API et journaux** → journal des livraisons, où un webhook peut être rejoué.

## Documentation Nyole utilisée
- Signature des webhooks : https://nyole.com/docs/webhooks/signature/ (en-têtes `X-Afriflow-Timestamp` / `X-Afriflow-Signature`, HMAC-SHA256 de `timestamp.corps`, 5 minutes de tolérance).
- Événements : https://nyole.com/docs/webhooks/evenements/
- Statut d'une session : https://nyole.com/docs/paiements/verifier-le-statut/
- Création de session : https://nyole.com/docs/paiements/creer-une-session/

La documentation dit que les webhooks sont signés avec « votre clé secrète » sans préciser s'il s'agit de la clé API `af_live_sec_` ou d'une clé distincte. La fonction utilise `NYOLE_WEBHOOK_SECRET` si elle est définie, sinon `NYOLE_SECRET_KEY`. Si les webhooks sont refusés avec « Signature invalide » dans les logs, demandez au support Nyole quelle clé signe les webhooks.
