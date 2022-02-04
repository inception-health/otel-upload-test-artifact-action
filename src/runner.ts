import * as github from "@actions/github";
import * as artifact from "@actions/artifact";
import * as core from "@actions/core";
import { context, ROOT_CONTEXT, trace } from "@opentelemetry/api";
import { createTracerProvider } from "./trace-provider";
import { traceJunitArtifact } from "./trace-junit";
import { getWorkflowRunStep, uploadTraceLogArtifact } from "./github";

export async function run() {
  const ghContext = github.context;
  const jobName = core.getInput("jobName");
  const stepName = core.getInput("stepName");
  const path = core.getInput("path");
  const type = core.getInput("type");
  const runId = ghContext.runId;
  const ghToken: string | undefined =
    core.getInput("githubToken") || process.env.GITHUB_TOKEN;

  if (!ghToken) {
    core.setFailed("Missing GITHUB_TOKEN secret");
    return;
  }

  if (!["junit"].includes(type)) {
    core.setFailed(`Test file Type<${type}> is not supported`);
    return;
  }
  const traceLogFilePath = "trace.log";
  const provider = createTracerProvider({
    traceLogFilePath,
    serviceName: ghContext.workflow,
    serviceNamespace: `${ghContext.repo.owner}/${ghContext.repo.repo}`,
    serviceInstanceId: ghContext.sha,
    serviceVersion: "1.0.0",
  });
  try {
    const tracer = provider.getTracer("Trace Test Artifact");
    const octokit = github.getOctokit(ghToken);
    const artifactClient = artifact.create();

    core.info(`Verify Job<${jobName}> and Step<${stepName}>`);
    const step = await getWorkflowRunStep({
      context: ghContext,
      octokit,
      runId,
      jobName,
      stepName,
    });
    if (!step || !step.started_at) {
      core.setFailed(`Job<${jobName}> and Step<${stepName}> does not exist`);
      return;
    }
    const startTime = new Date(step.started_at);
    core.info(`Trace Test file`);
    if (type === "junit") {
      await traceJunitArtifact({
        trace,
        tracer,
        path,
        startTime,
      });
    }

    await provider.forceFlush();

    core.info(`Upload OTLP Trace Log`);
    await uploadTraceLogArtifact({
      jobName,
      stepName,
      path: traceLogFilePath,
      artifactClient,
    });
  } catch (e) {
    if (e instanceof Error) {
      core.setFailed(e);
    } else {
      core.setFailed(JSON.stringify(e));
    }
  } finally {
    core.info("Shutdown Trace Provider");
    setTimeout(() => {
      provider
        .shutdown()
        .then(() => {
          core.info("Provider shutdown");
        })
        .catch((error: Error) => {
          core.warning(error);
        });
    }, 2000);
  }
}
