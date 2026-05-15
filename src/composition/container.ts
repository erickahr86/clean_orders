import { config } from '@/composition/config.js';
import { DatabaseFactory } from '@/infraestructure/database/DatabaseFactory.js';
import { PgUnitOfWork } from '@/infraestructure/persistence/postgres/PgUnitOfWork.js';
import { InMemoryOrderRepository } from '@/infraestructure/persistence/in-memory/InMemoryOrderRepository.js';
import { MessagingFactory } from '@/infraestructure/messaging/MessagingFactory.js';
import { StaticPricingService } from '@/infraestructure/http/StaticPricingService.js';
import { PinoLogger } from '@/infraestructure/logging/PinoLogger.js';
import { CreateOrder } from '@/application/use-cases/CreateOrder.js';
import { AddItemToOrder } from '@/application/use-cases/AddItemToOrder.js';
import type { ServerDependencies } from '@/application/ports/ServerDependencies.js';

export interface Container {
  deps: ServerDependencies;
  dispose: () => Promise<void>;
}

export async function buildContainer(): Promise<Container> {
  const logger         = new PinoLogger();
  const pricingService = new StaticPricingService();

  if (config.DATABASE_TYPE === 'postgres') {
    const pool = DatabaseFactory.createPool();
    await DatabaseFactory.testConnection(pool);

    const uow = new PgUnitOfWork(pool);

    return {
      deps: {
        logger,
        createOrderUseCase: {
          execute: (dto) =>
            uow.run(({ orders, eventBus }) =>
              new CreateOrder(orders, eventBus).execute(dto),
            ),
        },
        addItemToOrderUseCase: {
          execute: (dto) =>
            uow.run(({ orders, eventBus }) =>
              new AddItemToOrder(orders, pricingService, eventBus).execute(dto),
            ),
        },
      },
      dispose: () => pool.end(),
    };
  }

  // In-memory mode (default / test)
  const orderRepository = new InMemoryOrderRepository();
  const eventBus        = MessagingFactory.noop();

  return {
    deps: {
      logger,
      createOrderUseCase:    new CreateOrder(orderRepository, eventBus),
      addItemToOrderUseCase: new AddItemToOrder(orderRepository, pricingService, eventBus),
    },
    dispose: async () => {},
  };
}
