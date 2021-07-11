const child_process = require("child_process");

const execute = (command, args) => {
  console.log(`${command} ${args.join(' ')}`);
  return child_process.spawnSync(command, args, {
    stdio: ['ignore', process.stdout, process.stderr]
  });
}

const executeCapture = (command, args) => {
  return child_process.spawnSync(command, args);
}

module.exports = {
  execute,
  executeCapture
};
