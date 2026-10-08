import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Photo postée par 1 participant de l'événement
const photoSchema = new mongoose.Schema({
  album: { type: ObjectId, ref: 'Album', required: true },
  evenement: { type: ObjectId, ref: 'Event', required: true },
  auteur: { type: ObjectId, ref: 'User', required: true },
  url: { type: String, required: [true, "L'URL de la photo est obligatoire"], trim: true },
  legende: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true, versionKey: false });

photoSchema.index({ album: 1, createdAt: -1 });

export default mongoose.model('Photo', photoSchema);
