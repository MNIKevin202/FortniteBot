const { Client, EmbedBuilder, GatewayIntentBits } = require("discord.js");
const {
  discordBotToken,
  discordPrefix,
  discordPrefixEnabled,
  discordResetCommandsOnStart,
  fortniteApiKey,
  port,
} = require("./config");
const { getNews, getShop, getStats } = require("./fortniteApi");
const { startHealthServer } = require("./healthServer");
const { registerCommands } = require("./register-commands");
const { getEpicAuth, saveEpicAuth } = require("./db");
const {
  exchangeCodeForDeviceAuth,
  getEpicLoginUrl,
  queryAthenaProfile,
  summarizeSpriteCandidates,
} = require("./epicApi");

const intents = [GatewayIntentBits.Guilds];
if (discordPrefixEnabled) {
  intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);
}

const client = new Client({
  intents,
});

startHealthServer(port);

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
  if (discordPrefixEnabled) {
    console.log(`Prefix commands enabled with prefix "${discordPrefix}"`);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "shop") {
      await handleShop(interaction);
      return;
    }

    if (interaction.commandName === "news") {
      await handleNews(interaction);
      return;
    }

    if (interaction.commandName === "stats") {
      await handleStats(interaction);
      return;
    }

    if (interaction.commandName === "login") {
      await handleLogin(interaction);
      return;
    }

    if (interaction.commandName === "epic-code") {
      await handleEpicCode(interaction);
      return;
    }

    if (interaction.commandName === "sprite-debug") {
      await handleSpriteDebug(interaction);
      return;
    }
  } catch (error) {
    console.error(error);
    const message = getUserFacingErrorMessage(error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
});

function getUserFacingErrorMessage(error) {
  if (error.name === "EpicApiError") return error.message;
  if (error.message?.startsWith("EPIC_")) return error.message;
  if (error.message?.startsWith("mongoDB_URI")) return error.message;
  if (error.status === 401) return error.message;
  return "I could not fetch that Fortnite data right now.";
}

client.on("messageCreate", async (message) => {
  if (!discordPrefixEnabled || message.author.bot || !message.content.startsWith(discordPrefix)) {
    return;
  }

  const parts = message.content.slice(discordPrefix.length).trim().split(/\s+/);
  const commandName = parts.shift()?.toLowerCase();

  try {
    if (commandName === "shop") {
      await message.reply({ embeds: [await buildShopEmbed()] });
      return;
    }

    if (commandName === "news") {
      await message.reply({ embeds: [await buildNewsEmbed()] });
      return;
    }

    if (commandName === "stats") {
      const platform = ["epic", "psn", "xbl"].includes(parts.at(-1)) ? parts.pop() : "epic";
      const name = parts.join(" ");
      if (!name) {
        await message.reply(`Usage: ${discordPrefix}stats player name [epic|psn|xbl]`);
        return;
      }

      await message.reply({ embeds: [await buildStatsEmbed({ name, platform })] });
      return;
    }

    if (commandName === "help") {
      await message.reply(`Commands: ${discordPrefix}shop, ${discordPrefix}news, ${discordPrefix}stats player name [epic|psn|xbl]`);
    }
  } catch (error) {
    console.error(error);
    await message.reply(error.status === 401 ? error.message : "I could not fetch that Fortnite data right now.");
  }
});

async function handleShop(interaction) {
  await interaction.deferReply();
  await interaction.editReply({ embeds: [await buildShopEmbed()] });
}

async function handleLogin(interaction) {
  await interaction.reply({
    ephemeral: true,
    content: [
      "Open this Epic login/code page, sign in with Epic, then copy the authorization code it returns:",
      getEpicLoginUrl(),
      "",
      "Then run `/epic-code code:<the code>` here. The code is short-lived and the bot stores device auth in MongoDB, not your password.",
    ].join("\n"),
  });
}

async function handleEpicCode(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const code = interaction.options.getString("code", true).trim();
  const auth = await exchangeCodeForDeviceAuth(code);
  await saveEpicAuth(interaction.user.id, auth);

  await interaction.editReply([
    `Linked Epic account: ${auth.displayName}`,
    "Stored device auth in MongoDB for future Fortnite profile checks.",
    "You can now run `/sprite-debug`.",
  ].join("\n"));
}

