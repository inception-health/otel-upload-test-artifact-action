# Open Telemetry Upload Test Artifact Action

This action is a companion Action to [otel-export-trace-action](https://github.com/marketplace/actions/opentelemetry-export-trace). This Action will transform a Test Report to an OTLP Trace log file and Upload as a Github Artifact so that otel-export-trace-action can download and link to the Github Workflow step span that produced it before exporting to the OTLP destination.

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
        if: always()
        with:
          jobName: "lint-and-test"
          stepName: "run tests"
          path: "junit.xml"
          type: "junit"
          githubToken: ${{ secrets.GITHUB_TOKEN }}
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

### With Matrix Strategy

When using this action with a Matrix strategy you will need to append the matrix outputs to the `jobName` input argument surrounded by parenthesis. Tip: if you struggle to get the right formatting look at workflow run in `Actions` and see what the display name is for the matrix builds.

```yaml
name: "code quality PR check"

on:
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    strategy:
      matrix:
        os: ["ubuntu-latest", "windows-latest", "macos-latest"]
    runs-on: ${{ matrix.os }}
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
        if: always()
        with:
          jobName: "lint-and-test"
          stepName: "run tests (${{ matrix.os }})"
          path: "junit.xml"
          type: "junit"
          githubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Using Glob pattern matching

You can target multiple test reports using [Glob filter pattern syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet). This will allow you to trace test reports that are segmented into different files by Test Suite.

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
        if: always()
        with:
          jobName: "lint-and-test"
          stepName: "run tests"
          path: "junit-reports/*.xml"
          type: "junit"
          githubToken: ${{ secrets.GITHUB_TOKEN }}
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

# Limitations

Currently only supports Junit Test Reports
