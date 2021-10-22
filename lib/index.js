const core = require('@actions/core');
const { execute, executeCapture } = require('./execute');

const addRemote = ({ applicationName }) => {
  execute('heroku', ['git:remote', `--app=${applicationName}`])
};

const createApplication = ({ applicationName, region, addOns, buildPacks }) => {
  if (execute('heroku', ['apps:info', `--app=${applicationName}`]).status !== 0) {
    let args = ['apps:create', `--app=${applicationName}`];

    if (region) {
      args.push(`--region=${region}`);
    }

    if (addOns) {
      args.push(`--addons=${addOns.split(/\s+/).join(',')}`);
    }

    if (execute('heroku', args).status === 0) {
      if (buildPacks) {
        buildPacks.split(/\s+/).forEach((buildPack) => {
          if (execute('heroku', ['buildpacks:add', buildPack, `--app=${applicationName}`]).status !== 0) {
            throw `Couldn't add build-pack '${buildPack}'.`
          }
        });
      }

      core.setOutput('performed', 'create');
    }
  } else {
    core.setOutput('performed', 'update');
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
  return execute('git', ['push', 'heroku', 'HEAD:master', '--force']);
}

const getEnvironmentVariables = () => {
  const variables = process.env;
  const pattern = /^ENV__(.+)/;

  return Object
    .keys(variables)
    .filter((key) => {
      return pattern.test(key);
    })
    .reduce((object, key) => {
      const match = key.match(pattern);
      object[match[1]] = variables[key];
      return object;
    }, {});
}

async function run() {
  try {
    let config = {
      addOns: core.getInput('add_ons'),
      applicationName: core.getInput('application_name'),
      branchName: core.getInput('branch_name'),
      buildPacks: core.getInput('build_packs'),
      environmentVariables: getEnvironmentVariables(),
      region: core.getInput('region'),
    };

    createApplication(config);
    configureApplication(config);
    addRemote(config);

    core.setOutput('application_name', config.applicationName);

    if (deployBranch(config).status === 0) {
      core.setOutput('application_url', `https://${config.applicationName}.herokuapp.com`);
      core.setOutput('success', true);
    } else {
      throw 'Failed to push the branch to the Heroku remote.';
    }
  } catch (error) {
    core.setOutput('success', false);
    core.setFailed(error.message);
  }
}

run();
