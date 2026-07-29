import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              method: request.method,
              path: request.originalUrl,
              statusCode: response.statusCode,
              durationMs: Date.now() - startedAt,
              userAgent: request.headers['user-agent'],
            }),
          );
        },
        error: (error: Error & { status?: number }) => {
          this.logger.error(
            JSON.stringify({
              method: request.method,
              path: request.originalUrl,
              statusCode: error.status || 500,
              durationMs: Date.now() - startedAt,
              message: error.message,
            }),
          );
        },
      }),
    );
  }
}
