// Règles d'accès centralisées (groupes / événements)
import Event from '../models/event.mjs';
import Group from '../models/group.mjs';
import User from '../models/user.mjs';
import { includesId, uniqueIds } from './helpers.mjs';
import { badRequest, forbidden, notFound } from './AppError.mjs';

export const USER_FIELDS = 'nom prenom avatar';

/* ---------- Groupes ---------- */
export const isGroupAdmin = (group, user) => Boolean(user) && includesId(group.administrateurs, user);
export const isGroupMember = (group, user) => Boolean(user) && (includesId(group.membres, user) || isGroupAdmin(group, user));
// Un groupe secret est invisible pour les non-membres
export const canSeeGroup = (group, user) => group.type !== 'secret' || isGroupMember(group, user);
// Le contenu (membres, fil, événements) d'un groupe privé/secret est réservé aux membres
export const canSeeGroupContent = (group, user) => group.type === 'public' || isGroupMember(group, user);

export const loadGroup = async (id, user) => {
  const group = await Group.findById(id);
  if (!group || !canSeeGroup(group, user)) throw notFound('Groupe');
  return group;
};

export const requireGroupAdmin = (group, user) => {
  if (!isGroupAdmin(group, user)) throw forbidden('Réservé aux administrateurs du groupe.');
};

/* ---------- Événements ---------- */
export const isOrganizer = (event, user) => Boolean(user) && includesId(event.organisateurs, user);
export const isEventMember = (event, user) => Boolean(user) && (isOrganizer(event, user) || includesId(event.participants, user));

export const canSeeEvent = async (event, user) => {
  if (isEventMember(event, user)) return true;
  if (event.estPrive) return false;
  if (event.groupe) {
    const group = await Group.findById(event.groupe);
    if (group && group.type !== 'public') return isGroupMember(group, user);
  }
  return true;
};

export const loadEvent = async (id, user) => {
  const event = await Event.findById(id);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Événement');
  return event;
};

export const requireOrganizer = (event, user) => {
  if (!isOrganizer(event, user)) throw forbidden("Réservé aux organisateurs de l'événement.");
};

export const requireEventMember = (event, user) => {
  if (!isEventMember(event, user)) throw forbidden("Réservé aux participants de l'événement.");
};

export const eventRole = (event, user) => {
  if (isOrganizer(event, user)) return 'organisateur';
  if (isEventMember(event, user)) return 'participant';
  return null;
};

/* ---------- Utilisateurs ---------- */
export const ensureUsersExist = async (ids = []) => {
  const unique = uniqueIds(ids);
  if (!unique.length) return unique;
  const found = await User.find({ _id: { $in: unique } }).distinct('_id');
  if (found.length !== unique.length) {
    const missing = unique.filter((id) => !includesId(found, id));
    throw badRequest('Utilisateur(s) introuvable(s).', missing.map((id) => ({ champ: 'userId', message: id })));
  }
  return unique;
};
