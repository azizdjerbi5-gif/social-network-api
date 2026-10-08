import Group from '../models/group.mjs';
import Event from '../models/event.mjs';
import Discussion from '../models/discussion.mjs';
import User from '../models/user.mjs';
import * as cascade from '../utils/cascade.mjs';
import { conflict, forbidden, notFound } from '../utils/AppError.mjs';
import {
  USER_FIELDS, loadGroup, requireGroupAdmin, isGroupAdmin, isGroupMember,
  canSeeGroupContent, ensureUsersExist
} from '../utils/access.mjs';
import { escapeRegex, includesId, paginate, paginated, sameId, uniqueIds } from '../utils/helpers.mjs';

const present = (group, user) => {
  const json = group.toJSON();
  json.nbMembres = group.membres.length;
  json.estMembre = isGroupMember(group, user);
  json.estAdministrateur = isGroupAdmin(group, user);
  delete json.membres; // liste paginée via GET /groups/:id/members
  return json;
};

export const createGroup = async (req, res) => {
  const { membres = [], administrateurs = [], ...fields } = req.body;
  const me = String(req.user._id);
  const admins = await ensureUsersExist([me, ...administrateurs]);
  const members = await ensureUsersExist([...admins, ...membres]);

  const group = await Group.create({ ...fields, administrateurs: admins, membres: members, createur: me });
  await Discussion.create({ groupe: group._id }); // fil de discussion du groupe
  await group.populate('administrateurs', USER_FIELDS);
  res.status(201).json(present(group, req.user));
};

export const listGroups = async (req, res) => {
  const uid = req.user._id;
  const page = paginate(req.query);
  const and = [{ $or: [{ type: { $in: ['public', 'prive'] } }, { membres: uid }] }];
  if (req.query.mine) and.push({ membres: uid });
  if (req.query.type) and.push({ type: req.query.type });
  if (req.query.q) and.push({ nom: new RegExp(escapeRegex(req.query.q), 'i') });
  const filter = { $and: and };

  const [groups, total] = await Promise.all([
    Group.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).populate('administrateurs', USER_FIELDS),
    Group.countDocuments(filter)
  ]);
  res.json(paginated(groups.map((g) => present(g, req.user)), total, page));
};

export const getGroup = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  await group.populate('administrateurs', USER_FIELDS);
  res.json(present(group, req.user));
};

export const updateGroup = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  requireGroupAdmin(group, req.user);
  Object.assign(group, req.body);
  await group.save();
  res.json(present(group, req.user));
};

export const deleteGroup = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  requireGroupAdmin(group, req.user);
  await cascade.deleteGroup(group._id);
  res.status(204).end();
};

// Rejoindre : libre pour un groupe public, sur ajout d'un admin pour privé/secret
export const joinGroup = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  if (isGroupMember(group, req.user)) throw conflict('Vous êtes déjà membre de ce groupe.');
  if (group.type !== 'public') throw forbidden("Ce groupe n'est accessible que sur invitation d'un administrateur.");
  group.membres.push(req.user._id);
  await group.save();
  res.json(present(group, req.user));
};

export const leaveGroup = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  if (!isGroupMember(group, req.user)) throw conflict("Vous n'êtes pas membre de ce groupe.");
  if (isGroupAdmin(group, req.user) && group.administrateurs.length === 1) {
    throw conflict('Vous êtes le seul administrateur : nommez un autre administrateur avant de quitter le groupe.');
  }
  group.membres.pull(req.user._id);
  group.administrateurs.pull(req.user._id);
  await group.save();
  res.status(204).end();
};

export const listMembers = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  if (!canSeeGroupContent(group, req.user)) throw forbidden('Les membres de ce groupe sont réservés à ses membres.');
  const page = paginate(req.query);
  const ids = group.membres.slice(page.skip, page.skip + page.limit);
  const users = await User.find({ _id: { $in: ids } }).select(USER_FIELDS);
  const data = ids.map((id) => users.find((u) => sameId(u, id))).filter(Boolean).map((u) => ({
    ...u.toJSON(), role: isGroupAdmin(group, u) ? 'administrateur' : 'membre'
  }));
  res.json(paginated(data, group.membres.length, page));
};

export const addMembers = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  requireGroupAdmin(group, req.user);
  const ids = await ensureUsersExist(req.body.userIds);
  group.membres = uniqueIds([...group.membres, ...ids]);
  await group.save();
  res.json(present(group, req.user));
};

export const removeMember = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  const { userId } = req.params;
  if (!sameId(userId, req.user._id)) requireGroupAdmin(group, req.user);
  if (!includesId(group.membres, userId)) throw notFound('Membre');
  if (includesId(group.administrateurs, userId) && group.administrateurs.length === 1) {
    throw conflict('Impossible de retirer le dernier administrateur du groupe.');
  }
  group.membres.pull(userId);
  group.administrateurs.pull(userId);
  await group.save();
  res.status(204).end();
};

export const addAdmin = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  requireGroupAdmin(group, req.user);
  const [userId] = await ensureUsersExist([req.body.userId]);
  group.administrateurs = uniqueIds([...group.administrateurs, userId]);
  group.membres = uniqueIds([...group.membres, userId]);
  await group.save();
  await group.populate('administrateurs', USER_FIELDS);
  res.json(present(group, req.user));
};

export const removeAdmin = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  requireGroupAdmin(group, req.user);
  const { userId } = req.params;
  if (!includesId(group.administrateurs, userId)) throw notFound('Administrateur');
  if (group.administrateurs.length === 1) throw conflict('Un groupe doit conserver au moins un administrateur.');
  group.administrateurs.pull(userId); // reste membre
  await group.save();
  res.status(204).end();
};

export const listGroupEvents = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  if (!canSeeGroupContent(group, req.user)) throw forbidden('Les événements de ce groupe sont réservés à ses membres.');
  const page = paginate(req.query);
  const uid = req.user._id;
  const filter = { groupe: group._id, $or: [{ estPrive: false }, { organisateurs: uid }, { participants: uid }] };
  const [data, total] = await Promise.all([
    Event.find(filter).select('-participants').sort({ dateDebut: 1 }).skip(page.skip).limit(page.limit)
      .populate('organisateurs', USER_FIELDS),
    Event.countDocuments(filter)
  ]);
  res.json(paginated(data, total, page));
};
