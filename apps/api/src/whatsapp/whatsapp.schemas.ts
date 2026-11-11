import { z } from 'zod';
import { MODELS } from './assistant.js';

const text = (max: number) => z.string().trim().max(max);
const phone = text(20).regex(/^\+?[\d\s()-]{8,20}$/, 'Revisa el número');

// Configuración del asistente. Los secretos vacíos = dejar el que ya estaba guardado.
export const WhatsappConfig = z.object({
  enabled: z.boolean(),
  live: z.boolean(),
  testNumbers: z.array(phone).max(10),
  phoneNumberId: z.union([text(30).regex(/^\d+$/, 'El identificador del número son solo dígitos'), z.literal('')]),
  displayPhone: z.union([phone, z.literal('')]),
  accessToken: text(1000).optional(),
  appSecret: text(200).optional(),
  aiKey: text(300).optional(),
  model: z.enum(MODELS.map((m) => m.id) as [string, ...string[]]),
  instructions: text(4000),
});
export type WhatsappConfig = z.infer<typeof WhatsappConfig>;

export const StaffReply = z.object({ text: text(4000).min(1, 'Escribe un mensaje') });
export const ChatPatch = z.object({ status: z.enum(['BOT', 'HUMAN', 'CLOSED']) });
export const TestMessage = z.object({ text: text(2000).min(1, 'Escribe un mensaje') });
