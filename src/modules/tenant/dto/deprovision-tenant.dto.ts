import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeprovisionTenantDto {
  @ApiProperty({ description: 'ID da loja no Laurus PMS' })
  @IsString()
  @IsNotEmpty()
  externalPmsId: string;
}
