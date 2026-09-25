import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { StoreApiKeyGuard } from '@/modules/delivery/guards/store-api-key.guard';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import {
  DeliverOrderDto,
  DispatchOrderDto,
  FailDeliveryDto,
  ResolveChangeDto,
  ReturnDecisionDto,
} from '../dto/transition-order.dto';

@ApiTags('Orders')
@ApiHeader({ name: 'x-api-key', required: true, description: 'Store API key' })
@UseGuards(StoreApiKeyGuard)
@Controller('v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      dto.externalId = idempotencyKey;
    }
    return this.orderService.create(req.store.id, dto);
  }

  @Get()
  async findAll(@Req() req: any, @Query('status') status?: string) {
    return this.orderService.findAll(req.store.id, { status });
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.orderService.findOne(req.store.id, id);
  }

  @Patch(':id/accept')
  async accept(@Req() req: any, @Param('id') id: string) {
    return this.orderService.accept(req.store.id, id);
  }

  @Patch(':id/reject')
  async reject(@Req() req: any, @Param('id') id: string) {
    return this.orderService.reject(req.store.id, id);
  }

  @Patch(':id/ready')
  async ready(@Req() req: any, @Param('id') id: string) {
    return this.orderService.ready(req.store.id, id);
  }

  @Patch(':id/request-change')
  async requestChange(@Req() req: any, @Param('id') id: string) {
    return this.orderService.requestChange(req.store.id, id);
  }

  @Patch(':id/resolve-change')
  async resolveChange(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ResolveChangeDto,
  ) {
    return this.orderService.resolveChange(req.store.id, id, dto.accepted);
  }

  @Patch(':id/dispatch')
  async dispatch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DispatchOrderDto,
  ) {
    return this.orderService.dispatch(req.store.id, id, dto);
  }

  @Patch(':id/deliver')
  async deliver(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DeliverOrderDto,
  ) {
    return this.orderService.deliver(req.store.id, id, dto);
  }

  @Patch(':id/fail')
  async failDelivery(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: FailDeliveryDto,
  ) {
    return this.orderService.failDelivery(req.store.id, id, dto);
  }

  @Patch(':id/return-decision')
  async returnDecision(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReturnDecisionDto,
  ) {
    return this.orderService.returnDecision(req.store.id, id, dto);
  }

  @Patch(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.orderService.cancel(req.store.id, id);
  }
}
