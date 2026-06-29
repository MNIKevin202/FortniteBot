require("dotenv").config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function envBool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

module.exports = {
  discordApplicationId: requireEnv("DISCORD_APPLICATION_ID"),
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY || "",
  discordSecret: process.env.DISCORD_SECRET || "",
  discordBotToken: requireEnv("DISCORD_BOT_TOKEN"),
  discordGuildId: process.env.DISCORD_GUILD_ID || "",
  discordPrefix: process.env.DISCORD_PREFIX || "!",
  discordPrefixEnabled: envBool("DISCORD_PREFIX_ENABLED"),
  fortniteApiKey: process.env.FORTNITE_API_KEY || "",
  mongoDbUri: process.env.mongoDB_URI || "",
  adminRoleId: process.env.admin_role_ID || "",
  modRoleId: process.env.mod_role_ID || "",
  memberRoleId: process.env.member_role_ID || "",
  port: Number(process.env.PORT || 60894),
};
