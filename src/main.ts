import { InMemoryOrderRepository } from './infraestructure/persistence/in-memory/InMemoryOrderRepository.js';
import { StaticPricingService } from './infraestructure/http/StaticPricingService.js';
import { NoopEventBus } from './infraestructure/messaging/NoopEventBus.js';
import { CreateOrder } from './application/use-cases/CreateOrder.js';
import { AddItemToOrder } from './application/use-cases/AddItemToOrder.js';
import { buildServer } from './infraestructure/http/server.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const ENDPOINTS = [
  { method: 'GET',  path: `http://${HOST}:${PORT}/health`                  , description: 'Health check'        },
  { method: 'POST', path: `http://${HOST}:${PORT}/orders`                  , description: 'Create order'        },
  { method: 'POST', path: `http://${HOST}:${PORT}/orders/:orderId/items`   , description: 'Add item to order'   },
];

async function main() {
  const repository     = new InMemoryOrderRepository();
  const pricingService = new StaticPricingService();
  const eventBus       = new NoopEventBus();

  const container = {
    createOrderUseCase:    new CreateOrder(repository, eventBus),
    addItemToOrderUseCase: new AddItemToOrder(repository, pricingService, eventBus),
  };

  const server = await buildServer(container);

  await server.listen({ port: PORT, host: HOST });

  server.log.info(`Server listening on port ${PORT}`);
  server.log.info('Available endpoints:');
  for (const e of ENDPOINTS) {
    server.log.info(`  ${e.method.padEnd(4)} ${e.path}  —  ${e.description}`);
  }
  server.log.info('Press Ctrl+C to stop gracefully');

  const shutdown = async (signal: string) => {
    server.log.info(`${signal} received — shutting down gracefully`);
    await server.close();
    server.log.info('Server closed. Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
