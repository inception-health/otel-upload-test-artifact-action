import { Context } from "@actions/github/lib/context";
import { GitHub } from "@actions/github/lib/utils";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import * as artifact from "@actions/artifact";

export type ListJobsForWorkflowRunType =
  RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"];
export type WorkflowRunStep = {
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  name: string;
  number: number;
  started_at?: string | null | undefined;
  completed_at?: string | null | undefined;
};
export type WorkflowRunJob = ListJobsForWorkflowRunType["data"]["jobs"][0];

export type GetWorkflowRunStepParams = {
  context: Context;
  octokit: InstanceType<typeof GitHub>;
  runId: number;
  jobName: string;
  stepName: string;
};
export async function getWorkflowRunStep({
  context,
  octokit,
  runId,
  jobName,
  stepName,
}: GetWorkflowRunStepParams): Promise<WorkflowRunStep | undefined> {
  const jobs: WorkflowRunJob[] = [];
  const pageSize = 100;

  for (let page = 1, hasNext = true; hasNext; page++) {
    const listJobsForWorkflowRunResponse: ListJobsForWorkflowRunType =
      await octokit.rest.actions.listJobsForWorkflowRun({
        ...context.repo,
        run_id: runId,
        filter: "latest", // risk of missing a run if re-run happens between Action trigger and this query
        page,
        per_page: pageSize,
      });

    jobs.push(...listJobsForWorkflowRunResponse.data.jobs);
    hasNext = jobs.length < listJobsForWorkflowRunResponse.data.total_count;
  }

  const job = jobs.find(({ name }) => name === jobName);
  const step = job?.steps?.find(({ name }) => name === stepName);

  return step;
}

export type UploadTraceLogArtifactParams = {
  jobName: string;
  stepName: string;
  path: string;
  artifactClient: artifact.ArtifactClient;
};
export async function uploadTraceLogArtifact({
  jobName,
  stepName,
  path,
  artifactClient,
}: UploadTraceLogArtifactParams): Promise<void> {
  const artifactKey = `{${jobName}}{${stepName}}`;
  const uploadResponse = await artifactClient.uploadArtifact(
    artifactKey,
    [path],
    "."
  );
  if (uploadResponse.failedItems.length > 0) {
    throw new Error(`Failed to upload ${path} to Artifact<${artifactKey}>`);
  }
}
