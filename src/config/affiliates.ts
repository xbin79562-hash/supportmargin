/**
 * Centralized affiliate link registry for SupportMargin.
 *
 * Base URLs are the partner URLs supplied for this project. An empty base URL
 * resolves to the fallback hash below. This file intentionally contains no
 * commission promises, payout figures, savings estimates, or other claims.
 */

export const SUB_ID_PARAM = "sub_id" as const;
export const AFFILIATE_FALLBACK_HREF = "#" as const;

export type AffiliateKey =
  | "livechat"
  | "text"
  | "helpdesk"
  | "chatbot"
  | "smartsupp"
  | "zipchat";

export type AffiliateLink = {
  key: AffiliateKey;
  label: string;
  href: string;
};

export const affiliateKeys: readonly AffiliateKey[] = [
  "livechat",
  "text",
  "helpdesk",
  "chatbot",
  "smartsupp",
  "zipchat",
];

export const affiliateLinks: Record<AffiliateKey, AffiliateLink> = {
  livechat: {
    key: "livechat",
    label: "LiveChat",
    href: "https://www.livechat.com/?a=IVD0VhROg&utm_campaign=pp_livechat-default&utm_source=PP",
  },
  text: {
    key: "text",
    label: "Text",
    href: "https://www.text.com/?a=IVD0VhROg&utm_source=PP",
  },
  helpdesk: {
    key: "helpdesk",
    label: "Helpdesk",
    href: "https://www.helpdesk.com/?a=IVD0VhROg&utm_campaign=pp_helpdesk-default&utm_source=PP",
  },
  chatbot: {
    key: "chatbot",
    label: "Chatbot",
    href: "https://www.chatbot.com/?a=IVD0VhROg&utm_campaign=pp_chatbot-default&utm_source=PP",
  },
  smartsupp: {
    key: "smartsupp",
    label: "Smartsupp",
    href: "https://www.smartsupp.com/?affil=1234098",
  },
  zipchat: {
    key: "zipchat",
    label: "Zipchat",
    href: "",
  },
};

/**
 * Returns a link with an optional sub_id. Existing query parameters and the
 * URL fragment are preserved. If sub_id is already present it is replaced in
 * place rather than duplicated; a blank subId leaves the link as-is. An empty
 * href resolves to the fallback hash.
 */
export function withSubId(href: string, subId?: string | null): string {
  const trimmed = href.trim();
  if (!trimmed) return AFFILIATE_FALLBACK_HREF;

  const value = subId?.trim();
  if (!value) return trimmed;

  const hashIndex = trimmed.indexOf("#");
  const target = hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : trimmed.slice(hashIndex);

  const queryIndex = target.indexOf("?");
  const base = queryIndex === -1 ? target : target.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? "" : target.slice(queryIndex + 1);

  const params = rawQuery
    .split("&")
    .filter(Boolean)
    .filter((pair) => pair.split("=")[0] !== SUB_ID_PARAM);

  params.push(`${SUB_ID_PARAM}=${encodeURIComponent(value)}`);

  return `${base}?${params.join("&")}${hash}`;
}

/** Resolve a registered link with an optional tracking sub_id. */
export function getAffiliateUrl(key: AffiliateKey, subId?: string | null): string {
  return withSubId(affiliateLinks[key].href, subId);
}
