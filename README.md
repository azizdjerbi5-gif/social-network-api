# My Social Networks — API REST

API du nouveau service **My Social Networks** (cahier des charges Facebook) réalisée avec **Node.js**, **Express 5** et **MongoDB** (Mongoose 9).

Fonctionnalités : utilisateurs, groupes (public / privé / secret), événements, fils de discussion, albums photo, sondages, billetterie, et les deux bonus **shopping list** et **covoiturage**.

## Démarrage

Prérequis : Node.js ≥ 20 et un serveur MongoDB (local ou MongoDB Atlas).

```bash
npm install
cp .env.example .env      # puis renseigner MONGODB_URI et JWT_SECRET
npm start                 # ou: npm run dev (rechargement auto)
```

- API : `http://localhost:3000/api`
- Documentation interactive (Swagger UI) : `http://localhost:3000/docs`
- Spécification OpenAPI brute : `http://localhost:3000/docs.json` (aussi exportée dans `docs/openapi.json` via `npm run docs:export`). Dans Postman : *Import* → coller l’URL `/docs.json` pour générer toute la collection.

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port HTTP | `3000` |
| `MONGODB_URI` | Chaîne de connexion MongoDB | `mongodb://127.0.0.1:27017/social-network-api` |
| `JWT_SECRET` | Secret de signature des tokens | secret de dev (à changer) |
| `JWT_EXPIRES_IN` | Durée de validité du token | `2h` |
| `PUBLIC_URL` | URL publique utilisée dans les liens de partage | `http://localhost:3000` |

## Architecture

```
index.mjs                  point d'entrée (connexion MongoDB + écoute HTTP)
src/
  app.mjs                  application Express (helmet, cors, JSON, /docs, /api)
  config/                  configuration (variables d'environnement)
  models/                  schémas Mongoose (1 fichier = 1 collection)
  validators/              schémas Joi de validation des entrées
  controllers/             logique métier
  routes/definitions.mjs   table unique des routes (méthode, chemin, auth, validation, handler)
  routes/index.mjs         construit le routeur Express à partir de la table
  docs/openapi.mjs         génère la doc OpenAPI à partir de la même table + schémas Joi
  middlewares/             auth JWT, validation, gestion d'erreurs
  utils/                   règles d'accès, suppressions en cascade, pagination
```

La documentation est **générée à partir des validateurs** : elle reste donc toujours synchronisée avec ce que l’API accepte réellement.

## Conventions

- **Authentification** : `POST /api/auth/login` (ou `/register`) renvoie un JWT à envoyer dans `Authorization: Bearer <token>`.
- **Validation** : chaque entrée (body, query, paramètres) est validée par Joi ; les champs inconnus sont ignorés. Tous les paramètres `:id` doivent être des ObjectId valides. Les modèles Mongoose ajoutent une seconde couche de validation.
- **Pagination** : `?page=1&limit=20` (max 100) → `{ data, pagination: { page, limit, total, pages } }`.
- **Erreurs** : `{ message, details? }` — `400` données invalides, `401` non authentifié, `403` interdit, `404` introuvable (ou invisible pour l’utilisateur), `409` conflit / règle métier.
- **Sécurité** : mots de passe hachés (bcrypt) et jamais renvoyés, en-têtes `helmet`, CORS.

## Modèle de données (collections)

| Collection | Contenu | Règles clés |
|---|---|---|
| `users` | nom, prénom, email, mot de passe, date de naissance, avatar, bio, ville | email **unique** (index) |
| `groups` | nom, description, icône, couverture, type `public`/`prive`/`secret`, autorisations de publication et de création d’événements, administrateurs, membres | ≥ 1 administrateur, ≥ 1 membre, les admins sont membres |
| `events` | nom, description, dates de début/fin, lieu, couverture, privé/public, organisateurs, participants, groupe, options `billetterie` / `shoppingList` / `covoiturage` | ≥ 1 organisateur, fin ≥ début, billetterie uniquement si public |
| `discussions` | fil rattaché à **un groupe ou un événement** | exclusivité vérifiée, un fil par groupe / événement (index uniques partiels) |
| `messages` | auteur, contenu, `parent` (null = message, sinon réponse) | collection dédiée pour supporter de gros volumes |
| `albums` | titre, description, événement | rattaché à 1 événement |
| `photos` | URL, légende, auteur, album | postée par un participant |
| `photocomments` | texte, auteur, photo | commentaires des participants |
| `polls` | titre, questions → options | créé par un organisateur, ≥ 1 question, ≥ 2 options par question |
| `pollanswers` | participant, une option choisie par question | 1 réponse par participant et par sondage (index unique) |
| `tickettypes` | nom, montant, quantité, vendus | quantité limitée |
| `tickets` | type de billet, nom, prénom, email, adresse complète, montant, date d’achat | **1 billet par personne (email) et par événement** (index unique) |
| `shoppingitems` *(bonus)* | nom, quantité, heure d’arrivée, utilisateur | élément **unique par événement** (casse/accents ignorés) |
| `carpools` *(bonus)* | lieu et heure de départ, prix, places, écart max (min), passagers | 1 trajet par conducteur et par événement |