async function handleSpriteDebug(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const savedAuth = await getEpicAuth(interaction.user.id);
  if (!savedAuth) {
    await interaction.editReply("You have not linked an Epic account yet. Run `/login` first.");
    return;
  }

  const profile = await queryAthenaProfile(savedAuth);
  const summary = summarizeSpriteCandidates(profile);
  const sampleLines = summary.sample.length
    ? summary.sample.map((item, index) => `${index + 1}. ${item.templateId || "[no templateId]"}`).join("\n")
    : "No profile items containing \"sprite\" were found.";

  await interaction.editReply([
    `Epic account: ${savedAuth.epicDisplayName || savedAuth.epicAccountId}`,
    `Profile revision: ${summary.profileRevision ?? "unknown"}`,
    `Athena profile items scanned: ${summary.totalItems}`,
    `Sprite-looking items found: ${summary.spriteCandidateCount}`,
    "",
    sampleLines,
    "",
    summary.attributeKeys.length ? `Attribute keys: ${summary.attributeKeys.join(", ")}` : "No Sprite attribute keys found.",
  ].join("\n").slice(0, 1900));
}

async function buildShopEmbed() {
  const shop = await getShop();
  const entries = shop.entries || [];
  const featuredItems = entries
    .flatMap((entry) => entry.brItems || [])
    .filter(Boolean)
    .slice(0, 10);

  const lines = featuredItems.map((item, index) => {
    const rarity = item.rarity?.displayValue || "Unknown rarity";
    return `${index + 1}. ${item.name} (${rarity})`;
  });

  const embed = new EmbedBuilder()
    .setTitle("Fortnite Battle Royale Shop")
    .setDescription(lines.length ? lines.join("\n") : "No shop items found.")
    .setColor(0x2f80ed)
    .setFooter({ text: shop.hash ? `Shop hash: ${shop.hash}` : "Fortnite API" });

  const image = featuredItems[0]?.images?.icon || featuredItems[0]?.images?.featured;
  if (image) embed.setThumbnail(image);

  return embed;
}

async function handleNews(interaction) {
  await interaction.deferReply();
  await interaction.editReply({ embeds: [await buildNewsEmbed()] });
}

async function buildNewsEmbed() {
  const news = await getNews();
  const posts = news.motds || [];
  const topPosts = posts.slice(0, 3);

  const embed = new EmbedBuilder()
    .setTitle("Fortnite Battle Royale News")
    .setColor(0xf2c94c);

  if (topPosts.length === 0) {
    embed.setDescription("No Battle Royale news found.");
  } else {
    for (const post of topPosts) {
      embed.addFields({
        name: post.title || "Untitled",
        value: post.body || "No summary available.",
      });
    }
    const image = topPosts[0]?.image;
    if (image) embed.setImage(image);
  }

  return embed;
}

async function handleStats(interaction) {
  await interaction.deferReply();

  const name = interaction.options.getString("name", true);
  const platform = interaction.options.getString("platform") || "epic";
  await interaction.editReply({ embeds: [await buildStatsEmbed({ name, platform })] });
}

async function buildStatsEmbed({ name, platform }) {
  const stats = await getStats({ name, platform, apiKey: fortniteApiKey });
  const lifetime = stats.stats?.all?.overall;

  if (!lifetime) {
    throw new Error(`No lifetime Battle Royale stats found for ${name}.`);
  }

  return new EmbedBuilder()
    .setTitle(`${stats.account.name} Battle Royale Stats`)
    .setColor(0x27ae60)
    .addFields(
      { name: "Wins", value: String(lifetime.wins ?? 0), inline: true },
      { name: "Matches", value: String(lifetime.matches ?? 0), inline: true },
      { name: "Win Rate", value: `${lifetime.winRate ?? 0}%`, inline: true },
      { name: "Kills", value: String(lifetime.kills ?? 0), inline: true },
      { name: "K/D", value: String(lifetime.kd ?? 0), inline: true },
      { name: "Top 10", value: String(lifetime.top10 ?? 0), inline: true },
    )
    .setFooter({ text: `Platform: ${platform}` });
}

async function main() {
  try {
    await registerCommands({ reset: discordResetCommandsOnStart });
  } catch (error) {
    console.warn("Slash command registration failed. The bot will still start.");
    console.warn(getCommandRegistrationHint(error));
  }

  await client.login(discordBotToken);
}

function getCommandRegistrationHint(error) {
  if (error?.code === 50001) {
    return [
      "Discord returned Missing Access while registering guild commands.",
      "Check that DISCORD_GUILD_ID is the server where this bot is installed,",
      "and that DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN belong to the same Discord application.",
    ].join(" ");
  }

  return error?.message || String(error);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
