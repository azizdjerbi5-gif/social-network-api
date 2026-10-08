import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Collection dédiée aux messages (un fil peut en contenir des milliers)
const messageSchema = new mongoose.Schema({
  discussion: { type: ObjectId, ref: 'Discussion', required: true },
  auteur: { type: ObjectId, ref: 'User', required: true },
  contenu: { type: String, required: [true, 'Le message ne peut pas être vide'], trim: true, maxlength: 5000 },
  // null = message principal ; sinon = réponse au message parent
  parent: { type: ObjectId, ref: 'Message', default: null },
  modifie: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

messageSchema.index({ discussion: 1, parent: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
