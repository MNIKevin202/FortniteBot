const { REST, Routes } = require("discord.js");
const { discordApplicationId, discordBotToken, discordGuildId } = require("./config");
const { commandsJson } = require("./commands");

function getCommandsRoute() {
  if (discordGuildId) {
    return {
      route: Routes.applicationGuildCommands(discordApplicationId, discordGuildId),
      label: `guild ${discordGuildId}`,
    };
  }

  return {
    route: Routes.applicationCommands(discordApplicationId),
    label: "global commands",
  };
}

async function putCommands(commands, action) {
  const rest = new REST({ version: "10" }).setToken(discordBotToken);
  const { route, label } = getCommandsRoute();

  const updatedCommands = await rest.put(route, { body: commands });
  console.log(`${action} commands for ${label}. Active command count: ${updatedCommands.length}.`);
}

async function unregisterCommands() {
  await putCommands([], "Unregistered");
}

async function registerCommands({ reset = false } = {}) {
  if (reset) {
    await unregisterCommands();
    await wait(1500);
  }

  await putCommands(commandsJson, "Registered");
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
};
