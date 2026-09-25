import {
  IsString,
  IsUrl,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryZoneDto {
  @ApiProperty({ description: 'Nome da zona (ex: "Área 1", "Centro")' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Taxa de entrega (R$)' })
  @IsNumber()
  @Min(0)
  fee: number;

  @ApiProperty({ description: 'Prazo estimado de entrega (minutos)' })
  @IsInt()
  @Min(1)
  estimatedTimeMinutes: number;

  @ApiProperty({ description: 'Raio máximo da zona em km a partir da loja' })
  @IsNumber()
  @Min(0.1)
  maxRadiusKm: number;
}

export class ProvisionTenantDto {
  @ApiProperty({ description: 'ID da loja no Laurus PMS' })
  @IsString()
  externalPmsId: string;

  @ApiProperty({ description: 'Nome da loja' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'URL para receber webhooks de atualização de status' })
  @IsUrl({ require_tld: false })
  webhookUrl: string;

  @ApiPropertyOptional({ description: 'Latitude da loja' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude da loja' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({
    description: 'Lista inicial de zonas de entrega',
    type: [DeliveryZoneDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryZoneDto)
  deliveryZones?: DeliveryZoneDto[];
}
