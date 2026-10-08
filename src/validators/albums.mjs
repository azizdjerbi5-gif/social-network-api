import Joi from 'joi';
import { url, text } from './common.mjs';

export const createAlbum = Joi.object({
  titre: text(150).min(1).required(),
  description: text(1000).allow('')
});
export const updateAlbum = Joi.object({
  titre: text(150).min(1),
  description: text(1000).allow('')
}).min(1);
export const addPhoto = Joi.object({
  url: url().required(),
  legende: text(500).allow('')
});
export const comment = Joi.object({ texte: text(2000).min(1).required() });
