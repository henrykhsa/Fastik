import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Guard que valida x-api-key e injeta o Store correspondente no request.
 * Usado para autenticar requisições da loja (tenant) ao motor logístico.
 */
@Injectable()
export class StoreApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    const store = await this.prisma.store.findUnique({
      where: { apiKey },
    });

    if (!store) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!store.isActive) {
      throw new UnauthorizedException('Store is deactivated');
    }

    // Injeta o store no request para uso no controller/service
    request.store = store;

    return true;
  }
}
