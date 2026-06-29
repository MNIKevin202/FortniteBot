const { REST, Routes } = require("discord.js");
const { discordApplicationId, discordBotToken, discordGuildId } = require("./config");
const { commandsJson } = require("./commands");

function getGlobalCommandsRoute() {
  return {
    route: Routes.applicationCommands(discordApplicationId),
    label: "global commands",
  };
}

function getGuildCommandsRoute() {
  if (!discordGuildId) return null;

  return {
    route: Routes.applicationGuildCommands(discordApplicationId, discordGuildId),
    label: `guild ${discordGuildId}`,
  };
}

function getConfiguredCommandsRoute() {
  return getGuildCommandsRoute() || getGlobalCommandsRoute();
}

async function putCommands(routeConfig, commands, action) {
  const rest = new REST({ version: "10" }).setToken(discordBotToken);
  const { route, label } = routeConfig;

  const updatedCommands = await rest.put(route, { body: commands });
  console.log(`${action} commands for ${label}. Active command count: ${updatedCommands.length}.`);
}

async function unregisterCommands() {
  await putCommands(getConfiguredCommandsRoute(), [], "Unregistered");
}

async function unregisterAllCommands() {
  const guildRoute = getGuildCommandsRoute();

  await putCommands(getGlobalCommandsRoute(), [], "Unregistered");
  if (guildRoute) {
    await putCommands(guildRoute, [], "Unregistered");
  }
}

async function registerCommands({ reset = false } = {}) {
  if (reset) {
    await unregisterAllCommands();
    await wait(1500);
  }

  await putCommands(getConfiguredCommandsRoute(), commandsJson, "Registered");
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

if (require.main === module) {
  registerCommands().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  registerCommands,
  unregisterCommands,
  unregisterAllCommands,
};
