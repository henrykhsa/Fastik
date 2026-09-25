import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.store.findMany({ where: { isActive: true } });
  }

  async findById(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException(`Store ${id} not found`);
    return store;
  }

  async findByExternalPmsId(externalPmsId: string) {
    return this.prisma.store.findUnique({ where: { externalPmsId } });
  }
}
