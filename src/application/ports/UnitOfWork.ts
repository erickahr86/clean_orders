import { Result } from "../../shared/Result.js";
import { AppError } from "../errors.js";
import { OrderRepository } from "./OrderRepository.js";

export interface UnitOfWork {
    run <T>(fn: (repos: Repositories) => Promise<Result<T, AppError>>): Promise<Result<T, AppError>>;
}

export interface Repositories {
    orders: OrderRepository;
}