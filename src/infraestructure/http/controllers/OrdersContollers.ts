import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppError } from '../../../application/errors.js';
import { CreateOrderDto } from '../../../application/dto/CreateOrderDto.js';
import { AddItemToOrderDto } from '../../../application/dto/AddItemToOrderDto.js';
import type { CreateOrderUseCase, AddItemToOrderUseCase } from '../../../application/ports/ServerDependencies.js';
import type { Logger } from '../../../application/ports/Logger.js';

interface CreateOrderRequest {
  orderId: string;
  customerId: string;
}

interface AddItemRequest {
  productId: string;
  quantity: number;
}

interface AddItemParams {
  orderId: string;
}

function serializeError(error: AppError): Record<string, unknown> {
  switch (error.kind) {
    case 'VALIDATION_ERROR': return { error: error.kind, field: error.field, message: error.message };
    case 'NOT_FOUND_ERROR':  return { error: error.kind, resource: error.resource, id: error.id };
    case 'CONFLICT_ERROR':   return { error: error.kind, message: error.message };
    case 'INFRA_ERROR':      return { error: error.kind, message: error.message };
  }
}

export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly addItemUseCase: AddItemToOrderUseCase,
    private readonly logger: Logger,
  ) {}

  async registerRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/orders', this.createOrderHandler.bind(this));
    fastify.post('/orders/:orderId/items', this.addItemHandler.bind(this));
  }

  private async createOrderHandler(
    request: FastifyRequest<{ Body: CreateOrderRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    const logger = this.logger.child({
      requestId: request.id,
      operation: 'CreateOrder',
      method: request.method,
      url: request.url,
    });
    logger.info('creating order', { body: request.body });

    const { orderId, customerId } = request.body;
    const result = await this.createOrderUseCase.execute({ orderId, customerId } as CreateOrderDto);

    if (result.isFailure) {
      logger.warn('CreateOrder failed', { error: result.error });
      reply.code(this.mapErrorToStatusCode(result.error)).send(serializeError(result.error));
      return;
    }

    logger.info('Order created', { orderId: result.value.orderId });
    reply.code(201).send(result.value);
  }

  private async addItemHandler(
    request: FastifyRequest<{ Body: AddItemRequest; Params: AddItemParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { orderId } = request.params;
    const { productId, quantity } = request.body;

    const logger = this.logger.child({
      requestId: request.id,
      operation: 'AddItemToOrder',
      method: request.method,
      url: request.url,
    });
    logger.info('AddItemToOrder requested', { orderId, productId, quantity });

    const result = await this.addItemUseCase.execute({ orderId, productId, quantity } as AddItemToOrderDto);

    if (result.isFailure) {
      logger.warn('AddItemToOrder failed', { error: result.error });
      reply.code(this.mapErrorToStatusCode(result.error)).send(serializeError(result.error));
      return;
    }

    logger.info('Item added to order', { orderId, productId });
    reply.code(204).send();
  }

  private mapErrorToStatusCode(error: AppError): number {
    switch (error.kind) {
      case 'NOT_FOUND_ERROR':  return 404;
      case 'VALIDATION_ERROR': return 400;
      case 'CONFLICT_ERROR':   return 409;
      case 'INFRA_ERROR':      return 500;
    }
  }
}
