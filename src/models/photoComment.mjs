import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Commentaire d'une photo par un participant de l'événement
const photoCommentSchema = new mongoose.Schema({
  photo: { type: ObjectId, ref: 'Photo', required: true },
  auteur: { type: ObjectId, ref: 'User', required: true },
  texte: { type: String, required: [true, 'Le commentaire ne peut pas être vide'], trim: true, maxlength: 2000 }
}, { timestamps: true, versionKey: false });

photoCommentSchema.index({ photo: 1, createdAt: 1 });

export default mongoose.model('PhotoComment', photoCommentSchema);
