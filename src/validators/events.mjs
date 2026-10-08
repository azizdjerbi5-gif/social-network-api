import Joi from 'joi';
import { pagination, url, text, objectId, userIds } from './common.mjs';

const fields = {
  nom: text(150).min(1),
  description: text(5000).allow(''),
  dateDebut: Joi.date().iso(),
  dateFin: Joi.date().iso(),
  lieu: text(300).min(1),
  photoCouverture: url().allow(''),
  estPrive: Joi.boolean(),
  billetterie: Joi.boolean(),
  shoppingList: Joi.boolean(),
  covoiturage: Joi.boolean()
};

export const createEvent = Joi.object({
  ...fields,
  nom: fields.nom.required(),
  dateDebut: fields.dateDebut.greater('now').required(),
  dateFin: fields.dateFin.min(Joi.ref('dateDebut')).required()
    .messages({ 'date.min': 'La date de fin doit être postérieure à la date de début' }),
  lieu: fields.lieu.required(),
  organisateurs: userIds().description('Co-organisateurs (le créateur est ajouté automatiquement)'),
  participants: userIds().description('Membres invités'),
  groupe: objectId().description("Groupe dans lequel créer l'événement"),
  inviterMembresGroupe: Joi.boolean().default(true).description('Inviter automatiquement tous les membres du groupe')
}).custom((v, helpers) => (v.estPrive && v.billetterie
  ? helpers.message('La billetterie est réservée aux événements publics') : v));

export const updateEvent = Joi.object(fields).min(1);

export const listEvents = Joi.object({
  ...pagination,
  q: text(100).min(1).description('Recherche dans le nom / lieu'),
  from: Joi.date().iso().description('Début après cette date'),
  to: Joi.date().iso().description('Début avant cette date'),
  groupe: objectId(),
  mine: Joi.boolean().description('Uniquement les événements dont je suis organisateur ou participant')
});

export const addParticipants = Joi.object({ userIds: userIds().min(1).required() });
export const addOrganizer = Joi.object({ userId: objectId().required() });
