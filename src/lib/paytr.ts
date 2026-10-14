import crypto from "node:crypto";

/**
 * PayTR iFrame API. Akış:
 * 1) Sunucu get-token'a imzalı istek atar, dönen jetonla ödeme sayfası iframe içinde açılır.
 * 2) Ödeme sonucunu PayTR, panelde tanımlı "Bildirim URL"sine (/api/paytr/callback) POST eder.
 *    Bakiye yalnızca bu imzalı bildirimle yüklenir; kullanıcının döndüğü başarı sayfası tek başına bir şey yapmaz.
 * Tutarlar kuruş cinsindendir (PayTR de kuruş ister).
 */

export const PAYTR_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
export const paytrIframeUrl = (token: string) => `https://www.paytr.com/odeme/guvenli/${encodeURIComponent(token)}`;

const hmac = (data: string, key: string) => crypto.createHmac("sha256", key).update(data).digest("base64");

export type PaytrTokenInput = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  userIp: string;
  merchantOid: string;
  email: string;
  /** kuruş */
  paymentAmount: number;
  basket: [name: string, price: string, qty: number][];
  maxInstallment: number;
  testMode: boolean;
  userName: string;
  userAddress: string;
  userPhone: string;
  okUrl: string;
  failUrl: string;
};

/** get-token isteğinin form alanlarını ve imzasını üretir. */
export function buildTokenRequest(i: PaytrTokenInput): Record<string, string> {
  const userBasket = Buffer.from(JSON.stringify(i.basket)).toString("base64");
  const noInstallment = i.maxInstallment > 0 ? "0" : "1";
  const maxInstallment = String(i.maxInstallment);
  const currency = "TL";
  const testMode = i.testMode ? "1" : "0";
  const hashStr =
    i.merchantId + i.userIp + i.merchantOid + i.email + String(i.paymentAmount) + userBasket +
    noInstallment + maxInstallment + currency + testMode;
  return {
    merchant_id: i.merchantId,
    user_ip: i.userIp,
    merchant_oid: i.merchantOid,
    email: i.email,
    payment_amount: String(i.paymentAmount),
    paytr_token: hmac(hashStr + i.merchantSalt, i.merchantKey),
    user_basket: userBasket,
    debug_on: i.testMode ? "1" : "0",
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: i.userName.slice(0, 60),
    user_address: i.userAddress.slice(0, 400),
    user_phone: i.userPhone.slice(0, 20),
    merchant_ok_url: i.okUrl,
    merchant_fail_url: i.failUrl,
    timeout_limit: "30",
    currency,
    test_mode: testMode,
    lang: "tr",
  };
}

export async function requestPaytrToken(i: PaytrTokenInput): Promise<string> {
  const res = await fetch(PAYTR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(buildTokenRequest(i)).toString(),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json: { status?: string; token?: string; reason?: string };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`PayTR beklenmeyen yanıt (${res.status}): ${text.slice(0, 200)}`);
  }
  if (json.status !== "success" || !json.token) throw new Error(`PayTR: ${json.reason ?? "jeton alınamadı"}`);
  return json.token;
}

/** Bildirim (callback) imzası: base64(HMAC-SHA256(merchant_oid + salt + status + total_amount, key)) */
export function callbackHash(merchantOid: string, status: string, totalAmount: string, key: string, salt: string) {
  return hmac(merchantOid + salt + status + totalAmount, key);
}

export function verifyCallback(
  body: { merchant_oid?: string; status?: string; total_amount?: string; hash?: string },
  key: string,
  salt: string,
) {
  if (!body.merchant_oid || !body.status || !body.total_amount || !body.hash || !key || !salt) return false;
  const expected = Buffer.from(callbackHash(body.merchant_oid, body.status, body.total_amount, key, salt));
  const got = Buffer.from(body.hash);
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}
