import Joi from 'joi';
import { text, objectId } from './common.mjs';

export const createPoll = Joi.object({
  titre: text(200).min(1).required(),
  questions: Joi.array().min(1).max(50).required().items(Joi.object({
    intitule: text(300).min(1).required(),
    options: Joi.array().min(2).max(20).unique().required()
      .items(text(200).min(1))
      .description('Réponses possibles (au moins 2)')
  }))
});

export const answerPoll = Joi.object({
  reponses: Joi.array().min(1).required().unique('questionId').items(Joi.object({
    questionId: objectId().required(),
    optionId: objectId().required()
  }))
});
