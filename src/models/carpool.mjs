import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// BONUS — Proposition de covoiturage pour un événement
const carpoolSchema = new mongoose.Schema({
  evenement: { type: ObjectId, ref: 'Event', required: true },
  conducteur: { type: ObjectId, ref: 'User', required: true },
  lieuDepart: { type: String, required: true, trim: true, maxlength: 300 },
  heureDepart: { type: Date, required: true },
  prix: { type: Number, required: true, min: 0 },
  placesDisponibles: { type: Number, required: true, min: 1, max: 8 },
  // Temps maximum d'écart en minutes (ex : 30 sur un trajet de 2h30 => 3h max)
  ecartMaxMinutes: { type: Number, required: true, min: 0, max: 600 },
  passagers: [{ type: ObjectId, ref: 'User' }]
}, { timestamps: true, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

carpoolSchema.virtual('placesRestantes').get(function () {
  return Math.max(0, this.placesDisponibles - (this.passagers?.length ?? 0));
});

carpoolSchema.index({ evenement: 1, heureDepart: 1 });
// Un conducteur ne propose qu'un trajet par événement
carpoolSchema.index({ evenement: 1, conducteur: 1 }, { unique: true });

export default mongoose.model('Carpool', carpoolSchema);
