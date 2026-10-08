import Album from '../models/album.mjs';
import Photo from '../models/photo.mjs';
import PhotoComment from '../models/photoComment.mjs';
import Event from '../models/event.mjs';
import * as cascade from '../utils/cascade.mjs';
import { forbidden, notFound } from '../utils/AppError.mjs';
import { USER_FIELDS, loadEvent, requireEventMember, isOrganizer, canSeeEvent } from '../utils/access.mjs';
import { paginate, paginated, sameId } from '../utils/helpers.mjs';

const loadAlbum = async (id, user) => {
  const album = await Album.findById(id);
  if (!album) throw notFound('Album');
  const event = await Event.findById(album.evenement);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Album');
  return { album, event };
};

const loadPhoto = async (id, user) => {
  const photo = await Photo.findById(id);
  if (!photo) throw notFound('Photo');
  const event = await Event.findById(photo.evenement);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Photo');
  return { photo, event };
};

/* ----- Albums ----- */
export const createAlbum = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireEventMember(event, req.user);
  const album = await Album.create({ ...req.body, evenement: event._id, createur: req.user._id });
  res.status(201).json(album);
};

export const listAlbums = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  const albums = await Album.find({ evenement: event._id }).sort({ createdAt: -1 }).populate('createur', USER_FIELDS);
  const counts = await Promise.all(albums.map((a) => Photo.countDocuments({ album: a._id })));
  res.json(albums.map((a, i) => ({ ...a.toJSON(), nbPhotos: counts[i] })));
};

export const getAlbum = async (req, res) => {
  const { album } = await loadAlbum(req.params.id, req.user);
  await album.populate('createur', USER_FIELDS);
  res.json({ ...album.toJSON(), nbPhotos: await Photo.countDocuments({ album: album._id }) });
};

export const updateAlbum = async (req, res) => {
  const { album, event } = await loadAlbum(req.params.id, req.user);
  if (!sameId(album.createur, req.user._id) && !isOrganizer(event, req.user)) {
    throw forbidden("Seul le créateur de l'album ou un organisateur peut le modifier.");
  }
  Object.assign(album, req.body);
  await album.save();
  res.json(album);
};

export const deleteAlbum = async (req, res) => {
  const { album, event } = await loadAlbum(req.params.id, req.user);
  if (!sameId(album.createur, req.user._id) && !isOrganizer(event, req.user)) {
    throw forbidden("Seul le créateur de l'album ou un organisateur peut le supprimer.");
  }
  await cascade.deleteAlbum(album._id);
  res.status(204).end();
};

/* ----- Photos (postées par 1 participant) ----- */
export const addPhoto = async (req, res) => {
  const { album, event } = await loadAlbum(req.params.id, req.user);
  requireEventMember(event, req.user);
  const photo = await Photo.create({ ...req.body, album: album._id, evenement: event._id, auteur: req.user._id });
  await photo.populate('auteur', USER_FIELDS);
  res.status(201).json(photo);
};

export const listPhotos = async (req, res) => {
  const { album } = await loadAlbum(req.params.id, req.user);
  const page = paginate(req.query);
  const [photos, total] = await Promise.all([
    Photo.find({ album: album._id }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).populate('auteur', USER_FIELDS),
    Photo.countDocuments({ album: album._id })
  ]);
  const counts = await Promise.all(photos.map((p) => PhotoComment.countDocuments({ photo: p._id })));
  res.json(paginated(photos.map((p, i) => ({ ...p.toJSON(), nbCommentaires: counts[i] })), total, page));
};

export const getPhoto = async (req, res) => {
  const { photo } = await loadPhoto(req.params.id, req.user);
  await photo.populate('auteur', USER_FIELDS);
  res.json(photo);
};

export const deletePhoto = async (req, res) => {
  const { photo, event } = await loadPhoto(req.params.id, req.user);
  if (!sameId(photo.auteur, req.user._id) && !isOrganizer(event, req.user)) {
    throw forbidden("Seul l'auteur ou un organisateur peut supprimer cette photo.");
  }
  await cascade.deletePhotos({ _id: photo._id });
  res.status(204).end();
};

/* ----- Commentaires (par les participants) ----- */
export const addComment = async (req, res) => {
  const { photo, event } = await loadPhoto(req.params.id, req.user);
  requireEventMember(event, req.user);
  const comment = await PhotoComment.create({ photo: photo._id, auteur: req.user._id, texte: req.body.texte });
  await comment.populate('auteur', USER_FIELDS);
  res.status(201).json(comment);
};

export const listComments = async (req, res) => {
  const { photo } = await loadPhoto(req.params.id, req.user);
  const page = paginate(req.query);
  const [data, total] = await Promise.all([
    PhotoComment.find({ photo: photo._id }).sort({ createdAt: 1 }).skip(page.skip).limit(page.limit).populate('auteur', USER_FIELDS),
    PhotoComment.countDocuments({ photo: photo._id })
  ]);
  res.json(paginated(data, total, page));
};

export const deleteComment = async (req, res) => {
  const { photo, event } = await loadPhoto(req.params.id, req.user);
  const comment = await PhotoComment.findOne({ _id: req.params.commentId, photo: photo._id });
  if (!comment) throw notFound('Commentaire');
  const allowed = sameId(comment.auteur, req.user._id) || sameId(photo.auteur, req.user._id) || isOrganizer(event, req.user);
  if (!allowed) throw forbidden('Suppression non autorisée.');
  await comment.deleteOne();
  res.status(204).end();
};
