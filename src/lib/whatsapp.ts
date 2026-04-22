export type WhatsAppConfig = {
  apiKey: string;
  businessNumber: string;
};

const KEY = "zuma_whatsapp_360dialog";

export function getWhatsAppConfig(): WhatsAppConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WhatsAppConfig;
    if (!parsed.apiKey || !parsed.businessNumber) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWhatsAppConfig(cfg: WhatsAppConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
