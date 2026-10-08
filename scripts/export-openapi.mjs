// Exporte la documentation OpenAPI dans docs/openapi.json (importable dans Postman / Insomnia)
import { writeFileSync } from 'node:fs';
process.env.JWT_SECRET ??= 'export';
const { default: openapi } = await import('../src/docs/openapi.mjs');
writeFileSync(new URL('../docs/openapi.json', import.meta.url), JSON.stringify(openapi, null, 2));
console.log(`docs/openapi.json généré (${Object.keys(openapi.paths).length} chemins).`);
