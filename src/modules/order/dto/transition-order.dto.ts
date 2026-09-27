import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DeliveryMode } from './create-order.dto';

export class DispatchOrderDto {
  @ApiPropertyOptional({ description: 'PIN to validate dispatch handshake (required for PLATFORM/legacy)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pin?: string;

  @ApiPropertyOptional({ enum: ['store', 'courier'], description: 'Who is providing the PIN (required for PLATFORM/legacy)' })
  @IsOptional()
  @IsEnum(['store', 'courier'])
  source?: 'store' | 'courier';

  @ApiPropertyOptional({
    enum: DeliveryMode,
    description:
      'STORE = a loja entrega (dispensa courierPin). PLATFORM/ausente = handshake de PIN normal.',
  })
  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;
}

export class DeliverOrderDto {
  @ApiProperty({ description: 'Client PIN to confirm delivery' })
  @IsString()
  @IsNotEmpty()
  clientPin: string;
}

export enum FaultType {
  STORE_FAULT = 'STORE_FAULT',
  COURIER_FAULT = 'COURIER_FAULT',
  CLIENT_FAULT = 'CLIENT_FAULT',
}

export class FailDeliveryDto {
  @ApiProperty({ enum: FaultType, description: 'Who is at fault for the failed delivery' })
  @IsEnum(FaultType)
  faultType: FaultType;
}

export enum ReturnDecision {
  RETURN = 'RETURN',
  DISCARD = 'DISCARD',
}

export class ReturnDecisionDto {
  @ApiProperty({ enum: ReturnDecision, description: 'Decision on what to do with the package' })
  @IsEnum(ReturnDecision)
  decision: ReturnDecision;
}

export class ResolveChangeDto {
  @ApiProperty({ description: 'Whether the change was accepted by the client' })
  accepted: boolean;
}
