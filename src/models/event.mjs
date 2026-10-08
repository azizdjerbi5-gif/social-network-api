import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const eventSchema = new mongoose.Schema({
  nom: { type: String, required: [true, "Le nom de l'événement est obligatoire"], trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  dateDebut: { type: Date, required: [true, 'La date de début est obligatoire'] },
  dateFin: {
    type: Date,
    required: [true, 'La date de fin est obligatoire'],
    validate: {
      validator(v) { return !this.dateDebut || v >= this.dateDebut; },
      message: 'La date de fin doit être postérieure à la date de début'
    }
  },
  lieu: { type: String, required: [true, 'Le lieu est obligatoire'], trim: true, maxlength: 300 },
  photoCouverture: { type: String, trim: true, default: '' },
  estPrive: { type: Boolean, default: false },
  // Un événement est géré par 1 ou plusieurs organisateurs
  organisateurs: {
    type: [{ type: ObjectId, ref: 'User' }],
    validate: [(v) => v.length >= 1, 'Un événement doit avoir au moins un organisateur']
  },
  // Un événement peut avoir une multitude de participants (membres)
  participants: [{ type: ObjectId, ref: 'User' }],
  groupe: { type: ObjectId, ref: 'Group', default: null },
  createur: { type: ObjectId, ref: 'User', required: true },
  // Fonctionnalités activables
  billetterie: { type: Boolean, default: false },
  shoppingList: { type: Boolean, default: false },
  covoiturage: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

// Règle : la billetterie n'existe que pour les événements publics
eventSchema.pre('validate', function () {
  if (this.estPrive && this.billetterie) {
    this.invalidate('billetterie', 'La billetterie est réservée aux événements publics');
  }
});

eventSchema.index({ dateDebut: 1 });
eventSchema.index({ organisateurs: 1 });
eventSchema.index({ participants: 1 });
eventSchema.index({ groupe: 1 });

export default mongoose.model('Event', eventSchema);
