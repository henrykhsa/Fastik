import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service';
import { ProvisionTenantDto } from '../dto/provision-tenant.dto';
import { BootstrapTokenGuard } from '../guards/bootstrap-token.guard';

@ApiTags('Tenants')
@Controller('v1/tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post('provision')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(BootstrapTokenGuard)
  @ApiOperation({
    summary: 'Provisionar loja (tenant) no motor logístico',
    description:
      'Cria ou atualiza uma loja, gera uma API Key segura e retorna para a Laurus salvar. ' +
      'Protegido por Bootstrap Token de uso único.',
  })
  @ApiHeader({
    name: 'x-bootstrap-token',
    description: 'Token de ativação de uso único para provisionamento',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Loja provisionada com sucesso',
    schema: {
      example: {
        storeId: 'uuid',
        apiKey: 'fstk_a1b2c3d4...',
        name: 'Pizzaria Bella',
        externalPmsId: 'laurus-store-001',
        isNewStore: true,
        deliveryZonesCount: 3,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Bootstrap token ausente ou inválido' })
  @ApiResponse({ status: 403, description: 'Bootstrap token já utilizado' })
  provision(@Body() dto: ProvisionTenantDto) {
    return this.tenantService.provision(dto);
  }
}