## Règles métier et choix de conception

Le cahier des charges laissait certains points ouverts ; voici les choix faits, dans l’esprit de Facebook.

**Groupes**
- Le créateur devient administrateur. On peut inviter des membres et nommer des co-administrateurs dès la création.
- **Public** : visible de tous, on le rejoint librement, son contenu est lisible par tous.
- **Privé** : visible dans la recherche, mais membres, fil et événements réservés aux membres ; on y entre uniquement sur ajout d’un administrateur.
- **Secret** : invisible (404) pour les non-membres, entrée sur ajout d’un administrateur.
- `autoriserPublicationMembres = false` : seuls les admins publient des messages principaux, les membres peuvent toujours **répondre**.
- `autoriserCreationEvenementsMembres = false` : seuls les admins créent des événements dans le groupe.
- Le dernier administrateur ne peut ni partir ni être retiré. Supprimer un groupe supprime son fil ; ses événements sont conservés mais détachés.

**Événements**
- Le créateur est organisateur ; on peut fournir des co-organisateurs et des membres dès la création (étape « configuration »).
- Créé dans un groupe, l’événement **invite automatiquement tous les membres** (`inviterMembresGroupe`, vrai par défaut). `POST /events/:id/invite-group` relance l’invitation en un clic (nouveaux membres).
- **Public** : visible de tous (même sans compte), on y participe librement. **Privé** : visible uniquement des organisateurs/participants, sur invitation. Un événement d’un groupe privé/secret n’est visible que des membres du groupe.
- **Partage** : `GET /events/:id/share` renvoie des liens Facebook, X, LinkedIn, WhatsApp et email — réservé aux organisateurs, pour un événement public hors groupe ou dans un groupe public.
- Un fil de discussion est créé automatiquement pour chaque groupe et chaque événement.
- Supprimer un événement supprime en cascade : fil, messages, albums, photos, commentaires, sondages, réponses, billets, shopping list, covoiturages.

**Fils de discussion** — Un seul niveau de réponses (une réponse à une réponse est rattachée au message d’origine). L’auteur peut modifier son message ; l’auteur ou un admin/organisateur peut le supprimer (avec ses réponses).

**Albums photo** — Tout participant peut créer un album, poster des photos et commenter. L’auteur ou un organisateur peut supprimer.

**Sondages** — Créés par les organisateurs. Pour répondre, le participant envoie **une option par question** (toutes les questions sont obligatoires). Un nouvel envoi remplace son vote. `GET /polls/:id/results` donne le nombre de votes et le pourcentage par option.

**Billetterie**
- Uniquement pour un événement **public** avec `billetterie: true`.
- Les types de billets sont publics (`GET /events/:id/ticket-types`) et l’achat se fait **sans compte** (personne extérieure).
- Une même personne (email) n’obtient qu’**un seul billet par événement** (contrôle applicatif + index unique).
- Le stock est décrémenté de façon **atomique** (pas de survente en cas d’achats simultanés). On ne peut ni supprimer un type déjà vendu, ni réduire la quantité sous le nombre de ventes, ni désactiver la billetterie après des ventes.

**Shopping list (bonus)** — Activée par `shoppingList: true`. Chaque participant indique nom, quantité et heure d’arrivée ; un même élément ne peut être apporté qu’une fois par événement (« Chips » = « chips »).

