import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const adresseSchema = new mongoose.Schema({
  rue: { type: String, required: true, trim: true },
  complement: { type: String, trim: true, default: '' },
  codePostal: { type: String, required: true, trim: true },
  ville: { type: String, required: true, trim: true },
  pays: { type: String, required: true, trim: true }
}, { _id: false });

// Billet acheté (par une personne extérieure, sans compte)
const ticketSchema = new mongoose.Schema({
  typeBillet: { type: ObjectId, ref: 'TicketType', required: true },
  evenement: { type: ObjectId, ref: 'Event', required: true },
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  adresse: { type: adresseSchema, required: true },
  montant: { type: Number, required: true, min: 0 },
  dateAchat: { type: Date, default: Date.now }
}, { versionKey: false });

// Une personne extérieure ne peut obtenir qu'un seul billet par événement
ticketSchema.index({ evenement: 1, email: 1 }, { unique: true });

export default mongoose.model('Ticket', ticketSchema);
