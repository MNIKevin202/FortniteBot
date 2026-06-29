const { epicClientId, epicLoginUrl, epicOAuthBasicToken, epicRedirectUri } = require("./config");

const ACCOUNT_BASE_URL = "https://account-public-service-prod.ol.epicgames.com";
const FORTNITE_MCP_BASE_URL = "https://fngw-mcp-gc-livefn.ol.epicgames.com";

class EpicApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "EpicApiError";
    this.status = status;
  }
}

function getEpicLoginUrl() {
  const clientId = epicClientId || getClientIdFromBasicToken();
  if (clientId) {
    return buildEpicLoginUrl(clientId);
  }

  if (epicLoginUrl) return epicLoginUrl;

  throw new EpicApiError("EPIC_CLIENT_ID or EPIC_LOGIN_URL is required for /login.", 500);
}

function buildEpicLoginUrl(clientId) {
  const url = new URL(epicLoginUrl || "https://www.epicgames.com/id/api/redirect");
  const configuredClientId = url.searchParams.get("clientId");
  if (configuredClientId && configuredClientId !== clientId) {
    console.warn("Ignoring EPIC_LOGIN_URL clientId because it does not match EPIC_CLIENT_ID/EPIC_OAUTH_BASIC_TOKEN.");
  }

  url.searchParams.set("clientId", clientId);
  url.searchParams.set("responseType", "code");
  return url.toString();
}

async function exchangeCodeForDeviceAuth(code) {
  const authorizationCodeParams = {
    grant_type: "authorization_code",
    code,
  };

  if (epicRedirectUri) {
    authorizationCodeParams.redirect_uri = epicRedirectUri;
  }

  const loginToken = await requestOAuthToken(authorizationCodeParams);

  try {
    const deviceAuth = await createDeviceAuth(loginToken.account_id, loginToken.access_token);
    return {
      accountId: loginToken.account_id,
      displayName: loginToken.displayName || loginToken.display_name || "Epic Account",
      deviceId: deviceAuth.deviceId,
      deviceSecret: deviceAuth.secret,
    };
  } finally {
    await killAccessToken(loginToken.access_token).catch(() => {});
  }
}

async function exchangeExchangeCodeForDeviceAuth(code) {
  const loginToken = await requestOAuthToken({
    grant_type: "exchange_code",
    exchange_code: code,
  });

  try {
    const deviceAuth = await createDeviceAuth(loginToken.account_id, loginToken.access_token);
    return {
      accountId: loginToken.account_id,
      displayName: loginToken.displayName || loginToken.display_name || "Epic Account",
      deviceId: deviceAuth.deviceId,
      deviceSecret: deviceAuth.secret,
    };
  } finally {
    await killAccessToken(loginToken.access_token).catch(() => {});
  }
}

async function getFortniteAccessToken(savedAuth) {
  return requestOAuthToken({
    grant_type: "device_auth",
    account_id: savedAuth.epicAccountId,
    device_id: savedAuth.deviceId,
    secret: savedAuth.deviceSecret,
  });
}

async function queryAthenaProfile(savedAuth) {
  const token = await getFortniteAccessToken(savedAuth);
  const url = `${FORTNITE_MCP_BASE_URL}/fortnite/api/game/v2/profile/${token.account_id}/client/QueryProfile?profileId=athena&rvn=-1`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.errorMessage || body?.message || `Epic MCP returned ${response.status}`;
    throw new EpicApiError(message, response.status);
  }

  return body;
}

function summarizeSpriteCandidates(profile) {
  const items = Object.values(profile?.profileChanges?.[0]?.profile?.items || {});
  const candidates = items
    .map((item) => ({
      templateId: item.templateId || "",
      attributes: item.attributes || {},
      quantity: item.quantity,
    }))
    .filter((item) => JSON.stringify(item).toLowerCase().includes("sprite"));

  const attributeKeys = new Set();
  for (const item of candidates) {
    for (const key of Object.keys(item.attributes || {})) {
      attributeKeys.add(key);
    }
  }

  return {
    profileRevision: profile?.profileRevision,
    totalItems: items.length,
    spriteCandidateCount: candidates.length,
    attributeKeys: [...attributeKeys].sort().slice(0, 30),
    sample: candidates.slice(0, 8).map((item) => ({
      templateId: item.templateId,
      quantity: item.quantity,
      attributes: redactAttributes(item.attributes),
    })),
  };
}

async function requestOAuthToken(params) {
  if (!epicOAuthBasicToken) {
    throw new EpicApiError("EPIC_OAUTH_BASIC_TOKEN is required for Epic login.", 500);
  }

  const response = await fetch(`${ACCOUNT_BASE_URL}/account/api/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    let message = body?.errorMessage || body?.message || `Epic OAuth returned ${response.status}`;
    if (/not issued for your client/i.test(message)) {
      message = `${message} Check that EPIC_CLIENT_ID, EPIC_LOGIN_URL, and EPIC_OAUTH_BASIC_TOKEN all use the same Epic OAuth client.`;
    }
    throw new EpicApiError(message, response.status);
  }

  return body;
}

function getBasicAuthorizationHeader() {
  if (epicOAuthBasicToken.toLowerCase().startsWith("basic ")) {
    return epicOAuthBasicToken;
  }

  return `Basic ${epicOAuthBasicToken}`;
}

function getClientIdFromBasicToken() {
  if (!epicOAuthBasicToken) return "";

  const rawToken = epicOAuthBasicToken.toLowerCase().startsWith("basic ")
    ? epicOAuthBasicToken.slice(6).trim()
    : epicOAuthBasicToken.trim();

  try {
    const decoded = Buffer.from(rawToken, "base64").toString("utf8");
    return decoded.split(":")[0] || "";
  } catch {
    return "";
  }
}

async function createDeviceAuth(accountId, accessToken) {
  const response = await fetch(`${ACCOUNT_BASE_URL}/account/api/public/account/${accountId}/deviceAuth`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.errorMessage || body?.message || `Epic device auth returned ${response.status}`;
    throw new EpicApiError(message, response.status);
  }

  return body;
}

async function killAccessToken(accessToken) {
  await fetch(`${ACCOUNT_BASE_URL}/account/api/oauth/sessions/kill/${accessToken}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function redactAttributes(attributes) {
  const redacted = {};
  for (const [key, value] of Object.entries(attributes || {})) {
    if (/token|secret|auth|email|session/i.test(key)) {
      redacted[key] = "[redacted]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

module.exports = {
  EpicApiError,
  exchangeExchangeCodeForDeviceAuth,
  exchangeCodeForDeviceAuth,
  getEpicLoginUrl,
  queryAthenaProfile,
  summarizeSpriteCandidates,
};
