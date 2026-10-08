// Définition unique des routes : sert à la fois au routeur Express et à la documentation OpenAPI
import * as users from '../controllers/usersController.mjs';
import * as groups from '../controllers/groupsController.mjs';
import * as events from '../controllers/eventsController.mjs';
import * as discussions from '../controllers/discussionsController.mjs';
import * as albums from '../controllers/albumsController.mjs';
import * as polls from '../controllers/pollsController.mjs';
import * as tickets from '../controllers/ticketsController.mjs';
import * as shopping from '../controllers/shoppingController.mjs';
import * as carpools from '../controllers/carpoolsController.mjs';

import * as vUsers from '../validators/users.mjs';
import * as vGroups from '../validators/groups.mjs';
import * as vEvents from '../validators/events.mjs';
import * as vDisc from '../validators/discussions.mjs';
import * as vAlbums from '../validators/albums.mjs';
import * as vPolls from '../validators/polls.mjs';
import * as vTickets from '../validators/tickets.mjs';
import * as vShopping from '../validators/shopping.mjs';
import * as vCarpools from '../validators/carpools.mjs';
import { paginationQuery } from '../validators/common.mjs';

const T = {
  auth: 'Authentification',
  users: 'Utilisateurs',
  groups: 'Groupes',
  events: 'Événements',
  disc: 'Fils de discussion',
  albums: 'Albums photo',
  polls: 'Sondages',
  tickets: 'Billetterie',
  shopping: 'Shopping list (bonus)',
  carpools: 'Covoiturage (bonus)'
};

export const tags = Object.values(T);

// auth : true (JWT obligatoire) | 'optional' | false
const r = (method, path, tag, summary, handler, opts = {}) => ({ method, path, tag, summary, handler, auth: true, status: 200, ...opts });

