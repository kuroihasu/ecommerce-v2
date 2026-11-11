// Crea (o actualiza la contraseña de) un usuario del panel y lo deja como dueño
// de una tienda. La contraseña llega por variable de entorno para que no quede
// en el historial de la terminal:
//
//   ADMIN_PASSWORD='…' pnpm --filter @tienda/api admin:create correo@tienda.cl [slug-tienda]
//
// El seed no crea usuarios a propósito: corre en cada deploy contra la base real.
import 'dotenv/config';
import { PasswordHasher } from '@nestjs/authentication';
import { createPrismaClient } from '@tienda/db';

async function main() {
  const [email, storeSlug = 'demo'] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email || !email.includes('@')) throw new Error('Uso: admin:create <correo> [slug-tienda]');
  if (password.length < 10) throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres');

  const prisma = createPrismaClient();
  try {
    const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
    if (!store) throw new Error(`La tienda "${storeSlug}" no existe`);
    const passwordHash = await new PasswordHasher().hash(password);
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: { passwordHash },
      create: { email: email.toLowerCase(), passwordHash },
    });
    await prisma.storeMember.upsert({
      where: { storeId_userId: { storeId: store.id, userId: user.id } },
      update: { role: 'OWNER' },
      create: { storeId: store.id, userId: user.id, role: 'OWNER' },
    });
    // Perdiste el teléfono y los códigos de respaldo: RESET_2FA=1 apaga la verificación en
    // dos pasos de esta cuenta (no lo dejes puesto en Vercel: se aplicaría en cada deploy).
    if (process.env.RESET_2FA === '1') {
      await prisma.$transaction([prisma.userTotp.deleteMany({ where: { userId: user.id } }), prisma.userRecoveryCode.deleteMany({ where: { userId: user.id } })]);
      console.log('Verificación en dos pasos desactivada para esta cuenta.');
    }
    console.log(`Listo: ${user.email} es dueño de "${store.name}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
