import TicketType from '../models/ticketType.mjs';
import Ticket from '../models/ticket.mjs';
import Event from '../models/event.mjs';
import { badRequest, conflict, notFound } from '../utils/AppError.mjs';
import { loadEvent, requireOrganizer, canSeeEvent } from '../utils/access.mjs';
import { paginate, paginated } from '../utils/helpers.mjs';

// Billetterie : uniquement pour un événement public avec la billetterie activée
const assertTicketing = (event) => {
  if (event.estPrive) throw badRequest('La billetterie est réservée aux événements publics.');
  if (!event.billetterie) throw badRequest("La billetterie n'est pas activée pour cet événement.");
};

const loadType = async (id, user) => {
  const type = await TicketType.findById(id);
  if (!type) throw notFound('Type de billet');
  const event = await Event.findById(type.evenement);
  if (!event || !(await canSeeEvent(event, user))) throw notFound('Type de billet');
  return { type, event };
};

export const createTicketType = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  assertTicketing(event);
  if (await TicketType.exists({ evenement: event._id, nom: req.body.nom })) {
    throw conflict('Un type de billet porte déjà ce nom pour cet événement.');
  }
  const type = await TicketType.create({ ...req.body, evenement: event._id });
  res.status(201).json(type);
};

// Route publique : une personne extérieure consulte les billets disponibles
export const listTicketTypes = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  assertTicketing(event);
  const types = await TicketType.find({ evenement: event._id }).sort({ montant: 1 });
  res.json(types);
};

export const updateTicketType = async (req, res) => {
  const { type, event } = await loadType(req.params.id, req.user);
  requireOrganizer(event, req.user);
  if (req.body.quantite !== undefined && req.body.quantite < type.vendus) {
    throw conflict(`Quantité trop faible : ${type.vendus} billet(s) déjà vendu(s).`);
  }
  Object.assign(type, req.body);
  await type.save();
  res.json(type);
};

export const deleteTicketType = async (req, res) => {
  const { type, event } = await loadType(req.params.id, req.user);
  requireOrganizer(event, req.user);
  if (type.vendus > 0) throw conflict('Impossible de supprimer un type de billet déjà vendu.');
  await type.deleteOne();
  res.status(204).end();
};

// Achat d'un billet (sans compte) — 1 seul billet par personne et par événement
export const purchaseTicket = async (req, res) => {
  const { type, event } = await loadType(req.params.id, req.user);
  assertTicketing(event);
  if (event.dateFin < new Date()) throw badRequest('Cet événement est terminé.');

  const { email } = req.body;
  if (await Ticket.exists({ evenement: event._id, email })) {
    throw conflict('Achat refusé : une personne extérieure ne peut obtenir qu’un seul billet par événement.');
  }

  // Réservation atomique d'une place (évite la survente en cas d'achats simultanés)
  const reserved = await TicketType.findOneAndUpdate(
    { _id: type._id, vendus: { $lt: type.quantite } },
    { $inc: { vendus: 1 } },
    { returnDocument: 'after' }
  );
  if (!reserved) throw conflict('Ce type de billet est épuisé.');

  try {
    const ticket = await Ticket.create({
      ...req.body, typeBillet: type._id, evenement: event._id, montant: type.montant, dateAchat: new Date()
    });
    await ticket.populate([{ path: 'typeBillet', select: 'nom montant' }, { path: 'evenement', select: 'nom dateDebut lieu' }]);
    res.status(201).json(ticket);
  } catch (err) {
    await TicketType.updateOne({ _id: type._id }, { $inc: { vendus: -1 } }); // on libère la place
    if (err?.code === 11000) throw conflict('Achat refusé : une personne extérieure ne peut obtenir qu’un seul billet par événement.');
    throw err;
  }
};

export const listTickets = async (req, res) => {
  const event = await loadEvent(req.params.id, req.user);
  requireOrganizer(event, req.user);
  const page = paginate(req.query);
  const [data, total] = await Promise.all([
    Ticket.find({ evenement: event._id }).sort({ dateAchat: -1 }).skip(page.skip).limit(page.limit).populate('typeBillet', 'nom montant'),
    Ticket.countDocuments({ evenement: event._id })
  ]);
  res.json(paginated(data, total, page));
};
