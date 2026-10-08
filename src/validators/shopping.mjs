import Joi from 'joi';
import { text } from './common.mjs';

export const createItem = Joi.object({
  nom: text(100).min(1).required(),
  quantite: Joi.number().integer().min(1).max(10000).required(),
  heureArrivee: Joi.date().iso().required()
});
export const updateItem = Joi.object({
  nom: text(100).min(1),
  quantite: Joi.number().integer().min(1).max(10000),
  heureArrivee: Joi.date().iso()
}).min(1);
