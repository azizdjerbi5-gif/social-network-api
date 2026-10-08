import { badRequest } from '../utils/AppError.mjs';

const OPTIONS = { abortEarly: false, stripUnknown: true, convert: true };

// Valide req.params / req.query / req.body avec des schémas Joi
export const validate = (schemas = {}) => (req, res, next) => {
  for (const key of ['params', 'query', 'body']) {
    const schema = schemas[key];
    if (!schema) continue;
    const { value, error } = schema.validate(req[key] ?? {}, OPTIONS);
    if (error) {
      const details = error.details.map((d) => ({ champ: d.path.join('.'), message: d.message }));
      return next(badRequest('Données invalides.', details));
    }
    // Express 5 : req.query est un getter -> on le redéfinit
    Object.defineProperty(req, key, { value, writable: true, configurable: true, enumerable: true });
  }
  next();
};
