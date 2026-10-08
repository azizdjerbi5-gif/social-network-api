import Joi from 'joi';
import { text } from './common.mjs';

export const message = Joi.object({ contenu: text(5000).min(1).required() });
