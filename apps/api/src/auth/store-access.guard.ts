import { createParamDecorator, ForbiddenException, Injectable, NotFoundException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { StoreRole } from '@tienda/db';
import type { AuthUser } from './auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type StoreAccess = { id: string; slug: string; role: StoreRole };
type WithStore = { params: Record<string, string>; user?: AuthUser | null; storeAccess?: StoreAccess };

// Para rutas /admin/stores/:store/...: el usuario (ya autenticado por el guard
// global) tiene que ser miembro de esa tienda. Todas las consultas del panel
// filtran después por `storeAccess.id`, así nadie toca datos de otra tienda.
@Injectable()
export class StoreAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<WithStore>();
    // En los guards el AuthenticationContext todavía está vacío: el usuario se lee de la petición.
    const user = req.user;
    if (!user) throw new ForbiddenException();
    const member = await this.prisma.client.storeMember.findFirst({
      where: { userId: user.id, store: { slug: req.params.store } },
      select: { role: true, store: { select: { id: true, slug: true } } },
    });
    // Misma respuesta para "no existe" y "no es tuya": no se revela qué tiendas hay.
    if (!member) throw new NotFoundException('Tienda no encontrada');
    req.storeAccess = { id: member.store.id, slug: member.store.slug, role: member.role };
    return true;
  }
}

export const CurrentStore = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<WithStore>().storeAccess!,
);
