import { createTracerProvider } from "./trace-provider";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { mock } from "jest-mock-extended";
import * as fs from "fs";
import * as path from "path";

describe("createTracerProvider", () => {
  let subject: BasicTracerProvider;
  const traceLogFilePath = path.join(__dirname, "trace.log");
  beforeEach(() => {
    jest.useFakeTimers();

    subject = createTracerProvider({
      traceLogFilePath,
      serviceName: "test",
      serviceNamespace: "test",
      serviceInstanceId: "test",
      serviceVersion: "1.0.0",
    });
  });

  afterEach(async () => {
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
      subject.resource.attributes[SemanticResourceAttributes.SERVICE_NAMESPACE]
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
    expect(fs.existsSync(traceLogFilePath)).toBeTruthy();
  });
});
