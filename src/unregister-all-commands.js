const { unregisterAllCommands } = require("./register-commands");

unregisterAllCommands().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
