import { Module } from '@nestjs/common';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './services/tenant.service';
import { BootstrapTokenGuard } from './guards/bootstrap-token.guard';

@Module({
  controllers: [TenantController],
  providers: [TenantService, BootstrapTokenGuard],
  exports: [TenantService],
})
export class TenantModule {}
