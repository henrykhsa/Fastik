import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeliveryQuoteDto {
  @ApiProperty({ description: 'Latitude do cliente', example: -23.5580 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  clientLatitude: number;

  @ApiProperty({ description: 'Longitude do cliente', example: -46.6620 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  clientLongitude: number;
}
