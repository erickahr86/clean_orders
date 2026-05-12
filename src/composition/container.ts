import { InMemoryOrderRepository}  from "@/infraestructure/persistence/in-memory/InMemoryOrderRepository.js";
import { NoopEventBus } from "@/infraestructure/messaging/NoopEventBus.js";
import { ServerDependencies } from "@/application/ports/ServerDependencies.js";
import { CreateOrder } from "@/application/use-cases/CreateOrder.js";
import { AddItemToOrder } from "@/application/use-cases/AddItemToOrder.js";
import { StaticPricingService } from "@/infraestructure/http/StaticPricingService.js";

export interface Dependecies extends ServerDependencies {
    // Ports
    orderRepository: InMemoryOrderRepository
    pricingService: StaticPricingService
    eventBus: NoopEventBus
}

export function buildContainer(): Dependecies {
    // Infraestructure layer - Adapters
    const orderRepository = new InMemoryOrderRepository()
    const pricingService = new StaticPricingService()
    const eventBus = new NoopEventBus()

    // Application layer - Use Cases
    const createOrderUseCase = new CreateOrder(orderRepository, eventBus)
    const addItemToOrderUseCase = new AddItemToOrder(orderRepository, pricingService, eventBus)
    
    return {
        // Ports
        orderRepository,
        pricingService,
        eventBus,

        // Use Cases
        createOrderUseCase,
        addItemToOrderUseCase,
    }
}

