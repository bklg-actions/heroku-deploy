const core = require('@actions/core');
const { execute, executeCapture } = require('./execute');

const addRemote = ({ apiKey, applicationName }) => {
  if (execute('git', ['config', 'remote.heroku.url']).status === 0) {
    execute('git', ['remote', 'remove', 'heroku']);
  }

  execute('git', ['remote', 'add', 'heroku', `https://heroku:${apiKey}@git.heroku.com/${applicationName}.git`]);
};

const createApplication = ({ applicationName, region, addOns }) => {
  if (execute('heroku', ['apps:info', `--app=${applicationName}`]).status !== 0) {
    let args = ['apps:create', `--app=${applicationName}`];

    if (region) {
      args.push(`--region=${region}`);
    }

    if (addOns) {
      args.push(`--addons=${addOns.split(/\s+/).join(',')}`);
    }

    execute('heroku', args);
  }
}

const parseConfigOutput = (data) => {
  const variablePattern = /^([A-Z_]+)[=:]\s*(.+)$/;

  return data.split("\n").reduce((result, line) => {
    const match = line.match(variablePattern);
    if (match) {
      result[match[1]] = match[2];
    }

    return result;
  }, {});
}

const configureApplication = ({ applicationName, environmentVariables }) => {
  const result = executeCapture('heroku', ['config', `--app=${applicationName}`])

  if (result.status === 1) {
    throw "Couldn't retrieve the current environment variables for the application."
  }

  const currentVariables = parseConfigOutput(result.output.toString());

  for (const [variable, value] of Object.entries(environmentVariables)) {
    if (!(variable in currentVariables)) {
      execute('heroku', ['config:set', `${variable}=${value}`, `--app=${applicationName}`]);
    }
  }
}

const deployBranch = () => {
  return execute('git', ['push', 'heroku', 'main']);
}

const getEnvironmentVariables = () => {
  const variables = process.env;

  return Object
    .keys(variables)
    .filter((key) => {
      return /^ENV__/.test(key);
    })
    .reduce((object, key) => {
      object[key] = variables[key];
      return object;
    }, {});
}

async function run() {
  try {
    let config = {
      addOns: core.getInput('add_ons'),
      apiKey: core.getInput('api_key'),
      applicationName: core.getInput('application_name'),
      branchName: core.getInput('branch_name'),
      environmentVariables: getEnvironmentVariables(),
      region: core.getInput('region'),
    };

    createApplication(config);
    configureApplication(config);
    addRemote(config);

    if (deployBranch(config).status === 0) {
      core.setOutput('application_url', `https://${config.applicationName}.herokuapp.com`);
      core.setOutput('is_success', true);
    } else {
      core.setOutput('is_success', false);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
