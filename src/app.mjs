import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import router from './routes/index.mjs';
import openapi from './docs/openapi.mjs';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.mjs';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Documentation (helmet désactivé sur /docs pour laisser Swagger UI charger ses scripts)
app.get('/docs.json', (req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'My Social Networks API' }));

app.use(helmet());
app.get('/', (req, res) => res.json({ name: 'My Social Networks API', docs: '/docs' }));
app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
