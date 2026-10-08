import jwt from 'jsonwebtoken';
import config from '../config/index.mjs';
import User from '../models/user.mjs';
import AppError from '../utils/AppError.mjs';

const readToken = (req) => {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
};

const resolveUser = async (token) => {
  const decoded = jwt.verify(token, config.jwtSecret);
  const user = await User.findById(decoded.userId);
  if (!user) throw new Error('Utilisateur supprimé');
  return user;
};

// Route protégée : token obligatoire
export const authenticate = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return next(new AppError(401, 'Accès non autorisé : token manquant.'));
  try {
    req.user = await resolveUser(token);
    next();
  } catch {
    next(new AppError(401, 'Token invalide ou expiré.'));
  }
};

// Route publique qui s'enrichit si l'utilisateur est connecté
export const optionalAuth = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    req.user = await resolveUser(token);
  } catch { /* on ignore un token invalide sur une route publique */ }
  next();
};

export const signToken = (user) =>
  jwt.sign({ userId: user._id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
