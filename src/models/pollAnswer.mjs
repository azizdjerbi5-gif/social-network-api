import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Réponses d'un participant à un sondage : 1 option par question
const pollAnswerSchema = new mongoose.Schema({
  sondage: { type: ObjectId, ref: 'Poll', required: true },
  participant: { type: ObjectId, ref: 'User', required: true },
  reponses: [{
    _id: false,
    question: { type: ObjectId, required: true },
    option: { type: ObjectId, required: true }
  }]
}, { timestamps: true, versionKey: false });

// Un participant ne répond qu'une fois à un sondage (il peut modifier sa réponse)
pollAnswerSchema.index({ sondage: 1, participant: 1 }, { unique: true });

export default mongoose.model('PollAnswer', pollAnswerSchema);
