import { JWT } from "google-auth-library";
import { getServerEnv } from "@ru/config";

const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export const CLASS_MAILBOX = "classes@mukhamudra.com";
export const CLASS_FROM = "Mukha Mudra <classes@mukhamudra.com>";
export const GMAIL_BCC_CHUNK = 499;

export type ClassGmailConfig = {
  serviceAccountEmail: string;
  privateKey: string;
};

export function classGmailConfig(): ClassGmailConfig | null {
  const env = getServerEnv();
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return null;
  }
  return {
    serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}

export function buildClassMailRaw(input: {
  from: string;
  to: string;
  bcc: string[];
  subject: string;
  html: string;
}): string {
  const body = Buffer.from(input.html, "utf8").toString("base64");
  const lines = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    foldHeader("Bcc", input.bcc.join(", ")),
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    body.replace(/.{1,76}/g, "$&\r\n").trimEnd(),
  ];
  return lines.join("\r\n");
}

export type GmailSendResult =
  | { ok: true; messageId: string }
  | { ok: false; authError: boolean; error: string };

export async function sendClassMailViaGmail(
  config: ClassGmailConfig,
  input: {
    bcc: string[];
    subject: string;
    html: string;
  },
): Promise<GmailSendResult> {
  const auth = new JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: [GMAIL_SEND_SCOPE],
    subject: CLASS_MAILBOX,
  });
  const access = await auth.getAccessToken();
  const token = access.token;
  if (!token) {
    return { ok: false, authError: true, error: "Gmail access token missing" };
  }

  const raw = buildClassMailRaw({
    from: CLASS_FROM,
    to: CLASS_MAILBOX,
    bcc: input.bcc,
    subject: input.subject,
    html: input.html,
  });

  const response = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url") }),
  });

  if (response.ok) {
    const data = (await response.json()) as { id?: string };
    return { ok: true, messageId: data.id ?? "" };
  }

  const errorText = await response.text();
  return {
    ok: false,
    authError: response.status === 401 || response.status === 403,
    error: `Gmail ${response.status}: ${errorText.slice(0, 300)}`,
  };
}

function foldHeader(name: string, value: string): string {
  const raw = `${name}: ${value}`;
  const parts: string[] = [];
  let rest = raw;
  while (rest.length > 78) {
    parts.push(rest.slice(0, 78));
    rest = ` ${rest.slice(78)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}
