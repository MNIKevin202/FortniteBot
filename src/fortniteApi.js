const BASE_URL = "https://fortnite-api.com/v2";

class FortniteApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "FortniteApiError";
    this.status = status;
  }
}

async function request(path, { apiKey, searchParams } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: apiKey ? { Authorization: apiKey } : undefined,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error || body?.message || `Fortnite API returned ${response.status}`;
    throw new FortniteApiError(message, response.status);
  }

  return body.data;
}

async function getShop() {
  return request("/shop", { searchParams: { language: "en" } });
}

async function getNews() {
  return request("/news/br", { searchParams: { language: "en" } });
}

async function getStats({ name, platform, apiKey }) {
  if (!apiKey) {
    throw new FortniteApiError("FORTNITE_API_KEY is required for /stats.", 401);
  }

  return request("/stats/br/v2", {
    apiKey,
    searchParams: {
      name,
      accountType: platform || "epic",
    },
  });
}

module.exports = {
  FortniteApiError,
  getNews,
  getShop,
  getStats,
};
