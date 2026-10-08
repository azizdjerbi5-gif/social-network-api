import Event from '../models/event.mjs';
import Group from '../models/group.mjs';
import User from '../models/user.mjs';
import Discussion from '../models/discussion.mjs';
import Carpool from '../models/carpool.mjs';
import Ticket from '../models/ticket.mjs';
import * as cascade from '../utils/cascade.mjs';
import config from '../config/index.mjs';
import { badRequest, conflict, forbidden, notFound } from '../utils/AppError.mjs';
import {
  USER_FIELDS, loadEvent, loadGroup, requireOrganizer, isOrganizer, isEventMember, eventRole,
  isGroupAdmin, isGroupMember, ensureUsersExist
} from '../utils/access.mjs';
import { escapeRegex, includesId, paginate, paginated, sameId, uniqueIds } from '../utils/helpers.mjs';

const present = (event, user) => {
  const json = event.toJSON();
  json.nbParticipants = event.participants.length + event.organisateurs.length;
  json.monRole = eventRole(event, user);
  delete json.participants; // liste paginée via GET /events/:id/participants
  return json;
};

const populate = (event) => event.populate([
  { path: 'organisateurs', select: USER_FIELDS },
  { path: 'groupe', select: 'nom type icone' }
]);

// Étape 1 : configuration de l'événement (+ organisateurs & membres)
export const createEvent = async (req, res) => {
  const { organisateurs = [], participants = [], groupe: groupId, inviterMembresGroupe, ...fields } = req.body;
  const me = String(req.user._id);
  let invited = participants;

  if (groupId) {
    const group = await loadGroup(groupId, req.user);
    if (!isGroupMember(group, req.user)) throw forbidden('Vous devez être membre du groupe pour y créer un événement.');
    if (!group.autoriserCreationEvenementsMembres && !isGroupAdmin(group, req.user)) {
      throw forbidden("Les membres ne sont pas autorisés à créer des événements dans ce groupe.");
    }
    // Dans un groupe : invitation de tous les membres en un clic
    if (inviterMembresGroupe) invited = [...invited, ...group.membres];
  }

  const orgaIds = await ensureUsersExist([me, ...organisateurs]);
  const partIds = (await ensureUsersExist(invited)).filter((id) => !orgaIds.includes(id));

  const event = await Event.create({
    ...fields, organisateurs: orgaIds, participants: partIds, groupe: groupId || null, createur: me
  });
  await Discussion.create({ evenement: event._id }); // fil de discussion de l'événement
  await populate(event);
  res.status(201).json(present(event, req.user));
};

export const listEvents = async (req, res) => {
  const uid = req.user._id;
  const { q, from, to, groupe, mine } = req.query;
  const page = paginate(req.query);

  // Groupes privés/secrets dont je ne suis pas membre : leurs événements me sont cachés
  const hiddenGroups = await Group.find({ type: { $ne: 'public' }, membres: { $ne: uid } }).distinct('_id');
  const and = [{
    $or: [{ organisateurs: uid }, { participants: uid }, { estPrive: false, groupe: { $nin: hiddenGroups } }]
  }];
  if (mine) and.push({ $or: [{ organisateurs: uid }, { participants: uid }] });
  if (groupe) and.push({ groupe });
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); and.push({ $or: [{ nom: rx }, { lieu: rx }] }); }
  if (from || to) and.push({ dateDebut: { ...(from && { $gte: from }), ...(to && { $lte: to }) } });
  const filter = { $and: and };

  const [events, total] = await Promise.all([
    Event.find(filter).sort({ dateDebut: 1 }).skip(page.skip).limit(page.limit)
      .populate('organisateurs', USER_FIELDS).populate('groupe', 'nom type icone'),
    Event.countDocuments(filter)
  ]);
  res.json(paginated(events.map((e) => present(e, req.user)), total, page));
};

export const getEvent = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  await populate(event);
  res.json(present(event, req.user));
};

export const updateEvent = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  if (req.body.billetterie === false || req.body.estPrive === true) {
    if (event.billetterie && (await Ticket.exists({ evenement: event._id }))) {
      throw conflict('Des billets ont déjà été vendus : la billetterie ne peut plus être désactivée.');
    }
  }
  Object.assign(event, req.body);
  await event.save();
  await populate(event);
  res.json(present(event, req.user));
};

