import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const groupSchema = new mongoose.Schema({
  nom: { type: String, required: [true, 'Le nom du groupe est obligatoire'], trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  icone: { type: String, trim: true, default: '' },
  photoCouverture: { type: String, trim: true, default: '' },
  type: { type: String, enum: ['public', 'prive', 'secret'], default: 'public' },
  autoriserPublicationMembres: { type: Boolean, default: true },
  autoriserCreationEvenementsMembres: { type: Boolean, default: true },
  // Un groupe est géré par 1 ou plusieurs administrateurs (qui sont aussi membres)
  administrateurs: {
    type: [{ type: ObjectId, ref: 'User' }],
    validate: [(v) => v.length >= 1, 'Un groupe doit avoir au moins un administrateur']
  },
  // Un groupe possède 1 ou plusieurs membres
  membres: {
    type: [{ type: ObjectId, ref: 'User' }],
    validate: [(v) => v.length >= 1, 'Un groupe doit avoir au moins un membre']
  },
  createur: { type: ObjectId, ref: 'User', required: true }
}, { timestamps: true, versionKey: false });

groupSchema.index({ membres: 1 });
groupSchema.index({ type: 1 });

export default mongoose.model('Group', groupSchema);