**Covoiturage (bonus)** — Activé par `covoiturage: true`. Le conducteur indique lieu et heure de départ, prix, places et écart maximum en minutes (ex. 30 sur un trajet de 2h30 = 3h max). En plus : les participants **réservent une place** (`POST /carpools/:id/booking`), de manière atomique (pas de surréservation).

## Exemple rapide

```bash
# Inscription
curl -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"nom":"Djerbi","prenom":"Aziz","email":"aziz@example.com","password":"motdepasse1"}'

# Création d'un événement public avec billetterie
curl -X POST localhost:3000/api/events -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nom":"Concert","dateDebut":"2026-12-01T19:00:00Z","dateFin":"2026-12-01T23:00:00Z","lieu":"Paris","billetterie":true}'

# Type de billet puis achat sans compte
curl -X POST localhost:3000/api/events/$EVENT/ticket-types -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nom":"Standard","montant":25,"quantite":100}'
curl -X POST localhost:3000/api/ticket-types/$TYPE/purchase -H 'Content-Type: application/json' \
  -d '{"nom":"Martin","prenom":"Léa","email":"lea@example.com","adresse":{"rue":"1 rue de Rivoli","codePostal":"75001","ville":"Paris","pays":"France"}}'
```

## Endpoints

Le détail des corps de requête, des paramètres et des réponses est dans Swagger (`/docs`). 🔒 = token JWT obligatoire.

#### Authentification

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Créer un compte |
| POST | `/api/auth/login` | — | Se connecter (retourne un JWT) |

#### Utilisateurs

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | 🔒 | Mon profil |
| PATCH | `/api/users/me` | 🔒 | Modifier mon profil |
| DELETE | `/api/users/me` | 🔒 | Supprimer mon compte |
| GET | `/api/users` | 🔒 | Rechercher des utilisateurs |
| GET | `/api/users/:id` | 🔒 | Profil public d'un utilisateur |

#### Groupes

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/groups` | 🔒 | Créer un groupe (public, privé ou secret) |
| GET | `/api/groups` | 🔒 | Lister les groupes visibles |
| GET | `/api/groups/:id` | 🔒 | Détail d'un groupe |
| PATCH | `/api/groups/:id` | 🔒 | Modifier les paramètres du groupe (admin) |
| DELETE | `/api/groups/:id` | 🔒 | Supprimer le groupe (admin) |
| POST | `/api/groups/:id/join` | 🔒 | Rejoindre un groupe public |
| POST | `/api/groups/:id/leave` | 🔒 | Quitter un groupe |
| GET | `/api/groups/:id/members` | 🔒 | Lister les membres |
| POST | `/api/groups/:id/members` | 🔒 | Ajouter des membres (admin) |
| DELETE | `/api/groups/:id/members/:userId` | 🔒 | Retirer un membre (admin ou soi-même) |
| POST | `/api/groups/:id/admins` | 🔒 | Nommer un administrateur (admin) |
| DELETE | `/api/groups/:id/admins/:userId` | 🔒 | Retirer un administrateur (admin) |
| GET | `/api/groups/:id/events` | 🔒 | Événements du groupe |
| GET | `/api/groups/:id/discussion` | 🔒 | Fil de discussion du groupe |

#### Événements

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/events` | 🔒 | Créer un événement |
| GET | `/api/events` | 🔒 | Lister les événements visibles |
| GET | `/api/events/:id` | optionnelle | Détail d'un événement |
| PATCH | `/api/events/:id` | 🔒 | Modifier l'événement (organisateur) |
| DELETE | `/api/events/:id` | 🔒 | Supprimer l'événement (organisateur) |
| POST | `/api/events/:id/join` | 🔒 | Participer à un événement public |
| POST | `/api/events/:id/leave` | 🔒 | Quitter l'événement |
| GET | `/api/events/:id/participants` | 🔒 | Lister organisateurs et participants |
| POST | `/api/events/:id/participants` | 🔒 | Inviter des membres (organisateur) |
| POST | `/api/events/:id/invite-group` | 🔒 | Inviter tous les membres du groupe en un clic (organisateur) |
| DELETE | `/api/events/:id/participants/:userId` | 🔒 | Retirer un participant (organisateur ou soi-même) |
| POST | `/api/events/:id/organizers` | 🔒 | Ajouter un organisateur (organisateur) |
| DELETE | `/api/events/:id/organizers/:userId` | 🔒 | Retirer un organisateur (organisateur) |
| GET | `/api/events/:id/share` | 🔒 | Liens de partage sur les réseaux sociaux (organisateur) |
| GET | `/api/events/:id/discussion` | 🔒 | Fil de discussion de l'événement |

