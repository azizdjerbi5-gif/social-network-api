import ShoppingItem from '../models/shoppingItem.mjs';
import Event from '../models/event.mjs';
import { badRequest, conflict, forbidden, notFound } from '../utils/AppError.mjs';
import { USER_FIELDS, loadEvent, requireEventMember, isOrganizer, canSeeEvent } from '../utils/access.mjs';
import { sameId } from '../utils/helpers.mjs';

const assertEnabled = (event) => {
  if (!event.shoppingList) throw badRequest("La shopping list n'est pas activée pour cet événement.");
};

const assertArrival = (event, date) => {
  if (date && date > event.dateFin) throw badRequest("L'heure d'arrivée doit précéder la fin de l'événement.");
};

const duplicate = (nom) => conflict(`« ${nom} » est déjà prévu par un autre participant : chaque élément doit être unique.`);

const loadItem = async (id, user) => {
  const item = await ShoppingItem.findById(id);
  if (!item) throw notFound('Élément');
  const event = await Event.findById(item.evenement);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Élément');
  requireEventMember(event, user);
  return { item, event };
};

export const createItem = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireEventMember(event, req.user);
  assertEnabled(event);
  assertArrival(event, req.body.heureArrivee);
  try {
    const item = await ShoppingItem.create({ ...req.body, evenement: event._id, utilisateur: req.user._id });
    await item.populate('utilisateur', USER_FIELDS);
    res.status(201).json(item);
  } catch (err) {
    if (err?.code === 11000) throw duplicate(req.body.nom);
    throw err;
  }
};

export const listItems = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireEventMember(event, req.user);
  assertEnabled(event);
  const items = await ShoppingItem.find({ evenement: event._id }).sort({ nom: 1 }).populate('utilisateur', USER_FIELDS);
  res.json(items);
};

export const updateItem = async (req, res) => {
  const { item, event } = await loadItem(req.params.id, req.user);
  if (!sameId(item.utilisateur, req.user._id) && !isOrganizer(event, req.user)) throw forbidden('Modification non autorisée.');
  assertArrival(event, req.body.heureArrivee);
  Object.assign(item, req.body);
  try {
    await item.save();
  } catch (err) {
    if (err?.code === 11000) throw duplicate(req.body.nom);
    throw err;
  }
  res.json(item);
};

export const deleteItem = async (req, res) => {
  const { item, event } = await loadItem(req.params.id, req.user);
  if (!sameId(item.utilisateur, req.user._id) && !isOrganizer(event, req.user)) throw forbidden('Suppression non autorisée.');
  await item.deleteOne();
  res.status(204).end();
};
