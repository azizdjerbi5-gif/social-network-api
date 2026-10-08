// Documentation OpenAPI 3 générée à partir des définitions de routes et des schémas Joi
import j2s from 'joi-to-swagger';
import routes, { tags } from '../routes/definitions.mjs';
import { paramsSchema } from '../routes/index.mjs';

const toSchema = (joi) => j2s(joi).swagger;

const parametersFrom = (joi, location) => {
  if (!joi) return [];
  const schema = toSchema(joi);
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, s]) => ({
    name, in: location, required: location === 'path' || required.has(name),
    ...(s.description && { description: s.description }), schema: s
  }));
};

const STATUS = {
  200: 'Succès', 201: 'Ressource créée', 204: 'Succès (pas de contenu)'
};
const ERRORS = {
  400: 'Données invalides', 401: 'Non authentifié', 403: 'Action non autorisée', 404: 'Ressource introuvable', 409: 'Conflit (doublon, règle métier)'
};
const errorRef = { content: { 'application/json': { schema: { $ref: '#/components/schemas/Erreur' } } } };

const paths = {};
for (const route of routes) {
  const oasPath = '/api' + route.path.replace(/:(\w+)/g, '{$1}');
  const responses = { [route.status]: { description: STATUS[route.status] } };
  for (const [code, description] of Object.entries(ERRORS)) {
    if (code === '401' && route.auth !== true) continue;
    responses[code] = { description, ...errorRef };
  }
  paths[oasPath] ??= {};
  paths[oasPath][route.method] = {
    tags: [route.tag],
    summary: route.summary,
    ...(route.description && { description: route.description }),
    security: route.auth === true ? [{ bearerAuth: [] }] : route.auth === 'optional' ? [{}, { bearerAuth: [] }] : [],
    parameters: [...parametersFrom(paramsSchema(route.path), 'path'), ...parametersFrom(route.query, 'query')],
    ...(route.body && { requestBody: { required: true, content: { 'application/json': { schema: toSchema(route.body) } } } }),
    responses
  };
}

export default {
  openapi: '3.0.3',
  info: {
    title: 'My Social Networks API',
    version: '1.0.0',
    description: [
      'API REST du nouveau service My Social Networks : utilisateurs, groupes, événements, fils de discussion, albums photo, sondages, billetterie, shopping list et covoiturage.',
      '',
      '**Authentification** : `POST /api/auth/login` renvoie un JWT à envoyer dans l’en-tête `Authorization: Bearer <token>` (bouton *Authorize*).',
      '',
      '**Pagination** : les listes paginées acceptent `?page=1&limit=20` et renvoient `{ data, pagination: { page, limit, total, pages } }`.',
      '',
      '**Erreurs** : `{ message, details? }` avec un code HTTP explicite (400, 401, 403, 404, 409).'
    ].join('\n')
  },
  servers: [{ url: '/', description: 'Serveur courant' }],
  tags: tags.map((name) => ({ name })),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Erreur: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { champ: { type: 'string' }, message: { type: 'string' } } } }
        }
      }
    }
  },
  paths
};