#### Fils de discussion

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/discussions/:id/messages` | 🔒 | Lister les messages (avec leurs réponses) |
| POST | `/api/discussions/:id/messages` | 🔒 | Publier un message |
| POST | `/api/discussions/:id/messages/:messageId/replies` | 🔒 | Répondre à un message |
| PATCH | `/api/discussions/:id/messages/:messageId` | 🔒 | Modifier son message |
| DELETE | `/api/discussions/:id/messages/:messageId` | 🔒 | Supprimer un message (auteur ou modérateur) |

#### Albums photo

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/events/:id/albums` | 🔒 | Créer un album (participant) |
| GET | `/api/events/:id/albums` | 🔒 | Albums de l'événement |
| GET | `/api/albums/:id` | 🔒 | Détail d'un album |
| PATCH | `/api/albums/:id` | 🔒 | Modifier un album |
| DELETE | `/api/albums/:id` | 🔒 | Supprimer un album |
| POST | `/api/albums/:id/photos` | 🔒 | Poster une photo (participant) |
| GET | `/api/albums/:id/photos` | 🔒 | Photos de l'album |
| GET | `/api/photos/:id` | 🔒 | Détail d'une photo |
| DELETE | `/api/photos/:id` | 🔒 | Supprimer une photo (auteur ou organisateur) |
| POST | `/api/photos/:id/comments` | 🔒 | Commenter une photo (participant) |
| GET | `/api/photos/:id/comments` | 🔒 | Commentaires d'une photo |
| DELETE | `/api/photos/:id/comments/:commentId` | 🔒 | Supprimer un commentaire |

#### Sondages

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/events/:id/polls` | 🔒 | Créer un sondage (organisateur) |
| GET | `/api/events/:id/polls` | 🔒 | Sondages de l'événement |
| GET | `/api/polls/:id` | 🔒 | Détail d'un sondage (+ mes réponses) |
| DELETE | `/api/polls/:id` | 🔒 | Supprimer un sondage (organisateur) |
| PUT | `/api/polls/:id/answers` | 🔒 | Répondre au sondage (1 réponse par question) |
| GET | `/api/polls/:id/results` | 🔒 | Résultats du sondage |

#### Billetterie

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/events/:id/ticket-types` | 🔒 | Créer un type de billet (organisateur) |
| GET | `/api/events/:id/ticket-types` | optionnelle | Billets disponibles (public) |
| PATCH | `/api/ticket-types/:id` | 🔒 | Modifier un type de billet (organisateur) |
| DELETE | `/api/ticket-types/:id` | 🔒 | Supprimer un type de billet non vendu (organisateur) |
| POST | `/api/ticket-types/:id/purchase` | optionnelle | Acheter un billet (personne extérieure, sans compte) |
| GET | `/api/events/:id/tickets` | 🔒 | Billets vendus (organisateur) |

#### Shopping list (bonus)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/events/:id/shopping-items` | 🔒 | J'apporte quelque chose |
| GET | `/api/events/:id/shopping-items` | 🔒 | Shopping list de l’événement |
| PATCH | `/api/shopping-items/:id` | 🔒 | Modifier un élément |
| DELETE | `/api/shopping-items/:id` | 🔒 | Supprimer un élément |

#### Covoiturage (bonus)

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/events/:id/carpools` | 🔒 | Proposer un covoiturage |
| GET | `/api/events/:id/carpools` | 🔒 | Covoiturages de l'événement |
| GET | `/api/carpools/:id` | 🔒 | Détail d'un covoiturage |
| PATCH | `/api/carpools/:id` | 🔒 | Modifier son trajet (conducteur) |
| DELETE | `/api/carpools/:id` | 🔒 | Supprimer un trajet (conducteur ou organisateur) |
| POST | `/api/carpools/:id/booking` | 🔒 | Réserver une place |
| DELETE | `/api/carpools/:id/booking` | 🔒 | Annuler sa réservation |
