import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Un album photo est associé à 1 événement
const albumSchema = new mongoose.Schema({
  evenement: { type: ObjectId, ref: 'Event', required: [true, "L'album doit être rattaché à un événement"] },
  titre: { type: String, required: [true, "Le titre de l'album est obligatoire"], trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  createur: { type: ObjectId, ref: 'User', required: true }
}, { timestamps: true, versionKey: false });

albumSchema.index({ evenement: 1 });

export default mongoose.model('Album', albumSchema);
