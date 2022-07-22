import {
  Span,
  TraceAPI,
  Tracer,
  Context,
  SpanStatusCode,
  ROOT_CONTEXT,
} from "@opentelemetry/api";
import { parse, TestCase, TestSuite, TestSuites } from "junit2json";
import * as fs from "fs";
import * as glob from "@actions/glob";
import * as core from "@actions/core";

export type TraceJunitArtifactParams = {
  trace: TraceAPI;
  tracer: Tracer;
  startTime: Date;
  path: string;
  baseHtmlUrl: string;
};
export async function traceJunitArtifact({
  trace,
  tracer,
  path,
  startTime,
  baseHtmlUrl,
}: TraceJunitArtifactParams) {
  const globber = await glob.create(path, { matchDirectories: false });
  let endTimeSec = 0;
  let code = SpanStatusCode.OK;
  const ctx = ROOT_CONTEXT;
  const span = tracer.startSpan(
    "Junit Test Runs",
    {
      startTime,
      attributes: {
        "test.source": "junit",
        "test.scope": "Run",
      },
      root: true,
    },
    ctx
  );
  let numFiles = 0;
  try {
    for await (const file of globber.globGenerator()) {
      core.debug(`Tracing file: ${file}`);
      numFiles++;
      const xmlString = fs.readFileSync(file, { encoding: "utf-8" });
      const document = await parse(xmlString);

      if ("testcase" in document) {
        const testSuite: TestSuite = document;
        const testSuiteResponse = traceTestSuite({
          testSuite,
          parentContext: ctx,
          parentSpan: span,
          trace,
          tracer,
          baseHtmlUrl,
          startTime: new Date(testSuite.timestamp || startTime),
        });
        endTimeSec = Math.max(endTimeSec, testSuiteResponse.durationSec);
        code =
          testSuiteResponse.code === SpanStatusCode.ERROR
            ? testSuiteResponse.code
            : code;
      } else if ("testsuite" in document) {
        const testSuites: TestSuites = document;
        const testSuitesResponse = traceTestSuites({
          testSuites,
          parentContext: ctx,
          parentSpan: span,
          trace,
          tracer,
          baseHtmlUrl,
          startTime: new Date(startTime),
        });
        endTimeSec = Math.max(endTimeSec, testSuitesResponse.durationSec);
        code =
          testSuitesResponse.code === SpanStatusCode.ERROR
            ? testSuitesResponse.code
            : code;
      }
    }
  } finally {
    core.debug(`Traced ${numFiles} Files`);
    span.setStatus({ code });
    span.setAttribute("error", code === SpanStatusCode.ERROR);
    const endTime = new Date(startTime);
    endTime.setMilliseconds(startTime.getMilliseconds() + endTimeSec * 1000);
    span.end(endTime);
  }
}

export type TraceTestSuitesParams = {
  trace: TraceAPI;
  tracer: Tracer;
  parentSpan: Span;
  parentContext: Context;
  startTime: Date;
  testSuites: TestSuites;
  baseHtmlUrl: string;
};
export type TraceTestSuitesResponse = {
  durationSec: number;
  code: SpanStatusCode;
};
export function traceTestSuites({
  trace,
  tracer,
  parentContext,
  parentSpan,
  testSuites,
  startTime,
  baseHtmlUrl,
}: TraceTestSuitesParams): TraceTestSuitesResponse {
  /* istanbul ignore next */
  core.debug(`Tracing TestSuites<${testSuites.name || "Undefined"}>`);
  const ctx = trace.setSpan(parentContext, parentSpan);
  const span = tracer.startSpan(
    /* istanbul ignore next */
    testSuites.name || "Junit Test Suites",
    {
      startTime,
      attributes: {
        "test.tests": testSuites.tests,
        "test.failures": testSuites.failures,
        "test.errors": testSuites.errors,
        "test.disabled": testSuites.disabled,
        "tests.time": testSuites.time,
      },
    },
    ctx
  );

  let code = SpanStatusCode.OK;
  /* istanbul ignore next */
  if (
    (testSuites.errors && testSuites.errors > 0) ||
    (testSuites.failures && testSuites.failures > 0)
  ) {
    code = SpanStatusCode.ERROR;
  }
  span.setStatus({ code });
  span.setAttribute("error", code === SpanStatusCode.ERROR);

  let endTimeSec = 0;
  try {
    const testSuiteTimes: number[] = testSuites.testsuite.map(
      (testSuite) =>
        traceTestSuite({
          testSuite,
          parentContext: ctx,
          parentSpan: span,
          startTime: new Date(testSuite.timestamp || startTime),
          tracer,
          trace,
          baseHtmlUrl,
        }).durationSec
    );
    endTimeSec = testSuiteTimes.reduce((r, i) => r + i, 0);
    return { durationSec: endTimeSec, code };
  } finally {
    const endTime = new Date(startTime);
    endTime.setMilliseconds(startTime.getMilliseconds() + endTimeSec * 1000);
    span.end(endTime);
  }
}

