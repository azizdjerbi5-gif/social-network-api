import Joi from 'joi';
import { pagination, url, text, objectId, userIds } from './common.mjs';

const fields = {
  nom: text(100).min(1),
  description: text(2000).allow(''),
  icone: url().allow(''),
  photoCouverture: url().allow(''),
  type: Joi.string().valid('public', 'prive', 'secret'),
  autoriserPublicationMembres: Joi.boolean(),
  autoriserCreationEvenementsMembres: Joi.boolean()
};

export const createGroup = Joi.object({
  ...fields,
  nom: fields.nom.required(),
  membres: userIds().description('Membres invités à la création'),
  administrateurs: userIds().description('Co-administrateurs (ajoutés aussi comme membres)')
});

export const updateGroup = Joi.object(fields).min(1);

export const listGroups = Joi.object({
  ...pagination,
  q: text(100).min(1),
  type: Joi.string().valid('public', 'prive', 'secret'),
  mine: Joi.boolean().description('Uniquement mes groupes')
});

export const addMembers = Joi.object({ userIds: userIds().min(1).required() });
export const addAdmin = Joi.object({ userId: objectId().required() });
