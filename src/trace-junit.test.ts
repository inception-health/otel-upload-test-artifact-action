import { traceJunitArtifact } from "./trace-junit";
import * as path from "path";
import { trace, Tracer, SpanStatusCode } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { IdGenerator } from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

class TestIdGenerator implements IdGenerator {
  traceIdCounter: number;
  spanIdCounter: number;

  constructor() {
    this.traceIdCounter = 0;
    this.spanIdCounter = 0;
  }
  generateTraceId() {
    this.traceIdCounter += 1;
    return `${this.traceIdCounter}`;
  }

  generateSpanId() {
    this.spanIdCounter += 1;
    return `${this.spanIdCounter}`;
  }
}

describe("traceJunitArtifact", () => {
  let memoryExporter: InMemorySpanExporter;
  let tracerProvider: BasicTracerProvider;
  let tracer: Tracer;

  beforeAll(() => {
    memoryExporter = new InMemorySpanExporter();
    tracerProvider = new BasicTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "traceTestReportArtifact",
      }),
      idGenerator: new TestIdGenerator(),
    });
    tracerProvider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
    tracer = trace.getTracer("default");
    tracerProvider.register();
  });

  beforeEach(() => {
    memoryExporter.reset();
  });

  afterEach(() => {
    // clear require cache
    Object.keys(require.cache).forEach((key) => delete require.cache[key]);
  });

  afterAll(() => {
    return tracerProvider.shutdown();
  });

  it("test junit testsuites pass", async () => {
    const junitFilePath = path.join(
      "src",
      "__assets__",
      "junit-testsuites.xml"
    );
    const startTime = new Date("2022-01-22T04:45:30");

    await traceJunitArtifact({
      trace,
      tracer,
      startTime,
      path: junitFilePath,
      baseHtmlUrl: "https://example.com",
    });

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toEqual(9);

    spans.forEach((s) => {
      expect(s.attributes).toBeDefined();
      expect(Object.keys(s.attributes).length).toBeGreaterThan(0);
      expect(s.endTime).toBeDefined();
      expect(s.startTime).toBeDefined();
      expect(s.endTime[0]).toBeGreaterThanOrEqual(s.startTime[0]);
      expect(s.endTime[1]).toBeGreaterThanOrEqual(s.startTime[1]);
      expect(s.status).toBeDefined();
      expect(s.attributes.error).toEqual(false);
      expect(s.status.code).not.toEqual(SpanStatusCode.ERROR);
    });
  });

  it("test junit testsuite pass", async () => {
    const junitFilePath = path.join("src", "__assets__", "junit-testsuite.xml");
    const startTime = new Date("2022-01-22T04:45:30");

    await traceJunitArtifact({
      trace,
      tracer,
      startTime,
      baseHtmlUrl: "https://example.com",
      path: junitFilePath,
    });

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toEqual(6);

    spans.forEach((s) => {
      expect(s.attributes).toBeDefined();
      expect(Object.keys(s.attributes).length).toBeGreaterThan(0);
      expect(s.endTime).toBeDefined();
      expect(s.startTime).toBeDefined();
      expect(s.endTime[0]).toBeGreaterThanOrEqual(s.startTime[0]);
      expect(s.endTime[1]).toBeGreaterThanOrEqual(s.startTime[1]);
      expect(s.status).toBeDefined();
      expect(s.attributes.error).toEqual(false);
      expect(s.status.code).not.toEqual(SpanStatusCode.ERROR);
    });
  });

  it("test junit testsuites golang pass", async () => {
    const junitFilePath = path.join("src", "__assets__", "junit-golang.xml");
    const startTime = new Date("2022-01-22T04:45:30");

    await traceJunitArtifact({
      trace,
      tracer,
      startTime,
      path: junitFilePath,
      baseHtmlUrl: "https://example.com",
    });

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toEqual(5);

    spans.forEach((s) => {
      expect(s.attributes).toBeDefined();
      expect(Object.keys(s.attributes).length).toBeGreaterThan(0);
      expect(s.endTime).toBeDefined();
      expect(s.startTime).toBeDefined();
      expect(s.endTime[0]).toBeGreaterThanOrEqual(s.startTime[0]);
      expect(s.endTime[1]).toBeGreaterThanOrEqual(s.startTime[1]);
      expect(s.status).toBeDefined();
      expect(s.attributes.error).toEqual(false);
      expect(s.status.code).not.toEqual(SpanStatusCode.ERROR);
    });
  });

  it("test testsuites failed", async () => {
    const junitFilePath = path.join(
      "src",
      "__assets__",
      "junit-testsuites-failed.xml"
    );
    const startTime = new Date("2022-02-01T18:37:11");

    await traceJunitArtifact({
      trace,
      tracer,
      startTime,
      path: junitFilePath,
      baseHtmlUrl: "https://example.com",
    });

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toEqual(14);

    spans.forEach((s) => {
      expect(s.attributes).toBeDefined();
      expect(Object.keys(s.attributes).length).toBeGreaterThan(0);
      expect(s.endTime).toBeDefined();
      expect(s.startTime).toBeDefined();
      expect(s.endTime[0]).toBeGreaterThanOrEqual(s.startTime[0]);
      expect(s.endTime[1]).toBeGreaterThanOrEqual(s.startTime[1]);
      expect(s.status).toBeDefined();
      if (s.status.code === SpanStatusCode.ERROR) {
        expect(s.attributes.error).toEqual(true);
      } else {
        expect(s.attributes.error).toBeFalsy();
      }
    });
  });

  it("test testsuite failed", async () => {
    const junitFilePath = path.join(
      "src",
      "__assets__",
      "junit-testsuite-failed.xml"
    );
    const startTime = new Date("2022-02-01T18:37:11");

    await traceJunitArtifact({
      trace,
      tracer,
      startTime,
      path: junitFilePath,
      baseHtmlUrl: "https://example.com",
    });

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toEqual(7);

    spans.forEach((s) => {
      expect(s.attributes).toBeDefined();
      expect(Object.keys(s.attributes).length).toBeGreaterThan(0);
      expect(s.endTime).toBeDefined();
      expect(s.startTime).toBeDefined();
      expect(s.endTime[0]).toBeGreaterThanOrEqual(s.startTime[0]);
      expect(s.endTime[1]).toBeGreaterThanOrEqual(s.startTime[1]);
      expect(s.status).toBeDefined();
      if (s.status.code === SpanStatusCode.ERROR) {
        expect(s.attributes.error).toEqual(true);
      } else {
        expect(s.attributes.error).toBeFalsy();
      }
    });
  });

  it("test glob path", async () => {
    const junitFilePath = path.join("src", "__assets__", "*.xml");
    const startTime = new Date("2022-02-01T18:37:11");

    await traceJunitArtifact({
      trace,
      tracer,
      startTime,
      path: junitFilePath,
      baseHtmlUrl: "https://example.com",
    });

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toEqual(37);

    spans.forEach((s) => {
      expect(s.attributes).toBeDefined();
      expect(Object.keys(s.attributes).length).toBeGreaterThan(0);
      expect(s.endTime).toBeDefined();
      expect(s.startTime).toBeDefined();
      expect(s.endTime[0]).toBeGreaterThanOrEqual(s.startTime[0]);
      expect(s.endTime[1]).toBeGreaterThanOrEqual(s.startTime[1]);
      expect(s.status).toBeDefined();
      if (s.status.code === SpanStatusCode.ERROR) {
        expect(s.attributes.error).toEqual(true);
      } else {
        expect(s.attributes.error).toBeFalsy();
      }
    });
  });
});
