export const CANAIS = [
  "Meta Ads",
  "Google Ads",
  "TikTok Ads",
  "Tráfego Direto",
  "Busca Orgânica",
  "E-mail / Newsletter",
  "Outros",
] as const;

export type Canal = (typeof CANAIS)[number];

const MIDIA_PAGA = /^(cpc|ppc|paid|paidsocial|paid_social|paid-social|cpm|ads?|display|retargeting|social_paid)$/;

// Classifica um "source / medium" do GA4 nos canais da Visão Geral.
export function classificarCanal(sourceMedium: string): Canal {
  const [sourceRaw, mediumRaw = ""] = sourceMedium.split(" / ");
  const source = sourceRaw.trim().toLowerCase();
  const medium = mediumRaw.trim().toLowerCase();

  if (/tiktok/.test(source)) return "TikTok Ads";
  if (/(facebook|instagram|^fb$|^ig$|meta|^an$)/.test(source) && (MIDIA_PAGA.test(medium) || medium.includes("paid"))) {
    return "Meta Ads";
  }
  if (/google|youtube/.test(source) && (MIDIA_PAGA.test(medium) || medium.includes("paid"))) return "Google Ads";
  if (source === "(direct)") return "Tráfego Direto";
  if (medium === "organic") return "Busca Orgânica";
  if (/e-?mail|newsletter/.test(medium) || /e-?mail|newsletter|klaviyo|mailchimp|rd ?station/.test(source)) {
    return "E-mail / Newsletter";
  }
  return "Outros";
}
