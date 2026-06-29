const { epicLoginUrl, epicOAuthBasicToken } = require("./config");

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
  return epicLoginUrl;
}

async function exchangeCodeForDeviceAuth(code) {
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
    const message = body?.errorMessage || body?.message || `Epic OAuth returned ${response.status}`;
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
  exchangeCodeForDeviceAuth,
  getEpicLoginUrl,
  queryAthenaProfile,
  summarizeSpriteCandidates,
};
