export type Result<T, E> =
    | { success: true; data: T; isSuccess: true; isFailure: false; value: T }
    | { success: false; error: E; isSuccess: false; isFailure: true };

export const ok = <T>(value: T): Result<T, never> => ({
    success: true,
    data: value,
    isSuccess: true,
    isFailure: false,
    value
})

export const fail = <E>(error: E): Result<never, E> => ({
    success: false,
    error,
    isSuccess: false,
    isFailure: true
})

/**
 * Aplica una función al valor si el Result es exitoso
 */
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
    return result.isSuccess ? ok(fn(result.value)) : result as Result<U, E>;
};

/**
 * Encadena operaciones que devuelven Result
 */
export const flatMap = <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> => {
    return result.isSuccess ? fn(result.value) : result as Result<U, E>;
};

/**
 * Combina dos Results en uno solo
 */
export const combine = <T, U, E>(result1: Result<T, E>, result2: Result<U, E>): Result<[T, U], E> => {
    if (result1.isSuccess && result2.isSuccess) {
        return ok([result1.value, result2.value]);
    }
    if (result1.isFailure) {
        return result1 as Result<[T, U], E>;
    }
    return result2 as Result<[T, U], E>;
};

/**
 * Obtiene el valor o un valor por defecto
 */
export const getOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
    return result.isSuccess ? result.value : defaultValue;
};

/**
 * Pattern matching: ejecuta una función según el estado del Result
 */
export const match = <T, E, R>(
    result: Result<T, E>,
    onSuccess: (value: T) => R,
    onFailure: (error: E) => R
): R => {
    return result.isSuccess ? onSuccess(result.value) : onFailure(result.error);
};

