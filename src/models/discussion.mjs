import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// Un fil de discussion est lié à 1 groupe OU 1 événement (jamais les deux)
const discussionSchema = new mongoose.Schema({
  groupe: { type: ObjectId, ref: 'Group', default: null },
  evenement: { type: ObjectId, ref: 'Event', default: null }
}, { timestamps: true, versionKey: false });

discussionSchema.pre('validate', function () {
  const hasGroup = Boolean(this.groupe);
  const hasEvent = Boolean(this.evenement);
  if (hasGroup === hasEvent) {
    this.invalidate('groupe', 'Un fil de discussion doit être rattaché soit à un groupe, soit à un événement (exclusif)');
  }
});

// Un seul fil par groupe et par événement
discussionSchema.index({ groupe: 1 }, { unique: true, partialFilterExpression: { groupe: { $type: 'objectId' } } });
discussionSchema.index({ evenement: 1 }, { unique: true, partialFilterExpression: { evenement: { $type: 'objectId' } } });

export default mongoose.model('Discussion', discussionSchema);
