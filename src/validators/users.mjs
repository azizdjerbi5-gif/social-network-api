import Joi from 'joi';
import { pagination, url, text } from './common.mjs';

const password = Joi.string().min(8).max(128)
  .pattern(/[A-Za-z]/, 'lettre').pattern(/\d/, 'chiffre')
  .messages({ 'string.pattern.name': 'Le mot de passe doit contenir au moins une {#name}' });

const profile = {
  nom: text(50).min(1),
  prenom: text(50).min(1),
  dateNaissance: Joi.date().iso().max('now'),
  avatar: url().allow(''),
  bio: text(500).allow(''),
  ville: text(100).allow('')
};

export const register = Joi.object({
  ...profile,
  nom: profile.nom.required(),
  prenom: profile.prenom.required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: password.required()
});

export const login = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required()
});

export const updateMe = Joi.object({
  ...profile,
  email: Joi.string().trim().lowercase().email(),
  password
}).min(1);

export const searchUsers = Joi.object({
  ...pagination,
  q: text(100).min(1).description('Recherche par nom, prénom ou email')
});
