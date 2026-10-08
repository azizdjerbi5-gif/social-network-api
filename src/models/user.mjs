import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  nom: { type: String, required: [true, 'Le nom est obligatoire'], trim: true, maxlength: 50 },
  prenom: { type: String, required: [true, 'Le prénom est obligatoire'], trim: true, maxlength: 50 },
  email: {
    type: String,
    required: [true, "L'email est obligatoire"],
    unique: true, // Cahier des charges : pas deux utilisateurs avec le même email
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Format email invalide']
  },
  password: { type: String, required: [true, 'Le mot de passe est obligatoire'], minlength: 8, select: false },
  dateNaissance: { type: Date },
  avatar: { type: String, trim: true, default: '' },
  bio: { type: String, trim: true, maxlength: 500, default: '' },
  ville: { type: String, trim: true, maxlength: 100, default: '' }
}, { timestamps: true, versionKey: false });

// Hachage automatique du mot de passe (Mongoose 9 : hooks sans `next`)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; return ret; }
});

export default mongoose.model('User', userSchema);
