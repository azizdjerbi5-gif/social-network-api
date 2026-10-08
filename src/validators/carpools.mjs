import Joi from 'joi';
import { text } from './common.mjs';

const fields = {
  lieuDepart: text(300).min(1),
  heureDepart: Joi.date().iso(),
  prix: Joi.number().min(0).precision(2),
  placesDisponibles: Joi.number().integer().min(1).max(8),
  ecartMaxMinutes: Joi.number().integer().min(0).max(600).description("Temps maximum d'écart en minutes")
};

export const createCarpool = Joi.object({
  lieuDepart: fields.lieuDepart.required(),
  heureDepart: fields.heureDepart.required(),
  prix: fields.prix.required(),
  placesDisponibles: fields.placesDisponibles.required(),
  ecartMaxMinutes: fields.ecartMaxMinutes.required()
});
export const updateCarpool = Joi.object(fields).min(1);
