# Clean Orders

A Clean Architecture TypeScript implementation of an order management system with domain-driven design principles.

## Overview

This project demonstrates a scalable, maintainable order management API built with Clean Architecture. It separates concerns across domain, application, and infrastructure layers, making the codebase testable and loosely coupled.

**Core Features:**
- Create orders with unique IDs and customer associations
- Add items to existing orders with pricing validation
- Domain-driven error handling with rich error types
- In-memory persistence adapters (easily swappable for databases)
- Event publishing system (currently no-op, ready for event-driven features)
- Graceful HTTP server with structured logging

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Language:** TypeScript 5.x
- **HTTP Framework:** Fastify 5
- **Testing:** Vitest
- **Logger:** Pino

## Project Structure

```
src/
├── domain/                 # Pure business logic (no framework)
│   ├── entities/          # Order, OrderItem
│   ├── value-objects/     # Money, Currency, OrderId, CustomerId, etc.
│   └── events/            # Order domain events
│
├── application/           # Use cases & ports
│   ├── use-cases/         # CreateOrder, AddItemToOrder
│   ├── ports/             # Interfaces for repositories, services
│   ├── dto/               # Data transfer objects
│   └── errors.ts          # Application error types
│
├── infraestructure/       # Concrete implementations
│   ├── persistence/       # InMemoryOrderRepository
│   ├── http/              # Fastify server, controllers, services
│   └── messaging/         # Event bus implementations
│
└── shared/                # Cross-cutting Result type

tests/
├── domain/                # Unit tests for entities & value objects
├── acceptance/            # Integration tests with real adapters
└── (no actual IO)
```

## Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

## Installation

```bash
git clone <repository>
cd clean_orders
npm install
```

## Running the Server

```bash
npm start
```

Server listens on `http://localhost:3000` by default.

**Environment variables:**
```bash
PORT=3000              # Server port (default: 3000)
HOST=0.0.0.0          # Server host (default: 0.0.0.0)
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/orders` | Create a new order |
| `POST` | `/orders/:orderId/items` | Add an item to an order |

### Example Requests

**Create Order:**
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-001",
    "customerId": "customer-001"
  }'
```

**Add Item to Order:**
```bash
curl -X POST http://localhost:3000/orders/order-001/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "magic-mouse",
    "quantity": 2
  }'
```

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

Run tests with coverage:
```bash
npm test -- --coverage
```

### Test Suites

- **`tests/domain/Money.spec.ts`** — 11 unit tests for Money value object
- **`tests/domain/Order.spec.ts`** — 16 unit tests for Order entity lifecycle
- **`tests/acceptance/AddItemToOrder.spec.ts`** — 11 integration tests for the AddItemToOrder use case

## Architecture Principles

### Clean Architecture Layers

1. **Domain Layer** — Pure TypeScript, no framework dependencies
   - Entities (Order, OrderItem)
   - Value Objects (Money, Currency, OrderId, etc.)
   - Domain events
   - Business rules enforcement

2. **Application Layer** — Orchestrates domain logic
   - Use cases (CreateOrder, AddItemToOrder)
   - Ports (interfaces for external services)
   - DTOs for request/response
   - Error mapping & handling

3. **Infrastructure Layer** — Framework & external service adapters
   - Fastify HTTP server
   - In-memory repository adapter
   - Static pricing service (mock)
   - No-op event bus

### Error Handling

All errors are represented as discriminated unions with semantic types:

```typescript
type AppError = 
  | ValidationError      // Input validation failed
  | NotFoundError        // Resource not found
  | ConflictError        // Business rule violation
  | InfraError          // External service failure
```

Results use a `Result<T, E>` type that enforces explicit error handling:

```typescript
const result = await useCase.execute(dto);
if (result.isFailure) {
  // Handle error
  console.error(result.error);
} else {
  // Use result.value
}
```

## Development

### Useful npm Scripts

```bash
npm test              # Run all tests
npm test -- --watch  # Watch mode
npm start             # Start server
npm run build         # TypeScript compilation
```

### Code Style

- TypeScript strict mode enabled
- ESM modules throughout
- Path aliases: `@domain`, `@application`, `@shared`, `@infrastructure`
- Path aliases configured in `tsconfig.json` and `tsconfig.test.json`

## Future Enhancements

- [ ] Get order by ID endpoint
- [ ] Persist orders to a real database (PostgreSQL, MongoDB)
- [ ] Publish events to a message broker (RabbitMQ, Kafka)
- [ ] Add authentication & authorization
- [ ] Order status transitions (PENDING → CONFIRMED → SHIPPED)
- [ ] Payment processing integration
- [ ] Discount & tax calculations

## License

MIT
