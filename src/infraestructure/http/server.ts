import fastify from 'fastify';
import type { ServerDependencies } from '../../application/ports/ServerDependencies.js';
import { OrdersController } from './controllers/OrdersContollers.js';

export async function buildServer(dependencies: ServerDependencies) {
  const { logger } = dependencies;
  const server = fastify({ logger: false });

  const ordersController = new OrdersController(
    dependencies.createOrderUseCase,
    dependencies.addItemToOrderUseCase,
    logger,
  );

  await ordersController.registerRoutes(server);

  server.get('/health', async () => {
    logger.info('Health check requested');
    return { status: 'ok', time: new Date().toISOString() };
  });

  return server;
}
