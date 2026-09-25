import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard de Bootstrap Token — autentica o provisionamento de tenants S2S.
 *
 * O token é enviado no header `x-bootstrap-token` e comparado com o valor
 * configurado no servidor (env BOOTSTRAP_TOKEN). É uma credencial de serviço
 * FIXA e REUTILIZÁVEL: o Laurus provisiona/atualiza vários tenants ao longo
 * do tempo com o mesmo token (o provision é upsert por externalPmsId).
 *
 * NOTA: NÃO é single-use. Uma tentativa anterior de invalidar o token após o
 * primeiro uso (Set in-memory) causava 403 'already used' em toda ativação
 * subsequente e se comportava de forma não-determinística (o Set zerava a cada
 * restart do container). A segurança vem do segredo do token + rede privada.
 */
@Injectable()
export class BootstrapTokenGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-bootstrap-token'];

    if (!token) {
      throw new UnauthorizedException('Missing x-bootstrap-token header');
    }

    const validToken = this.configService.get<string>('app.bootstrapToken');

    if (!validToken) {
      throw new ForbiddenException('Bootstrap token not configured on server');
    }

    if (token !== validToken) {
      throw new UnauthorizedException('Invalid bootstrap token');
    }

    return true;
  }
}
