import { adminApi } from "@/lib/admin/api";
import { API_URL } from "@/lib/api-base";
import type { WaConversation, WaTestChat, WhatsappConfig } from "@/lib/admin/types";
import { AdminShell } from "../AdminShell";
import { WhatsappPanel } from "./WhatsappPanel";

export default async function WhatsappPage() {
  const [config, chats, test] = await Promise.all([
    adminApi<WhatsappConfig>("/whatsapp"),
    adminApi<WaConversation[]>("/whatsapp/conversations"),
    adminApi<WaTestChat>("/whatsapp/test"),
  ]);
  return (
    <AdminShell current="/admin/whatsapp">
      <h1 className="mb-1 text-2xl font-semibold">Asistente de WhatsApp</h1>
      <p className="mb-6 text-zinc-600">
        Un asistente con inteligencia artificial (Claude) que contesta el WhatsApp de la tienda: resuelve dudas, busca productos con su precio y stock, revisa el estado de un pedido y,
        cuando hace falta, te pasa la conversación.
      </p>
      <WhatsappPanel config={config} chats={chats} test={test} webhookUrl={`${API_URL.replace(/\/$/, "")}${config.webhookPath}`} />
    </AdminShell>
  );
}
