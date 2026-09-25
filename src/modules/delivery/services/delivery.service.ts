import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { haversineDistanceKm } from '@/common/utils/haversine';
import { DeliveryQuoteDto } from '../dto/delivery-quote.dto';

export interface DeliveryQuoteResult {
  isDeliverable: boolean;
  deliveryFee?: number;
  estimatedTimeMinutes?: number;
  zoneName?: string;
  distanceKm?: number;
  message?: string;
}

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cotação de frete: calcula distância Haversine entre a loja e o cliente,
   * varre as DeliveryZones e retorna a primeira zona que cobre o raio.
   *
   * As zonas são ordenadas por maxRadiusKm crescente para retornar
   * a zona mais específica (menor raio que ainda cobre o cliente).
   */
  async quote(
    storeId: string,
    storeLat: number | null,
    storeLng: number | null,
    dto: DeliveryQuoteDto,
  ): Promise<DeliveryQuoteResult> {
    // Validar que a loja tem coordenadas cadastradas
    if (storeLat === null || storeLng === null) {
      throw new BadRequestException(
        'Store does not have coordinates configured. Update lat/lng via provisioning.',
      );
    }

    // Calcular distância Haversine (km)
    const distanceKm = haversineDistanceKm(
      storeLat,
      storeLng,
      dto.clientLatitude,
      dto.clientLongitude,
    );

    // Buscar zonas de entrega da loja, ordenadas por raio crescente
    const zones = await this.prisma.deliveryZone.findMany({
      where: { storeId },
      orderBy: { maxRadiusKm: 'asc' },
    });

    if (zones.length === 0) {
      throw new BadRequestException(
        'Store has no delivery zones configured.',
      );
    }

    // Encontrar a primeira zona que cobre a distância do cliente
    const matchingZone = zones.find((zone) => distanceKm <= zone.maxRadiusKm);

    if (!matchingZone) {
      return {
        isDeliverable: false,
        distanceKm: Math.round(distanceKm * 100) / 100,
        message: 'Endereço fora da área de entrega',
      };
    }

    return {
      isDeliverable: true,
      deliveryFee: matchingZone.fee,
      estimatedTimeMinutes: matchingZone.estimatedTimeMinutes,
      zoneName: matchingZone.name,
      distanceKm: Math.round(distanceKm * 100) / 100,
    };
  }
}
