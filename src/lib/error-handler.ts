export interface AppError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

export class ErrorHandler {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static get isDev(): boolean {
    return this.isDevelopment;
  }

  static createError(message: string, code?: string, details?: any): AppError {
    return {
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }

  static handleError(error: unknown, context?: string): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      appError = this.createError(
        error.message,
        'UNKNOWN_ERROR',
        { stack: error.stack, context }
      );
    } else if (typeof error === 'string') {
      appError = this.createError(error, 'STRING_ERROR', { context });
    } else {
      appError = this.createError(
        'An unknown error occurred',
        'UNKNOWN_ERROR',
        { error, context }
      );
    }

    // Log error in development
    if (this.isDevelopment) {
      console.error('Error occurred:', appError);
    }

    return appError;
  }

  static async handleAsyncError<T>(
    promise: Promise<T>,
    context?: string
  ): Promise<{ data: T | null; error: AppError | null }> {
    try {
      const data = await promise;
      return { data, error: null };
    } catch (error) {
      const appError = this.handleError(error, context);
      return { data: null, error: appError };
    }
  }

  static isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('fetch') || 
             error.message.includes('network') ||
             error.message.includes('Failed to fetch');
    }
    return false;
  }

  static isValidationError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('validation') ||
             error.message.includes('invalid') ||
             error.message.includes('required');
    }
    return false;
  }

  static getErrorMessage(error: AppError): string {
    if (this.isDevelopment) {
      return `${error.message} (${error.code})`;
    }
    return error.message;
  }
}

// API Error Response Helper
export const createApiErrorResponse = (error: AppError, status: number = 500) => {
  return {
    success: false,
    error: ErrorHandler.getErrorMessage(error),
    code: error.code,
    timestamp: error.timestamp,
    ...(ErrorHandler.isDev && { details: error.details })
  };
};

// Validation Error Helper
export const createValidationError = (field: string, message: string): AppError => {
  return ErrorHandler.createError(
    `Validation error for ${field}: ${message}`,
    'VALIDATION_ERROR',
    { field, message }
  );
}; 