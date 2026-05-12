export type ValidationError = {
  readonly kind: 'VALIDATION_ERROR';
  readonly field: string;
  readonly message: string;
};

export type NotFoundError = {
  readonly kind: 'NOT_FOUND_ERROR';
  readonly resource: string;
  readonly id: string;
};

export type ConflictError = {
  readonly kind: 'CONFLICT_ERROR';
  readonly message: string;
};

export type InfraError = {
  readonly kind: 'INFRA_ERROR';
  readonly message: string;
  readonly cause: unknown;
};

export type AppError = ValidationError | NotFoundError | ConflictError | InfraError;

export const validationError = (field: string, message: string): ValidationError =>
  ({ kind: 'VALIDATION_ERROR', field, message });

export const notFoundError = (resource: string, id: string): NotFoundError =>
  ({ kind: 'NOT_FOUND_ERROR', resource, id });

export const conflictError = (message: string): ConflictError =>
  ({ kind: 'CONFLICT_ERROR', message });

export const infraError = (cause: unknown, message?: string): InfraError =>
  ({ kind: 'INFRA_ERROR', cause, message: message ?? String(cause) });
