import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class DispatchOrderDto {
  @ApiProperty({ description: 'PIN to validate dispatch handshake' })
  @IsString()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({ enum: ['store', 'courier'], description: 'Who is providing the PIN' })
  @IsEnum(['store', 'courier'])
  source: 'store' | 'courier';
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