export const deleteEvent = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  await cascade.deleteEvent(event._id);
  res.status(204).end();
};

// Participer à un événement public
export const joinEvent = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  if (isEventMember(event, req.user)) throw conflict('Vous participez déjà à cet événement.');
  if (event.estPrive) throw forbidden('Cet événement privé est accessible uniquement sur invitation.');
  event.participants.push(req.user._id);
  await event.save();
  await populate(event);
  res.json(present(event, req.user));
};

export const leaveEvent = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  if (!isEventMember(event, req.user)) throw conflict("Vous ne participez pas à cet événement.");
  if (isOrganizer(event, req.user) && event.organisateurs.length === 1) {
    throw conflict('Vous êtes le seul organisateur : nommez un autre organisateur avant de quitter.');
  }
  event.organisateurs.pull(req.user._id);
  event.participants.pull(req.user._id);
  await event.save();
  await Carpool.updateMany({ evenement: event._id }, { $pull: { passagers: req.user._id } });
  res.status(204).end();
};

export const listParticipants = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  const page = paginate(req.query);
  const all = [
    ...event.organisateurs.map((id) => ({ id, role: 'organisateur' })),
    ...event.participants.map((id) => ({ id, role: 'participant' }))
  ];
  const slice = all.slice(page.skip, page.skip + page.limit);
  const users = await User.find({ _id: { $in: slice.map((s) => s.id) } }).select(USER_FIELDS);
  const data = slice.map((s) => {
    const u = users.find((x) => sameId(x, s.id));
    return u && { ...u.toJSON(), role: s.role };
  }).filter(Boolean);
  res.json(paginated(data, all.length, page));
};

// Inviter des membres
export const addParticipants = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  const ids = (await ensureUsersExist(req.body.userIds)).filter((id) => !includesId(event.organisateurs, id));
  event.participants = uniqueIds([...event.participants, ...ids]);
  await event.save();
  await populate(event);
  res.json(present(event, req.user));
};

// Inviter tous les membres du groupe en un clic
export const inviteGroupMembers = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  if (!event.groupe) throw badRequest("Cet événement n'est rattaché à aucun groupe.");
  const group = await Group.findById(event.groupe);
  if (!group) throw notFound('Groupe');
  const ids = group.membres.filter((id) => !includesId(event.organisateurs, id));
  const before = event.participants.length;
  event.participants = uniqueIds([...event.participants, ...ids]);
  await event.save();
  await populate(event);
  res.json({ invites: event.participants.length - before, evenement: present(event, req.user) });
};

export const removeParticipant = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  const { userId } = req.params;
  if (!sameId(userId, req.user._id)) requireOrganizer(event, req.user);
  if (!includesId(event.participants, userId)) throw notFound('Participant');
  event.participants.pull(userId);
  await event.save();
  await Carpool.updateMany({ evenement: event._id }, { $pull: { passagers: userId } });
  res.status(204).end();
};

export const addOrganizer = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  const [userId] = await ensureUsersExist([req.body.userId]);
  event.organisateurs = uniqueIds([...event.organisateurs, userId]);
  event.participants.pull(userId);
  await event.save();
  await populate(event);
  res.json(present(event, req.user));
};

export const removeOrganizer = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  const { userId } = req.params;
  if (!includesId(event.organisateurs, userId)) throw notFound('Organisateur');
  if (event.organisateurs.length === 1) throw conflict('Un événement doit conserver au moins un organisateur.');
  event.organisateurs.pull(userId);
  event.participants.addToSet(userId); // redevient simple participant
  await event.save();
  res.status(204).end();
};

// Partage sur les autres réseaux sociaux (événement public, hors groupe ou dans un groupe public)
export const shareEvent = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  if (event.estPrive) throw forbidden('Un événement privé ne peut pas être partagé.');
  if (event.groupe) {
    const group = await Group.findById(event.groupe);
    if (group && group.type !== 'public') throw forbidden("Seuls les événements des groupes publics peuvent être partagés.");
  }
  const link = `${config.publicUrl}/events/${event._id}`;
  const u = encodeURIComponent(link);
  const t = encodeURIComponent(`${event.nom} — ${event.lieu}`);
  res.json({
    lien: link,
    partages: {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      email: `mailto:?subject=${t}&body=${u}`
    }
  });
};
