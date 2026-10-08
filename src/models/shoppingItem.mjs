import mongoose from 'mongoose';
import { normalize } from '../utils/helpers.mjs';

const { ObjectId } = mongoose.Schema.Types;

// BONUS — Ce qu'un participant apporte à l'événement
const shoppingItemSchema = new mongoose.Schema({
  evenement: { type: ObjectId, ref: 'Event', required: true },
  utilisateur: { type: ObjectId, ref: 'User', required: true },
  nom: { type: String, required: true, trim: true, maxlength: 100 },
  nomNormalise: { type: String, select: false },
  quantite: { type: Number, required: true, min: 1 },
  heureArrivee: { type: Date, required: true }
}, { timestamps: true, versionKey: false });

shoppingItemSchema.pre('validate', function () {
  if (this.nom) this.nomNormalise = normalize(this.nom);
});

// Chaque chose apportée doit être unique par événement ("Chips" == "chips ")
shoppingItemSchema.index({ evenement: 1, nomNormalise: 1 }, { unique: true });

export default mongoose.model('ShoppingItem', shoppingItemSchema);
