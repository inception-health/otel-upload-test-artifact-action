import { createTracerProvider } from "./trace-provider";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { traceJunitArtifact } from "./trace-junit";
import { trace } from "@opentelemetry/api";
import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";

async function* wrapAsyncGen(
  files: string[]
): AsyncGenerator<string, void, unknown> {
  for (const file of files) {
    yield await Promise.resolve(file);
  }
}

describe("createTracerProvider", () => {
  beforeAll(() => {
    // Mock @actions/core logging
    jest.spyOn(core, "info").mockImplementation();
    jest.spyOn(core, "debug").mockImplementation();
  });
  afterAll(() => {
    // Restore
    jest.restoreAllMocks();
  });

  describe("test provider instance", () => {
    let subject: BasicTracerProvider;
    const traceLogFilePath = path.join(__dirname, "trace.log");
    beforeAll(() => {
      jest.useFakeTimers();
      subject = createTracerProvider({
        traceLogFilePath,
        serviceName: "test",
        serviceNamespace: "test",
        serviceInstanceId: "test",
        serviceVersion: "1.0.0",
      });
    });

    afterAll(async () => {
      jest.useRealTimers();
      await subject.shutdown();
      fs.unlinkSync(traceLogFilePath);
    });

    it("has service.name resource", () => {
      expect(
        subject.resource.attributes[SemanticResourceAttributes.SERVICE_NAME]
      ).toEqual("test");
    });

    it("has service.instance.id resource", () => {
      expect(
        subject.resource.attributes[
          SemanticResourceAttributes.SERVICE_INSTANCE_ID
        ]
      ).toEqual("test");
    });

    it("has service.namespace resource", () => {
      expect(
        subject.resource.attributes[
          SemanticResourceAttributes.SERVICE_NAMESPACE
        ]
      ).toEqual("test");
    });

    it("has service.version resource", () => {
      expect(
        subject.resource.attributes[SemanticResourceAttributes.SERVICE_VERSION]
      ).toEqual("1.0.0");
    });

    it("has active span processor", () => {
      const spanProcessor = subject.getActiveSpanProcessor();
      expect(spanProcessor).toBeDefined();
    });

    it("created trace.log", async () => {
      await subject.shutdown();
      const traceLog = fs.readFileSync(traceLogFilePath, {
        encoding: "utf8",
        flag: "r",
      });
      expect(fs.existsSync(traceLogFilePath)).toBeTruthy();
    });
  });
  describe("test end-to-end junit trace", () => {
    let provider: BasicTracerProvider;
    const traceLogFilePath = path.join(__dirname, "trace.log");

    beforeAll(async () => {
      jest.useFakeTimers();

      let generateSpanIdIndex = 0;
      const generateSpanIds = [
        "24635a93ea56c064",
        "aed87033c3371f0d",
        "0122f5d88af36ea3",
        "0fc910cbb439a292",
        "0e0a8a9c24a643d4",
        "55caeab7808a147e",
        "83fc16ad11cbf025",
        "6bd385f3cdac916f",
        "902e826c7a2ac84f",
        "370919bada081d2e",
        "109e73362d75f16e",
        "98e5c74af2a51c8e",
        "f455d69f49ea0613",
        "4030f5fba7fe855c",
      ];
      const generateSpanId = () => {
        try {
          return generateSpanIds[generateSpanIdIndex];
        } finally {
          generateSpanIdIndex++;
        }
      };
      const generateTraceId = () => {
        return "4a647ac14a6066495c5578b8eb7ac9fa";
      };

      provider = createTracerProvider({
        traceLogFilePath,
        serviceName: "test",
        serviceNamespace: "test",
        serviceInstanceId: "test",
        serviceVersion: "1.0.0",
        idGenerator: { generateTraceId, generateSpanId },
      });
      const junitFilePath = path.join(
        "src",
        "__assets__",
        "junit-testsuites-failed.xml"
      );
      const startTime = new Date("2022-02-01T18:37:11");

      const tracer = provider.getTracer("Trace Test Artifact");

      await traceJunitArtifact({
        trace,
        tracer,
        startTime,
        filesGenerator: wrapAsyncGen([junitFilePath]),
        baseHtmlUrl: "https://example.com",
      });
      await provider.forceFlush();
      await provider.shutdown();
    });

    afterAll(() => {
      jest.useRealTimers();
      fs.unlinkSync(traceLogFilePath);
    });

    it("should match snapshot", () => {
      const traceLog = fs.readFileSync(traceLogFilePath, {
        encoding: "utf8",
        flag: "r",
      });
      expect(traceLog).toMatchSnapshot("trace-junit-testsuites-failed");
    });
  });
});
