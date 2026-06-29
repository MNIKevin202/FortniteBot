const { unregisterCommands } = require("./register-commands");

unregisterCommands().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
