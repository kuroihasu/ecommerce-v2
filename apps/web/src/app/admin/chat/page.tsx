import { adminApi } from "@/lib/admin/api";
import type { AdminStore } from "@/lib/admin/types";
import { demoCatalog } from "@/designs/catalog";
import { defaultChat } from "@/designs/chat";
import { AdminShell } from "../AdminShell";
import { ChatForm } from "./ChatForm";

export default async function ChatPage() {
  const store = await adminApi<AdminStore>("");
  const s = { ...demoCatalog.store, ...store.settings, name: store.name } as typeof demoCatalog.store;
  return (
    <AdminShell current="/admin/chat">
      <h1 className="mb-1 text-2xl font-semibold">Chat de WhatsApp</h1>
      <p className="mb-6 text-zinc-600">
        Un botón de chat en la tienda que responde solo las preguntas frecuentes. Si el cliente necesita algo más, lo pasa a tu WhatsApp con su pregunta ya escrita.
      </p>
      <ChatForm
        initial={store.settings.chat ?? defaultChat(store.settings.whatsapp ?? "")}
        data={{
          name: store.name,
          discountCode: s.discountCode,
          discountKind: s.discountKind,
          discountPercent: s.discountPercent,
          discountMin: s.discountMin,
          freeShippingFrom: s.freeShippingFrom,
          installments: s.installments,
          shippingRM: s.shippingRM,
          shippingRegions: s.shippingRegions,
        }}
      />
    </AdminShell>
  );
}
