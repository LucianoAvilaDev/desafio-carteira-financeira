import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    const userId = req.user?.sub ?? 'anon';

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `${req.method} ${req.url} user=${userId} ${Date.now() - start}ms`,
        );
      }),
    );
  }
}
