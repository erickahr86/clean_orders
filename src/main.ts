import { config } from './composition/config.js';
import { buildContainer } from './composition/container.js';
import { buildServer } from './infraestructure/http/server.js';

const HOST = '0.0.0.0';

const ENDPOINTS = [
  { method: 'GET',  path: `/health`,                description: 'Health check'      },
  { method: 'POST', path: `/orders`,                description: 'Create order'      },
  { method: 'POST', path: `/orders/:orderId/items`, description: 'Add item to order' },
];

async function main() {
  const { deps, dispose } = await buildContainer();
  const { logger } = deps;
  const server = await buildServer(deps);

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    await server.close();
    await dispose();
    logger.info('Server closed. Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await server.listen({ port: config.PORT, host: HOST });

  logger.info(`Server listening on port ${config.PORT} [${config.DATABASE_TYPE}]`);
  for (const e of ENDPOINTS) {
    logger.info(`  ${e.method.padEnd(4)} http://${HOST}:${config.PORT}${e.path}  —  ${e.description}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
