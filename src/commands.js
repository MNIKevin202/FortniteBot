const { SlashCommandBuilder } = require("discord.js");

const commandBuilders = [
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Show today's Fortnite Battle Royale item shop."),
  new SlashCommandBuilder()
    .setName("news")
    .setDescription("Show current Fortnite Battle Royale news."),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Look up Fortnite Battle Royale lifetime stats.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Epic, PlayStation, or Xbox display name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Account platform")
        .addChoices(
          { name: "Epic", value: "epic" },
          { name: "PlayStation", value: "psn" },
          { name: "Xbox", value: "xbl" },
        ),
    ),
];

module.exports = {
  commandBuilders,
  commandsJson: commandBuilders.map((command) => command.toJSON()),
};
