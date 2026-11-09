// TEMPORAL: verificación de fotos de muestra durante la etapa de diseño. Se borra antes del merge.
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 60);
  const out: Record<string, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(`https://images.unsplash.com/${id}?w=96&h=96&fit=crop&q=40&fm=jpg`);
      out[id] = r.ok ? `${(await r.arrayBuffer()).byteLength}` : `ERR ${r.status}`;
    }),
  );
  return Response.json(out);
}
