"use server";

import { adminApi, ApiError } from "./api";
import type { ActionResult, StepUp, WaConversation, WaStatus, WaTestChat, WaThread, WhatsappConfig } from "./types";

// Acciones del asistente de WhatsApp. La API valida permisos y pide el código de 2FA al
// guardar la configuración (tokens de Meta y API key).

const fail = (e: unknown): { ok: false; error: string; stepUp?: StepUp } => {
  if (e instanceof ApiError) return { ok: false, error: e.message, ...(e.stepUp ? { stepUp: e.stepUp } : {}) };
  throw e;
};

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return fail(e);
  }
}

export type WhatsappPayload = Pick<WhatsappConfig, "enabled" | "live" | "testNumbers" | "phoneNumberId" | "displayPhone" | "model" | "instructions"> & {
  accessToken?: string;
  appSecret?: string;
  aiKey?: string;
};

export const saveWhatsapp = async (body: WhatsappPayload) => run(() => adminApi<WhatsappConfig>("/whatsapp", { method: "PUT", body }));
export const listChats = async (status?: WaStatus) => run(() => adminApi<WaConversation[]>(`/whatsapp/conversations${status ? `?status=${status}` : ""}`));
export const openChat = async (id: string) => run(() => adminApi<WaThread>(`/whatsapp/conversations/${encodeURIComponent(id)}`));
export const replyChat = async (id: string, text: string) => run(() => adminApi<WaThread>(`/whatsapp/conversations/${encodeURIComponent(id)}/reply`, { method: "POST", body: { text } }));
export const setChatStatus = async (id: string, status: WaStatus) => run(() => adminApi<WaThread>(`/whatsapp/conversations/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } }));
export const sendTest = async (text: string) => run(() => adminApi<WaTestChat>("/whatsapp/test", { method: "POST", body: { text } }));
export const resetTest = async () => run(() => adminApi<WaTestChat>("/whatsapp/test", { method: "DELETE" }));
