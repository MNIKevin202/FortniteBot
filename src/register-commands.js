const { REST, Routes } = require("discord.js");
const { discordApplicationId, discordBotToken, discordGuildId } = require("./config");
const { commandsJson } = require("./commands");

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(discordBotToken);

  if (discordGuildId) {
    await rest.put(
      Routes.applicationGuildCommands(discordApplicationId, discordGuildId),
      { body: commandsJson },
    );
    console.log(`Registered ${commandsJson.length} commands for guild ${discordGuildId}.`);
    return;
  }

  await rest.put(
    Routes.applicationCommands(discordApplicationId),
    { body: commandsJson },
  );
  console.log(`Registered ${commandsJson.length} global commands.`);
}

if (require.main === module) {
  registerCommands().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  registerCommands,
};