export default [
  /* ---------- Authentification ---------- */
  r('post', '/auth/register', T.auth, 'Créer un compte', users.register, { auth: false, body: vUsers.register, status: 201 }),
  r('post', '/auth/login', T.auth, 'Se connecter (retourne un JWT)', users.login, { auth: false, body: vUsers.login }),

  /* ---------- Utilisateurs ---------- */
  r('get', '/users/me', T.users, 'Mon profil', users.getMe),
  r('patch', '/users/me', T.users, 'Modifier mon profil', users.updateMe, { body: vUsers.updateMe }),
  r('delete', '/users/me', T.users, 'Supprimer mon compte', users.deleteMe, { status: 204 }),
  r('get', '/users', T.users, 'Rechercher des utilisateurs', users.searchUsers, { query: vUsers.searchUsers }),
  r('get', '/users/:id', T.users, "Profil public d'un utilisateur", users.getUser),

  /* ---------- Groupes ---------- */
  r('post', '/groups', T.groups, 'Créer un groupe (public, privé ou secret)', groups.createGroup, { body: vGroups.createGroup, status: 201,
    description: "Le créateur devient administrateur et membre. Un fil de discussion est créé automatiquement." }),
  r('get', '/groups', T.groups, 'Lister les groupes visibles', groups.listGroups, { query: vGroups.listGroups,
    description: 'Groupes publics et privés + groupes secrets dont je suis membre.' }),
  r('get', '/groups/:id', T.groups, "Détail d'un groupe", groups.getGroup),
  r('patch', '/groups/:id', T.groups, 'Modifier les paramètres du groupe (admin)', groups.updateGroup, { body: vGroups.updateGroup }),
  r('delete', '/groups/:id', T.groups, 'Supprimer le groupe (admin)', groups.deleteGroup, { status: 204 }),
  r('post', '/groups/:id/join', T.groups, 'Rejoindre un groupe public', groups.joinGroup),
  r('post', '/groups/:id/leave', T.groups, 'Quitter un groupe', groups.leaveGroup, { status: 204 }),
  r('get', '/groups/:id/members', T.groups, 'Lister les membres', groups.listMembers, { query: paginationQuery }),
  r('post', '/groups/:id/members', T.groups, 'Ajouter des membres (admin)', groups.addMembers, { body: vGroups.addMembers }),
  r('delete', '/groups/:id/members/:userId', T.groups, 'Retirer un membre (admin ou soi-même)', groups.removeMember, { status: 204 }),
  r('post', '/groups/:id/admins', T.groups, 'Nommer un administrateur (admin)', groups.addAdmin, { body: vGroups.addAdmin }),
  r('delete', '/groups/:id/admins/:userId', T.groups, 'Retirer un administrateur (admin)', groups.removeAdmin, { status: 204 }),
  r('get', '/groups/:id/events', T.groups, 'Événements du groupe', groups.listGroupEvents, { query: paginationQuery }),
  r('get', '/groups/:id/discussion', T.groups, 'Fil de discussion du groupe', discussions.getGroupDiscussion),

  /* ---------- Événements ---------- */
  r('post', '/events', T.events, 'Créer un événement', events.createEvent, { body: vEvents.createEvent, status: 201,
    description: "Le créateur devient organisateur. Si `groupe` est fourni, tous les membres du groupe sont invités (`inviterMembresGroupe`, vrai par défaut). Un fil de discussion est créé automatiquement." }),
  r('get', '/events', T.events, 'Lister les événements visibles', events.listEvents, { query: vEvents.listEvents }),
  r('get', '/events/:id', T.events, "Détail d'un événement", events.getEvent, { auth: 'optional',
    description: 'Accessible sans compte pour un événement public (hors groupe privé/secret).' }),
  r('patch', '/events/:id', T.events, "Modifier l'événement (organisateur)", events.updateEvent, { body: vEvents.updateEvent }),
  r('delete', '/events/:id', T.events, "Supprimer l'événement (organisateur)", events.deleteEvent, { status: 204 }),
  r('post', '/events/:id/join', T.events, 'Participer à un événement public', events.joinEvent),
  r('post', '/events/:id/leave', T.events, "Quitter l'événement", events.leaveEvent, { status: 204 }),
  r('get', '/events/:id/participants', T.events, 'Lister organisateurs et participants', events.listParticipants, { query: paginationQuery }),
  r('post', '/events/:id/participants', T.events, 'Inviter des membres (organisateur)', events.addParticipants, { body: vEvents.addParticipants }),
  r('post', '/events/:id/invite-group', T.events, 'Inviter tous les membres du groupe en un clic (organisateur)', events.inviteGroupMembers),
  r('delete', '/events/:id/participants/:userId', T.events, 'Retirer un participant (organisateur ou soi-même)', events.removeParticipant, { status: 204 }),
  r('post', '/events/:id/organizers', T.events, 'Ajouter un organisateur (organisateur)', events.addOrganizer, { body: vEvents.addOrganizer }),
  r('delete', '/events/:id/organizers/:userId', T.events, 'Retirer un organisateur (organisateur)', events.removeOrganizer, { status: 204 }),
  r('get', '/events/:id/share', T.events, 'Liens de partage sur les réseaux sociaux (organisateur)', events.shareEvent, {
    description: 'Uniquement pour un événement public, hors groupe ou dans un groupe public.' }),
  r('get', '/events/:id/discussion', T.events, "Fil de discussion de l'événement", discussions.getEventDiscussion),

  /* ---------- Fils de discussion ---------- */
  r('get', '/discussions/:id/messages', T.disc, 'Lister les messages (avec leurs réponses)', discussions.listMessages, { query: paginationQuery }),
  r('post', '/discussions/:id/messages', T.disc, 'Publier un message', discussions.postMessage, { body: vDisc.message, status: 201 }),
  r('post', '/discussions/:id/messages/:messageId/replies', T.disc, 'Répondre à un message', discussions.replyMessage, { body: vDisc.message, status: 201 }),
  r('patch', '/discussions/:id/messages/:messageId', T.disc, 'Modifier son message', discussions.updateMessage, { body: vDisc.message }),
  r('delete', '/discussions/:id/messages/:messageId', T.disc, 'Supprimer un message (auteur ou modérateur)', discussions.deleteMessage, { status: 204 }),

  /* ---------- Albums photo ---------- */
  r('post', '/events/:id/albums', T.albums, 'Créer un album (participant)', albums.createAlbum, { body: vAlbums.createAlbum, status: 201 }),
  r('get', '/events/:id/albums', T.albums, "Albums de l'événement", albums.listAlbums),
  r('get', '/albums/:id', T.albums, "Détail d'un album", albums.getAlbum),
  r('patch', '/albums/:id', T.albums, 'Modifier un album', albums.updateAlbum, { body: vAlbums.updateAlbum }),
  r('delete', '/albums/:id', T.albums, 'Supprimer un album', albums.deleteAlbum, { status: 204 }),
  r('post', '/albums/:id/photos', T.albums, 'Poster une photo (participant)', albums.addPhoto, { body: vAlbums.addPhoto, status: 201 }),
  r('get', '/albums/:id/photos', T.albums, "Photos de l'album", albums.listPhotos, { query: paginationQuery }),
  r('get', '/photos/:id', T.albums, "Détail d'une photo", albums.getPhoto),
  r('delete', '/photos/:id', T.albums, 'Supprimer une photo (auteur ou organisateur)', albums.deletePhoto, { status: 204 }),
  r('post', '/photos/:id/comments', T.albums, 'Commenter une photo (participant)', albums.addComment, { body: vAlbums.comment, status: 201 }),
  r('get', '/photos/:id/comments', T.albums, "Commentaires d'une photo", albums.listComments, { query: paginationQuery }),
  r('delete', '/photos/:id/comments/:commentId', T.albums, 'Supprimer un commentaire', albums.deleteComment, { status: 204 }),

  /* ---------- Sondages ---------- */
  r('post', '/events/:id/polls', T.polls, 'Créer un sondage (organisateur)', polls.createPoll, { body: vPolls.createPoll, status: 201 }),
  r('get', '/events/:id/polls', T.polls, "Sondages de l'événement", polls.listPolls),
  r('get', '/polls/:id', T.polls, "Détail d'un sondage (+ mes réponses)", polls.getPoll),
  r('delete', '/polls/:id', T.polls, 'Supprimer un sondage (organisateur)', polls.deletePoll, { status: 204 }),
  r('put', '/polls/:id/answers', T.polls, 'Répondre au sondage (1 réponse par question)', polls.answerPoll, { body: vPolls.answerPoll,
    description: 'Une réponse (optionId) est obligatoire pour chaque question. Un nouvel envoi remplace le vote précédent.' }),
  r('get', '/polls/:id/results', T.polls, 'Résultats du sondage', polls.getResults),

  /* ---------- Billetterie ---------- */
  r('post', '/events/:id/ticket-types', T.tickets, 'Créer un type de billet (organisateur)', tickets.createTicketType, { body: vTickets.createTicketType, status: 201,
    description: "L'événement doit être public et avoir `billetterie: true`." }),
  r('get', '/events/:id/ticket-types', T.tickets, 'Billets disponibles (public)', tickets.listTicketTypes, { auth: 'optional' }),
  r('patch', '/ticket-types/:id', T.tickets, 'Modifier un type de billet (organisateur)', tickets.updateTicketType, { body: vTickets.updateTicketType }),
  r('delete', '/ticket-types/:id', T.tickets, 'Supprimer un type de billet non vendu (organisateur)', tickets.deleteTicketType, { status: 204 }),
  r('post', '/ticket-types/:id/purchase', T.tickets, 'Acheter un billet (personne extérieure, sans compte)', tickets.purchaseTicket, {
    auth: 'optional', body: vTickets.purchase, status: 201,
    description: 'Une même personne (email) ne peut obtenir qu’un seul billet par événement. Le stock est décrémenté de manière atomique.' }),
  r('get', '/events/:id/tickets', T.tickets, 'Billets vendus (organisateur)', tickets.listTickets, { query: paginationQuery }),

  /* ---------- Shopping list (bonus) ---------- */
  r('post', '/events/:id/shopping-items', T.shopping, "J'apporte quelque chose", shopping.createItem, { body: vShopping.createItem, status: 201,
    description: "Nécessite `shoppingList: true`. Chaque élément est unique par événement (casse et accents ignorés)." }),
  r('get', '/events/:id/shopping-items', T.shopping, 'Shopping list de l’événement', shopping.listItems),
  r('patch', '/shopping-items/:id', T.shopping, 'Modifier un élément', shopping.updateItem, { body: vShopping.updateItem }),
  r('delete', '/shopping-items/:id', T.shopping, 'Supprimer un élément', shopping.deleteItem, { status: 204 }),

  /* ---------- Covoiturage (bonus) ---------- */
  r('post', '/events/:id/carpools', T.carpools, 'Proposer un covoiturage', carpools.createCarpool, { body: vCarpools.createCarpool, status: 201,
    description: 'Nécessite `covoiturage: true`.' }),
  r('get', '/events/:id/carpools', T.carpools, "Covoiturages de l'événement", carpools.listCarpools),
  r('get', '/carpools/:id', T.carpools, "Détail d'un covoiturage", carpools.getCarpool),
  r('patch', '/carpools/:id', T.carpools, 'Modifier son trajet (conducteur)', carpools.updateCarpool, { body: vCarpools.updateCarpool }),
  r('delete', '/carpools/:id', T.carpools, 'Supprimer un trajet (conducteur ou organisateur)', carpools.deleteCarpool, { status: 204 }),
  r('post', '/carpools/:id/booking', T.carpools, 'Réserver une place', carpools.bookSeat),
  r('delete', '/carpools/:id/booking', T.carpools, 'Annuler sa réservation', carpools.cancelSeat, { status: 204 })
];