export type TraceTestSuiteParams = {
  testSuite: TestSuite;
  parentContext: Context;
  parentSpan: Span;
  startTime: Date;
  tracer: Tracer;
  trace: TraceAPI;
  baseHtmlUrl: string;
};
export type TraceTestSuiteResponse = {
  durationSec: number;
  code: SpanStatusCode;
};
export function traceTestSuite({
  testSuite,
  trace,
  tracer,
  startTime,
  parentSpan,
  parentContext,
  baseHtmlUrl,
}: TraceTestSuiteParams): TraceTestSuiteResponse {
  core.debug(`Tracing TestSuite<${testSuite.name}>`);
  const ctx = trace.setSpan(parentContext, parentSpan);
  const span = tracer.startSpan(
    testSuite.name,
    {
      startTime,
      attributes: {
        "test.name": testSuite.name,
        "test.scope": "Suite",
        "test.tests": testSuite.tests,
        "test.failures": testSuite.failures,
        "test.errors": testSuite.errors,
        "test.time": testSuite.time,
        "test.disables": testSuite.disabled,
        "test.skips": testSuite.skipped,
        "test.timestamp": testSuite.timestamp,
        "test.hostname": testSuite.hostname,
        "test.id": testSuite.id,
        "test.package": testSuite.package,
        "test.system.out": testSuite["system-out"],
        "test.system.err": testSuite["system-err"],
        "test.html_url": `${baseHtmlUrl}/${testSuite.name}`,
      },
    },
    ctx
  );

  let code = SpanStatusCode.OK;
  /* istanbul ignore next */
  if (
    (testSuite.errors && testSuite.errors > 0) ||
    (testSuite.failures && testSuite.failures > 0)
  ) {
    code = SpanStatusCode.ERROR;
  }
  span.setStatus({ code });
  span.setAttribute("error", code === SpanStatusCode.ERROR);
  let testCaseTime = new Date(startTime);
  let testCasesTimeSec = testSuite.time || 0;
  try {
    // there are cases when a testSuite exists without any testCases
    // see https://github.com/windyroad/JUnit-Schema/blob/cfa434d4b8e102a8f55b8727b552a0063ee9044e/JUnit.xsd#L18-L24
    const testCasesTimes = testSuite.testcase?.map((testCase) => {
      const testCaseTimeSec = traceTestCase({
        testCase,
        tracer,
        trace,
        parentSpan: span,
        parentContext: ctx,
        startTime: testCaseTime,
      });
      testCaseTime = new Date(testCaseTime);
      testCaseTime.setMilliseconds(
        testCaseTime.getMilliseconds() + (testCase.time || testCaseTimeSec)
      );
      return testCaseTimeSec;
    });

    // If testSuite exists with testCases
    if (testCasesTimes) {
      testCasesTimeSec =
        testCasesTimeSec || testCasesTimes.reduce((r, i) => r + i, 0);
    }

    return { durationSec: testCasesTimeSec, code };
  } finally {
    const endTime = new Date(startTime);
    endTime.setMilliseconds(
      startTime.getMilliseconds() + testCasesTimeSec * 1000
    );
    span.end(endTime);
  }
}

type TraceTestCaseParams = {
  testCase: TestCase;
  parentContext: Context;
  parentSpan: Span;
  startTime: Date;
  tracer: Tracer;
  trace: TraceAPI;
};
export function traceTestCase({
  testCase,
  parentContext,
  parentSpan,
  startTime,
  tracer,
  trace,
}: TraceTestCaseParams): number {
  core.debug(`Tracing TestCase<${testCase.name}>`);
  const ctx = trace.setSpan(parentContext, parentSpan);
  const span = tracer.startSpan(
    testCase.name,
    {
      startTime,
      attributes: {
        "test.name": testCase.name,
        "test.scope": "Case",
        "test.classname": testCase.classname,
        "test.time": testCase.time,
        "test.status": testCase.status,
        "test.assertions": testCase.assertions,
        "test.system.out": testCase["system-out"],
        "test.system.err": testCase["system-err"],
      },
    },
    ctx
  );
  try {
    let code: SpanStatusCode = SpanStatusCode.OK;
    if (
      /* istanbul ignore next */ (testCase.status &&
        testCase.status !== "PASS") ||
      (testCase.error && testCase.error.length > 0) ||
      (testCase.failure && testCase.failure.length > 0)
    ) {
      code = SpanStatusCode.ERROR;
    }
    span.setStatus({ code });
    span.setAttribute("error", code === SpanStatusCode.ERROR);

    /* istanbul ignore next */
    testCase.skipped?.forEach(({ message }, index) => {
      if (message) {
        span.setAttribute(`test.skipped.${index}.message`, message);
      }
    });

    /* istanbul ignore next */
    testCase.error?.forEach(({ message, type, inner }, index) => {
      if (message) {
        span.setAttribute(`test.error.${index}.message`, message);
      }
      if (type) {
        span.setAttribute(`test.error.${index}.type`, type);
      }
      if (inner) {
        span.setAttribute(`test.error.${index}.inner`, inner);
      }
    });
    /* istanbul ignore next */
    testCase.failure?.forEach(({ message, type, inner }, index) => {
      if (message) {
        span.setAttribute(`test.failure.${index}.message`, message);
      }
      if (type) {
        span.setAttribute(`test.failure.${index}.type`, type);
      }
      if (inner) {
        span.setAttribute(`test.failure.${index}.inner`, inner);
      }
    });
  } finally {
    const endTime = new Date(startTime);
    endTime.setMilliseconds(
      startTime.getMilliseconds() + (testCase.time || 0) * 1000
    );
    span.end(endTime);
  }

  return testCase.time || 0;
}
