import User from '../models/user.mjs';
import Group from '../models/group.mjs';
import Event from '../models/event.mjs';
import Carpool from '../models/carpool.mjs';
import { signToken } from '../middlewares/auth.mjs';
import AppError, { conflict, notFound } from '../utils/AppError.mjs';
import { escapeRegex, paginate, paginated } from '../utils/helpers.mjs';

const PUBLIC_PROFILE = 'nom prenom avatar bio ville createdAt';

export const register = async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw conflict('Cet email est déjà utilisé.');
  const user = await User.create(req.body);
  res.status(201).json({ token: signToken(user), user });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Identifiants invalides.');
  }
  res.json({ token: signToken(user), user });
};

export const getMe = async (req, res) => {
  res.json(req.user);
};

export const updateMe = async (req, res) => {
  const { email } = req.body;
  if (email && email !== req.user.email && (await User.exists({ email }))) {
    throw conflict('Cet email est déjà utilisé.');
  }
  const user = await User.findById(req.user._id).select('+password');
  Object.assign(user, req.body);
  await user.save();
  res.json(user);
};

export const deleteMe = async (req, res) => {
  const uid = req.user._id;
  // On empêche d'orpheliner un groupe / événement
  const soleAdmin = await Group.find({ administrateurs: [uid] }).select('nom');
  const soleOrganizer = await Event.find({ organisateurs: [uid] }).select('nom');
  if (soleAdmin.length || soleOrganizer.length) {
    throw conflict('Transférez vos rôles avant de supprimer votre compte : vous êtes le seul administrateur/organisateur de '
      + [...soleAdmin, ...soleOrganizer].map((d) => `« ${d.nom} »`).join(', ') + '.');
  }
  await Group.updateMany({ membres: uid }, { $pull: { membres: uid, administrateurs: uid } });
  await Event.updateMany({ $or: [{ participants: uid }, { organisateurs: uid }] }, { $pull: { participants: uid, organisateurs: uid } });
  await Carpool.updateMany({ passagers: uid }, { $pull: { passagers: uid } });
  await User.deleteOne({ _id: uid });
  res.status(204).end();
};

export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select(PUBLIC_PROFILE);
  if (!user) throw notFound('Utilisateur');
  res.json(user);
};

export const searchUsers = async (req, res) => {
  const page = paginate(req.query);
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ nom: rx }, { prenom: rx }, { email: rx }];
  }
  const [data, total] = await Promise.all([
    User.find(filter).select(PUBLIC_PROFILE).sort({ nom: 1, prenom: 1 }).skip(page.skip).limit(page.limit),
    User.countDocuments(filter)
  ]);
  res.json(paginated(data, total, page));
};
