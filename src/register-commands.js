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

  await rest.put(route, { body: commands });
  console.log(`${action} ${commands.length} commands for ${label}.`);
}

async function unregisterCommands() {
  await putCommands([], "Unregistered");
}

async function registerCommands({ reset = false } = {}) {
  if (reset) {
    await unregisterCommands();
  }

  await putCommands(commandsJson, "Registered");
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
