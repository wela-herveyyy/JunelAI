export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...meta);
    }
  }

  warn(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      console.error(`[WARN] ${message}`, ...meta);
    }
  }

  info(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      console.error(`[INFO] ${message}`, ...meta);
    }
  }

  debug(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...meta);
    }
  }
}

export function createLogger(): Logger {
  const level =
    process.env.DEBUG === "1" || process.env.DEBUG === "true"
      ? LogLevel.DEBUG
      : LogLevel.INFO;
  return new Logger(level);
}
