const { registerCommands } = require("./register-commands");

registerCommands({ reset: true }).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
