import fastify from "fastify"
import { ServerDependencies } from "../../application/ports/ServerDependencies.js";
import { OrdersController } from "./controllers/OrdersContollers.js"

export async function buildServer(dependencies: ServerDependencies) {
    const server = fastify({
        logger: true,
    })

    const ordersController = new OrdersController(
        dependencies.createOrderUseCase,
        dependencies.addItemToOrderUseCase,
    )

    await ordersController.registerRoutes(server)

    server.get('/health', async (req) => {
        req.log.info('Health check requested');
        return { status: 'ok', time: new Date().toISOString() }
    })

    return server
}