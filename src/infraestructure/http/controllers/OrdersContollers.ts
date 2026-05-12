import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppError } from '../../../application/errors.js';
import { CreateOrderDto } from '../../../application/dto/CreateOrderDto.js';
import { AddItemToOrderDto } from '../../../application/dto/AddItemToOrderDto.js';
import type { CreateOrder } from '../../../application/use-cases/CreateOrder.js';
import type { AddItemToOrder } from '../../../application/use-cases/AddItemToOrder.js';

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
    private readonly createOrderUseCase: CreateOrder,
    private readonly addItemUseCase: AddItemToOrder,
  ) {}

  async registerRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/orders', this.createOrderHandler.bind(this));
    fastify.post('/orders/:orderId/items', this.addItemHandler.bind(this));
  }

  private async createOrderHandler(
    request: FastifyRequest<{ Body: CreateOrderRequest }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { orderId, customerId } = request.body;
    request.log.info({ orderId, customerId }, 'CreateOrder requested');

    const dto: CreateOrderDto = { orderId, customerId };
    const result = await this.createOrderUseCase.execute(dto);

    if (result.isFailure) {
      const statusCode = this.mapErrorToStatusCode(result.error);
      request.log.warn({ error: result.error }, 'CreateOrder failed');
      reply.code(statusCode).send(serializeError(result.error));
      return;
    }

    request.log.info({ orderId: result.value.orderId }, 'Order created');
    reply.code(201).send(result.value);
  }

  private async addItemHandler(
    request: FastifyRequest<{ Body: AddItemRequest; Params: AddItemParams }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { orderId } = request.params;
    const { productId, quantity } = request.body;
    request.log.info({ orderId, productId, quantity }, 'AddItemToOrder requested');

    const dto: AddItemToOrderDto = { orderId, productId, quantity };
    const result = await this.addItemUseCase.execute(dto);

    if (result.isFailure) {
      const statusCode = this.mapErrorToStatusCode(result.error);
      request.log.warn({ error: result.error }, 'AddItemToOrder failed');
      reply.code(statusCode).send(serializeError(result.error));
      return;
    }

    request.log.info({ orderId, productId }, 'Item added to order');
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
