import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoreService } from '../services/store.service';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('stores')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'Listar lojas ativas' })
  findAll() {
    return this.storeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar loja por ID' })
  findOne(@Param('id') id: string) {
    return this.storeService.findById(id);
  }
}
