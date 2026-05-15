import pino from 'pino';
import { config } from '../../composition/config.js';
import type { Logger, LoggerContext } from '../../application/ports/Logger.js';

export class PinoLogger implements Logger {
  private readonly pinoInstance: pino.Logger;

  constructor(pinoInstance?: pino.Logger) {
    this.pinoInstance = pinoInstance ?? pino({
      name: 'clean-orders',
      level: config.LOG_LEVEL,
      transport: config.LOG_PRETTY
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    });
  }

  info(message: string, obj?: object): void {
    obj ? this.pinoInstance.info(obj, message) : this.pinoInstance.info(message);
  }

  warn(message: string, obj?: object): void {
    obj ? this.pinoInstance.warn(obj, message) : this.pinoInstance.warn(message);
  }

  error(message: string, obj?: object): void {
    obj ? this.pinoInstance.error(obj, message) : this.pinoInstance.error(message);
  }

  debug(message: string, obj?: object): void {
    obj ? this.pinoInstance.debug(obj, message) : this.pinoInstance.debug(message);
  }

  child(context: LoggerContext): Logger {
    return new PinoLogger(this.pinoInstance.child(context));
  }
}
