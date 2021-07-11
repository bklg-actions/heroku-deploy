# heroku-deploy

Deploys your branch to a new or existing Heroku application.

## Usage

Use the action in your workflow with your API key:

```yaml
name: workflow-name
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  job_name:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: bklg-actions/heroku-deploy@v1
        id: deploy
        with:
          api_key: ${{secrets.HEROKU_API_KEY}}
          application_name: target-application
      - name: echo deploy variables
        run: echo application_url=$APPLICATION_URL
        env:
          APPLICATION_URL: ${{steps.deploy.outputs.application_url}}
```

See [action.yml](/bklg-actions/heroku-deploy/blob/master/action.yml) for a full list of inputs and outputs.

## Contributing

Issue reports and pull requests are welcome on GitHub at https://github.com/bklg-actions/heroku-deploy.

## License

This work is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
