#!/bin/sh
# Build de la API en Vercel (vercel.json limita buildCommand a 256 caracteres).
set -e
cd ../..
pnpm turbo run build --filter=@tienda/api^...
pnpm --filter @tienda/db migrate:deploy
if [ "$SEED_DEMO" = "true" ]; then pnpm --filter @tienda/db seed; fi
# Cuenta del panel para previews: solo si ambas variables existen.
if [ -n "$DEMO_ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  pnpm --filter @tienda/api admin:create "$DEMO_ADMIN_EMAIL"
fi
