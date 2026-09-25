import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClientAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complement?: string;
}

export enum OnItemUnavailable {
  CANCEL_ITEM = 'CANCEL_ITEM',
  CANCEL_ORDER = 'CANCEL_ORDER',
}

export class CreateOrderDto {
  @ApiProperty({ description: 'External order ID from the store platform' })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({ type: ClientAddressDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ClientAddressDto)
  clientAddress: ClientAddressDto;

  @ApiProperty({ description: 'Taxa de entrega em reais (R$), ex: 5.00 — mesma unidade do fee retornado por /delivery/quote' })
  @IsNumber()
  deliveryFee: number;

  @ApiPropertyOptional({ description: 'Items payload (free-form JSON)' })
  @IsOptional()
  itemsPayload?: any;

  @ApiPropertyOptional({
    enum: OnItemUnavailable,
    default: OnItemUnavailable.CANCEL_ORDER,
    description: 'What to do when an item is unavailable',
  })
  @IsOptional()
  @IsEnum(OnItemUnavailable)
  onItemUnavailable?: OnItemUnavailable = OnItemUnavailable.CANCEL_ORDER;
}
