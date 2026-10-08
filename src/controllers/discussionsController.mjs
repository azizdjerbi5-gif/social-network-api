import Discussion from '../models/discussion.mjs';
import Message from '../models/message.mjs';
import Group from '../models/group.mjs';
import Event from '../models/event.mjs';
import { forbidden, notFound } from '../utils/AppError.mjs';
import {
  USER_FIELDS, loadGroup, loadEvent, isGroupAdmin, isGroupMember, canSeeGroupContent,
  isOrganizer, isEventMember, canSeeGroup, canSeeEvent
} from '../utils/access.mjs';
import { paginate, paginated, sameId } from '../utils/helpers.mjs';

// Droits sur un fil selon qu'il appartient à un groupe ou à un événement
const loadContext = async (discussionId, user) => {
  const discussion = await Discussion.findById(discussionId);
  if (!discussion) throw notFound('Fil de discussion');

  if (discussion.groupe) {
    const group = await Group.findById(discussion.groupe);
    if (!group || !canSeeGroup(group, user)) throw notFound('Fil de discussion');
    const member = isGroupMember(group, user);
    const admin = isGroupAdmin(group, user);
    return {
      discussion,
      canRead: canSeeGroupContent(group, user),
      canWrite: member,
      canPost: admin || (member && group.autoriserPublicationMembres),
      isModerator: admin
    };
  }

  const event = await Event.findById(discussion.evenement);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Fil de discussion');
  const member = isEventMember(event, user);
  return { discussion, canRead: member, canWrite: member, canPost: member, isModerator: isOrganizer(event, user) };
};

const withReplies = async (messages) => {
  const replies = await Message.find({ parent: { $in: messages.map((m) => m._id) } })
    .sort({ createdAt: 1 }).populate('auteur', USER_FIELDS);
  return messages.map((m) => ({ ...m.toJSON(), reponses: replies.filter((r) => sameId(r.parent, m._id)) }));
};

const getOrCreate = async (filter) =>
  (await Discussion.findOne(filter)) ?? Discussion.create(filter);

export const getGroupDiscussion = async (req, res) => {
  const group = await loadGroup(req.params.id, req.user);
  if (!canSeeGroupContent(group, req.user)) throw forbidden('Le fil de ce groupe est réservé à ses membres.');
  const discussion = await getOrCreate({ groupe: group._id });
  res.json({ ...discussion.toJSON(), nbMessages: await Message.countDocuments({ discussion: discussion._id }) });
};

export const getEventDiscussion = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  if (!isEventMember(event, req.user)) throw forbidden("Le fil de cet événement est réservé à ses participants.");
  const discussion = await getOrCreate({ evenement: event._id });
  res.json({ ...discussion.toJSON(), nbMessages: await Message.countDocuments({ discussion: discussion._id }) });
};

// Messages principaux (du plus récent au plus ancien) avec leurs réponses
export const listMessages = async (req, res) => {
  const ctx = await loadContext(req.params.id, req.user);
  if (!ctx.canRead) throw forbidden('Fil de discussion réservé aux membres.');
  const page = paginate(req.query);
  const filter = { discussion: ctx.discussion._id, parent: null };
  const [messages, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).populate('auteur', USER_FIELDS),
    Message.countDocuments(filter)
  ]);
  res.json(paginated(await withReplies(messages), total, page));
};

export const postMessage = async (req, res) => {
  const ctx = await loadContext(req.params.id, req.user);
  if (!ctx.canWrite) throw forbidden('Seuls les membres peuvent écrire dans ce fil.');
  if (!ctx.canPost) throw forbidden('Seuls les administrateurs peuvent publier dans ce groupe.');
  const message = await Message.create({ discussion: ctx.discussion._id, auteur: req.user._id, contenu: req.body.contenu });
  await message.populate('auteur', USER_FIELDS);
  res.status(201).json(message);
};

// Chaque membre / participant peut répondre à un message
export const replyMessage = async (req, res) => {
  const ctx = await loadContext(req.params.id, req.user);
  if (!ctx.canWrite) throw forbidden('Seuls les membres peuvent répondre dans ce fil.');
  const parent = await Message.findOne({ _id: req.params.messageId, discussion: ctx.discussion._id });
  if (!parent) throw notFound('Message');
  const reply = await Message.create({
    discussion: ctx.discussion._id,
    auteur: req.user._id,
    contenu: req.body.contenu,
    parent: parent.parent ?? parent._id // un seul niveau de réponses
  });
  await reply.populate('auteur', USER_FIELDS);
  res.status(201).json(reply);
};

export const updateMessage = async (req, res) => {
  const ctx = await loadContext(req.params.id, req.user);
  const message = await Message.findOne({ _id: req.params.messageId, discussion: ctx.discussion._id });
  if (!message) throw notFound('Message');
  if (!sameId(message.auteur, req.user._id)) throw forbidden("Seul l'auteur peut modifier son message.");
  message.contenu = req.body.contenu;
  message.modifie = true;
  await message.save();
  res.json(message);
};

export const deleteMessage = async (req, res) => {
  const ctx = await loadContext(req.params.id, req.user);
  const message = await Message.findOne({ _id: req.params.messageId, discussion: ctx.discussion._id });
  if (!message) throw notFound('Message');
  if (!sameId(message.auteur, req.user._id) && !ctx.isModerator) {
    throw forbidden("Seul l'auteur ou un administrateur/organisateur peut supprimer ce message.");
  }
  await Message.deleteMany({ $or: [{ _id: message._id }, { parent: message._id }] });
  res.status(204).end();
};
