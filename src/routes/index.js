// RUTAS - AGREGADOR DE RUTAS

import { Router } from 'express';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const router = Router();

const routeFiles = readdirSync(__dirname).filter(
  (file) => file.endsWith('.routes.js')
);

for (const file of routeFiles) {
  const routeName = file.replace('.routes.js', '');
  const routeModule = await import(`./${file}`);
  router.use(`/${routeName}`, routeModule.default);
  console.log(`Ruta cargada: /api/${routeName}`);
}

export default router;
