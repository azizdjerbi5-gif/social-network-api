import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Type de billet créé par un organisateur
const ticketTypeSchema = new mongoose.Schema({
  evenement: { type: ObjectId, ref: 'Event', required: true },
  nom: { type: String, required: true, trim: true, maxlength: 100 },
  montant: { type: Number, required: true, min: 0 },
  quantite: { type: Number, required: true, min: 1 }, // quantité limitée
  vendus: { type: Number, default: 0, min: 0 }
}, { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

ticketTypeSchema.virtual('restants').get(function () {
  return Math.max(0, this.quantite - this.vendus);
});

ticketTypeSchema.index({ evenement: 1, nom: 1 }, { unique: true });

export default mongoose.model('TicketType', ticketTypeSchema);
