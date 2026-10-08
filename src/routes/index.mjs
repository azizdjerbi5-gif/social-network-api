import express from 'express';
import Joi from 'joi';
import routes from './definitions.mjs';
import { authenticate, optionalAuth } from '../middlewares/auth.mjs';
import { validate } from '../middlewares/validate.mjs';
import { objectId } from '../validators/common.mjs';

// Tous les paramètres de chemin (:id, :userId, ...) sont des ObjectId MongoDB
export const pathParams = (path) => [...path.matchAll(/:(\w+)/g)].map((m) => m[1]);
export const paramsSchema = (path) => {
  const names = pathParams(path);
  return names.length ? Joi.object(Object.fromEntries(names.map((n) => [n, objectId().required()]))) : null;
};

const router = express.Router();

for (const route of routes) {
  const middlewares = [];
  if (route.auth === true) middlewares.push(authenticate);
  if (route.auth === 'optional') middlewares.push(optionalAuth);
  middlewares.push(validate({ params: paramsSchema(route.path), query: route.query, body: route.body }));
  router[route.method](route.path, ...middlewares, route.handler);
}

export default router;
