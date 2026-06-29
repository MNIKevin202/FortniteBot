const { SlashCommandBuilder } = require("discord.js");

const commandBuilders = [
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Show today's Fortnite Battle Royale item shop."),
  new SlashCommandBuilder()
    .setName("news")
    .setDescription("Show current Fortnite Battle Royale news."),
  new SlashCommandBuilder()
    .setName("login")
    .setDescription("Get the private Epic login link for linking your Fortnite account."),
  new SlashCommandBuilder()
    .setName("epic-code")
    .setDescription("Finish Epic login with the authorization code from Epic.")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The authorization code from Epic")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("sprite-debug")
    .setDescription("Privately scan your Fortnite profile for Sprite-looking data."),
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
