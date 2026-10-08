import Carpool from '../models/carpool.mjs';
import Event from '../models/event.mjs';
import { badRequest, conflict, forbidden, notFound } from '../utils/AppError.mjs';
import { USER_FIELDS, loadEvent, requireEventMember, isOrganizer, canSeeEvent } from '../utils/access.mjs';
import { includesId, sameId } from '../utils/helpers.mjs';

const assertEnabled = (event) => {
  if (!event.covoiturage) throw badRequest("Le covoiturage n'est pas activé pour cet événement.");
};

const assertDeparture = (event, date) => {
  if (date && date > event.dateFin) throw badRequest("L'heure de départ doit précéder la fin de l'événement.");
};

const POPULATE = [{ path: 'conducteur', select: USER_FIELDS }, { path: 'passagers', select: USER_FIELDS }];

const loadCarpool = async (id, user) => {
  const carpool = await Carpool.findById(id);
  if (!carpool) throw notFound('Covoiturage');
  const event = await Event.findById(carpool.evenement);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Covoiturage');
  requireEventMember(event, user);
  assertEnabled(event);
  return { carpool, event };
};

export const createCarpool = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireEventMember(event, req.user);
  assertEnabled(event);
  assertDeparture(event, req.body.heureDepart);
  if (await Carpool.exists({ evenement: event._id, conducteur: req.user._id })) {
    throw conflict('Vous proposez déjà un trajet pour cet événement.');
  }
  const carpool = await Carpool.create({ ...req.body, evenement: event._id, conducteur: req.user._id });
  await carpool.populate(POPULATE);
  res.status(201).json(carpool);
};

export const listCarpools = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireEventMember(event, req.user);
  assertEnabled(event);
  const carpools = await Carpool.find({ evenement: event._id }).sort({ heureDepart: 1 }).populate(POPULATE);
  res.json(carpools);
};

export const getCarpool = async (req, res) => {
  const { carpool } = await loadCarpool(req.params.id, req.user);
  await carpool.populate(POPULATE);
  res.json(carpool);
};

export const updateCarpool = async (req, res) => {
  const { carpool, event } = await loadCarpool(req.params.id, req.user);
  if (!sameId(carpool.conducteur, req.user._id)) throw forbidden('Seul le conducteur peut modifier ce trajet.');
  assertDeparture(event, req.body.heureDepart);
  if (req.body.placesDisponibles !== undefined && req.body.placesDisponibles < carpool.passagers.length) {
    throw conflict(`${carpool.passagers.length} passager(s) déjà inscrit(s) : nombre de places insuffisant.`);
  }
  Object.assign(carpool, req.body);
  await carpool.save();
  await carpool.populate(POPULATE);
  res.json(carpool);
};

export const deleteCarpool = async (req, res) => {
  const { carpool, event } = await loadCarpool(req.params.id, req.user);
  if (!sameId(carpool.conducteur, req.user._id) && !isOrganizer(event, req.user)) {
    throw forbidden('Seul le conducteur ou un organisateur peut supprimer ce trajet.');
  }
  await carpool.deleteOne();
  res.status(204).end();
};

// Réserver une place (proposition : gestion des passagers)
export const bookSeat = async (req, res) => {
  const { carpool } = await loadCarpool(req.params.id, req.user);
  if (sameId(carpool.conducteur, req.user._id)) throw conflict('Vous êtes le conducteur de ce trajet.');
  if (includesId(carpool.passagers, req.user._id)) throw conflict('Vous avez déjà une place dans ce trajet.');
  const updated = await Carpool.findOneAndUpdate(
    // la place n°placesDisponibles n'existe pas encore => il reste au moins une place
    { _id: carpool._id, passagers: { $ne: req.user._id }, [`passagers.${carpool.placesDisponibles - 1}`]: { $exists: false } },
    { $push: { passagers: req.user._id } },
    { returnDocument: 'after' }
  );
  if (!updated) throw conflict('Plus aucune place disponible dans ce trajet.');
  await updated.populate(POPULATE);
  res.json(updated);
};

export const cancelSeat = async (req, res) => {
  const { carpool } = await loadCarpool(req.params.id, req.user);
  if (!includesId(carpool.passagers, req.user._id)) throw notFound('Réservation');
  carpool.passagers.pull(req.user._id);
  await carpool.save();
  res.status(204).end();
};
