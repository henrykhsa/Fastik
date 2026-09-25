import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { DeliveryService } from '../services/delivery.service';
import { DeliveryQuoteDto } from '../dto/delivery-quote.dto';
import { StoreApiKeyGuard } from '../guards/store-api-key.guard';
import { Request } from 'express';

@ApiTags('Delivery')
@Controller('v1/delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Post('quote')
  @UseGuards(StoreApiKeyGuard)
  @ApiOperation({
    summary: 'Cotação de frete por coordenadas',
    description:
      'Calcula a distância Haversine entre a loja e o cliente, ' +
      'varre as zonas de entrega e retorna fee + prazo da zona aplicável.',
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'API Key da loja (gerada no provisionamento)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Cotação calculada',
    schema: {
      oneOf: [
        {
          properties: {
            isDeliverable: { type: 'boolean', example: true },
            deliveryFee: { type: 'number', example: 7.5 },
            estimatedTimeMinutes: { type: 'number', example: 35 },
            zoneName: { type: 'string', example: 'Área 1' },
            distanceKm: { type: 'number', example: 2.34 },
          },
        },
        {
          properties: {
            isDeliverable: { type: 'boolean', example: false },
            distanceKm: { type: 'number', example: 12.5 },
            message: { type: 'string', example: 'Endereço fora da área de entrega' },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Loja sem coordenadas ou sem zonas' })
  @ApiResponse({ status: 401, description: 'API Key ausente ou inválida' })
  async quote(@Body() dto: DeliveryQuoteDto, @Req() req: Request) {
    const store = (req as any).store;
    return this.deliveryService.quote(store.id, store.lat, store.lng, dto);
  }
}
