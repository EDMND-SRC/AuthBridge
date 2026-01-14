/**
 * Structured logger with PII masking for audit compliance
 * DPA 2024: Never log Omang numbers, names, addresses, phone numbers, selfie URLs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  clientId?: string;
  sessionId?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

// PII patterns to mask
const PII_PATTERNS = [
  { pattern: /\b\d{9}\b/g, replacement: '***masked-omang***' }, // Omang numbers (9 digits)
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***masked-email***' },
  { pattern: /\b(?:\+267|00267|267)?\d{7,8}\b/g, replacement: '***masked-phone***' },
  { pattern: /https?:\/\/[^\s]+selfie[^\s]*/gi, replacement: '***masked-selfie-url***' },
  { pattern: /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif)[^\s]*/gi, replacement: '***masked-image-url***' },
];

function maskPII(value: unknown): unknown {
  if (typeof value === 'string') {
    let masked = value;
    for (const { pattern, replacement } of PII_PATTERNS) {
      masked = masked.replace(pattern, replacement);
    }
    return masked;
  }

  if (Array.isArray(value)) {
    return value.map(maskPII);
  }

  if (value && typeof value === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Always mask these fields regardless of content
      if (['omang', 'name', 'firstName', 'lastName', 'address', 'phone', 'email', 'selfieUrl'].includes(key.toLowerCase())) {
        masked[key] = `***masked-${key}***`;
      } else {
        masked[key] = maskPII(val);
      }
    }
    return masked;
  }

  return value;
}

function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify({
    ...entry,
    context: maskPII(entry.context),
  });
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const formatted = formatLogEntry(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  // Audit-specific logging for compliance
  audit(action: string, context: LogContext): void {
    this.info(`AUDIT: ${action}`, { ...context, action, auditEvent: true });
  }
}

export const logger = new Logger(process.env.LOG_LEVEL as LogLevel || 'info');
export { maskPII };
