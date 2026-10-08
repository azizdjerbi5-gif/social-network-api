import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const optionSchema = new mongoose.Schema({
  texte: { type: String, required: true, trim: true, maxlength: 200 }
});

const questionSchema = new mongoose.Schema({
  intitule: { type: String, required: true, trim: true, maxlength: 300 },
  // Plusieurs réponses possibles, une seule pourra être choisie
  options: {
    type: [optionSchema],
    validate: [(v) => v.length >= 2, 'Une question doit proposer au moins 2 réponses']
  }
});

// Sondage créé par un organisateur ; 1 ou plusieurs questions
const pollSchema = new mongoose.Schema({
  evenement: { type: ObjectId, ref: 'Event', required: true },
  createur: { type: ObjectId, ref: 'User', required: true },
  titre: { type: String, required: true, trim: true, maxlength: 200 },
  questions: {
    type: [questionSchema],
    validate: [(v) => v.length >= 1, 'Un sondage doit comporter au moins une question']
  }
}, { timestamps: true, versionKey: false });

pollSchema.index({ evenement: 1 });

export default mongoose.model('Poll', pollSchema);
