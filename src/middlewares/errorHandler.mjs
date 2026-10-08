import mongoose from 'mongoose';
import AppError from '../utils/AppError.mjs';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} introuvable.` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, ...(err.details && { details: err.details }) });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ champ: e.path, message: e.message }));
    return res.status(400).json({ message: 'Données invalides.', details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Valeur invalide pour « ${err.path} ».` });
  }
  if (err?.code === 11000) {
    const champs = Object.keys(err.keyPattern || err.keyValue || {}).join(', ');
    return res.status(409).json({ message: `Doublon : cette valeur existe déjà (${champs}).` });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON invalide dans le corps de la requête.' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Erreur interne du serveur.' });
};
