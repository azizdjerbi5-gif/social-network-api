import Joi from 'joi';

export const objectId = () => Joi.string().hex().length(24).messages({ 'string.length': '{{#label}} doit être un identifiant valide (ObjectId)', 'string.hex': '{{#label}} doit être un identifiant valide (ObjectId)' });
export const url = () => Joi.string().uri({ scheme: ['http', 'https'] }).max(2000);
export const text = (max) => Joi.string().trim().max(max);
export const pagination = {
  page: Joi.number().integer().min(1).default(1).description('Numéro de page'),
  limit: Joi.number().integer().min(1).max(100).default(20).description('Éléments par page (max 100)')
};
export const paginationQuery = Joi.object(pagination);
export const userIds = () => Joi.array().items(objectId()).unique().max(500);
