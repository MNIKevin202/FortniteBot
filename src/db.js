const crypto = require("node:crypto");
const { MongoClient } = require("mongodb");
const { epicAuthEncryptionKey, mongoDbUri } = require("./config");

let clientPromise;

function getClient() {
  if (!mongoDbUri) {
    throw new Error("mongoDB_URI is required for Epic login storage.");
  }

  if (!clientPromise) {
    const client = new MongoClient(mongoDbUri);
    clientPromise = client.connect();
  }

  return clientPromise;
}

async function getDatabase() {
  const client = await getClient();
  return client.db();
}

async function saveEpicAuth(discordUserId, auth) {
  const db = await getDatabase();
  await db.collection("epic_auth").updateOne(
    { discordUserId },
    {
      $set: {
        discordUserId,
        epicAccountId: auth.accountId,
        epicDisplayName: auth.displayName,
        deviceId: auth.deviceId,
        deviceSecretEncrypted: encryptSecret(auth.deviceSecret),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

async function getEpicAuth(discordUserId) {
  const db = await getDatabase();
  const auth = await db.collection("epic_auth").findOne({ discordUserId });
  if (!auth) return null;

  return {
    ...auth,
    deviceSecret: decryptSecret(auth.deviceSecretEncrypted),
  };
}

function getEncryptionKey() {
  if (!epicAuthEncryptionKey) {
    throw new Error("EPIC_AUTH_ENCRYPTION_KEY is required for Epic login storage.");
  }

  return crypto.createHash("sha256").update(epicAuthEncryptionKey).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

function decryptSecret(value) {
  if (!value) {
    throw new Error("Stored Epic auth is missing encrypted device secret. Re-run /login.");
  }

  const [iv, authTag, encrypted] = value.split(":").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

module.exports = {
  getEpicAuth,
  saveEpicAuth,
};
