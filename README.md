# Open Telemetry Upload Test Artifact Action

This action is a companion Action to [otel-export-trace-action](https://github.com/marketplace/actions/opentelemetry-export-trace). This Action will transform a Test report to an OpenTelemetry Trace file and Upload as a Github Artifact so that otel-export-trace-action can download and link to the Github Workflow step span that produced it before exporting to the OTLP destination.

## Usage

_code-quality-pr-check.yml_

```yaml
name: "code quality PR check"

on:
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - name: Install Dependencies
        run: npm ci --ignore-scripts
      - name: lint
        run: npm run lint:ci
      - name: run tests
        run: npm run test:ci
      - uses: inception-health/otel-upload-test-artifact-action@latest
        with:
          jobName: "lint-and-test"
          stepName: "run tests"
          path: "junit.xml"
          type: "junit"
```

_otel-export-trace.yml_

```yaml
name: OpenTelemetry Export Trace

on:
  workflow_run:
    workflows:
      - "code quality PR check"
    types: [completed]

jobs:
  otel-export-trace:
    name: OpenTelemetry Export Trace
    runs-on: ubuntu-latest
    steps:
      - name: export trace
        uses: inception-health/otel-export-trace-action@latest
        with:
          otlpEndpoint: grpc://api.honeycomb.io:443/
          otlpHeaders: ${{ secrets.DELIVERY_OTLP_HEADERS }}
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          runId: ${{ github.event.workflow_run.id }}
```

## Action Inputs

| name     | description                                                    | required | default |
| -------- | -------------------------------------------------------------- | -------- | ------- |
| jobName  | The name of the Job that produced the file to upload           | true     |         |
| stepName | The name of the Step that produced the file to upload          | true     |         |
| path     | The path to the file to Upload                                 | true     |         |
| type     | The type of artifact to upload. Currently only supports, junit | false    | junit   |

## Trace Unique Fields

| name                         | type    | description                              |
| ---------------------------- | ------- | ---------------------------------------- |
| name                         | string  | Test Run/Suite/Case name                 |
| error                        | string  | Test Run/Suite/Case name                 |
| test.id                      | string  | Test Scope ID                            |
| test.name                    | string  | Test Run/Suite/Case name                 |
| test.source                  | string  | Test source: Junit, xUnit, ngunit        |
| test.scope                   | string  | Scope of the Test Span: Run, Suite, Case |
| test.tests                   | integer | Number of Tests                          |
| test.failures                | integer | Number of Test Failures                  |
| test.errors                  | integer | Number of Test Errors                    |
| test.disables                | integer | Number of Tests Disabled                 |
| test.skips                   | integer | Number of Tests Skipped                  |
| test.time                    | float   | Duration of the Test Scope               |
| test.timestamp               | string  | Start Timestamp for the Test Scope       |
| test.hostname                | string  | Test Scope hostname                      |
| test.package                 | string  | Test Scope package                       |
| test.classname               | string  | Test Scope Classname                     |
| test.system.out              | string  | Test Scope System Out                    |
| test.system.err              | string  | Test Scope System Error                  |
| test.status                  | string  | Test Case Status: PASS, FAIL             |
| test.assertions              | integer | Number of Test Assertions                |
| test.skipped.{index}.message | string  | Test Skipped Message                     |
| test.error.{index}.message   | string  | Test Error Message                       |
| test.error.{index}.type      | string  | Test Error Type                          |
| test.error.{index}.inner     | string  | Test Error System Out                    |
| test.failure.{index}.message | string  | Test Failure Message                     |
| test.failure.{index}.type    | string  | Test Failure Type                        |
| test.failure.{index}.inner   | string  | Test Failure System Out                  |

## Honeycomb Example Trace
