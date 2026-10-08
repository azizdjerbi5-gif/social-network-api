import Joi from 'joi';
import { text } from './common.mjs';

export const createTicketType = Joi.object({
  nom: text(100).min(1).required(),
  montant: Joi.number().min(0).precision(2).required(),
  quantite: Joi.number().integer().min(1).max(1000000).required()
});

export const updateTicketType = Joi.object({
  nom: text(100).min(1),
  montant: Joi.number().min(0).precision(2),
  quantite: Joi.number().integer().min(1).max(1000000)
}).min(1);

export const purchase = Joi.object({
  nom: text(50).min(1).required(),
  prenom: text(50).min(1).required(),
  email: Joi.string().trim().lowercase().email().required(),
  adresse: Joi.object({
    rue: text(200).min(1).required(),
    complement: text(200).allow(''),
    codePostal: Joi.string().trim().pattern(/^[A-Za-z0-9 -]{3,10}$/).required(),
    ville: text(100).min(1).required(),
    pays: text(100).min(1).required()
  }).required()
});
