const PREFIX = '[WebSecurityShield]';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

function shouldLogInfo() {
  // Try to use import.meta.env, fallback gracefully if not available
  try {
    // @ts-ignore
    return !import.meta.env.PROD;
  } catch {
    return true; // Default to true in non-vite envs
  }
}

class ConsoleLogger implements Logger {
  private contextPrefix = '';

  constructor(context?: string) {
    if (context) {
      this.contextPrefix = `[${context}] `;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (shouldLogInfo()) {
      console.debug(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (shouldLogInfo()) {
      console.info(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`${PREFIX} ${this.contextPrefix}${message}`, ...args);
  }
}

export const logger = new ConsoleLogger();

export function createLogger(context: string): Logger {
  return new ConsoleLogger(context);
}
