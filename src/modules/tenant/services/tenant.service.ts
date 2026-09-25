import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ProvisionTenantDto } from '../dto/provision-tenant.dto';

export interface ProvisionResult {
  storeId: string;
  apiKey: string;
  name: string;
  externalPmsId: string;
  isNewStore: boolean;
  deliveryZonesCount: number;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Provisiona uma loja (tenant) no motor logístico.
   *
   * - Se a loja já existe (por externalPmsId): atualiza dados e gera nova apiKey.
   * - Se não existe: cria a loja com apiKey e zonas de entrega.
   *
   * Retorna a apiKey gerada para que a Laurus salve no banco dela.
   */
  async provision(dto: ProvisionTenantDto): Promise<ProvisionResult> {
    const apiKey = this.generateApiKey();
    const existingStore = await this.prisma.store.findUnique({
      where: { externalPmsId: dto.externalPmsId },
    });

    if (existingStore) {
      // Atualiza store existente e regenera apiKey
      const updated = await this.prisma.store.update({
        where: { id: existingStore.id },
        data: {
          name: dto.name,
          webhookUrl: dto.webhookUrl,
          lat: dto.lat,
          lng: dto.lng,
          apiKey,
          isActive: true,
        },
      });

      // Se novas zonas foram enviadas, substituir as antigas
      if (dto.deliveryZones && dto.deliveryZones.length > 0) {
        await this.prisma.deliveryZone.deleteMany({
          where: { storeId: updated.id },
        });

        await this.prisma.deliveryZone.createMany({
          data: dto.deliveryZones.map((zone) => ({
            storeId: updated.id,
            name: zone.name,
            fee: zone.fee,
            estimatedTimeMinutes: zone.estimatedTimeMinutes,
            maxRadiusKm: zone.maxRadiusKm,
          })),
        });
      }

      const zonesCount = await this.prisma.deliveryZone.count({
        where: { storeId: updated.id },
      });

      this.logger.log(
        `Tenant re-provisioned: ${updated.name} (${updated.externalPmsId})`,
      );

      return {
        storeId: updated.id,
        apiKey,
        name: updated.name,
        externalPmsId: updated.externalPmsId,
        isNewStore: false,
        deliveryZonesCount: zonesCount,
      };
    }

    // Criar nova store com zonas de entrega
    const store = await this.prisma.store.create({
      data: {
        externalPmsId: dto.externalPmsId,
        name: dto.name,
        webhookUrl: dto.webhookUrl,
        lat: dto.lat,
        lng: dto.lng,
        apiKey,
        deliveryZones: dto.deliveryZones
          ? {
              createMany: {
                data: dto.deliveryZones.map((zone) => ({
                  name: zone.name,
                  fee: zone.fee,
                  estimatedTimeMinutes: zone.estimatedTimeMinutes,
                  maxRadiusKm: zone.maxRadiusKm,
                })),
              },
            }
          : undefined,
      },
    });

    this.logger.log(
      `Tenant provisioned: ${store.name} (${store.externalPmsId}) with ${dto.deliveryZones?.length ?? 0} zones`,
    );

    return {
      storeId: store.id,
      apiKey,
      name: store.name,
      externalPmsId: store.externalPmsId,
      isNewStore: true,
      deliveryZonesCount: dto.deliveryZones?.length ?? 0,
    };
  }

  /**
   * Gera uma API Key criptograficamente segura.
   * Formato: fstk_<32 bytes hex> (64 chars hex + prefixo = 69 chars)
   */
  private generateApiKey(): string {
    const bytes = randomBytes(32);
    return `fstk_${bytes.toString('hex')}`;
  }
}
