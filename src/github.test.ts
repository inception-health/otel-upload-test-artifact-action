import {
  getWorkflowRunStep,
  uploadTraceLogArtifact,
  ListJobsForWorkflowRunType,
  WorkflowRunStep,
  WorkflowRunJob,
} from "./github";
import { Octokit } from "@octokit/rest";
import { Context } from "@actions/github/lib/context";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import * as fs from "fs";
import * as path from "path";
import { mock, mockDeep } from "jest-mock-extended";
import * as artifact from "@actions/artifact";

type ListWorkflowRunArtifactsResponse =
  RestEndpointMethodTypes["actions"]["listWorkflowRunArtifacts"]["response"];
type DownloadArtifactResponse =
  RestEndpointMethodTypes["actions"]["downloadArtifact"]["response"];
type WorkflowArtifact =
  ListWorkflowRunArtifactsResponse["data"]["artifacts"][0];

describe("github.ts", () => {
  let mockContext: Context;
  let mockOctokit: Octokit;
  beforeEach(() => {
    mockContext = mockDeep<Context>();
    mockOctokit = mockDeep<Octokit>();
  });

  describe("listJobsForWorkflowRun", () => {
    let subject: WorkflowRunStep | undefined;
    const runId = 1;
    const jobName = "lint-and-format-check";
    const stepName = "run tests";

    beforeEach(async () => {
      const mockListJobsForWorkflowRun = mockOctokit.rest.actions
        .listJobsForWorkflowRun as jest.MockedFunction<
        typeof mockOctokit.rest.actions.listJobsForWorkflowRun
      >;

      mockListJobsForWorkflowRun.mockResolvedValue(
        mock<ListJobsForWorkflowRunType>({
          data: {
            total_count: 1,
            jobs: [
              mock<WorkflowRunJob>({
                id: runId,
                name: jobName,
                steps: [
                  mock<WorkflowRunStep>({
                    name: stepName,
                  }),
                ],
              }),
            ],
          },
        })
      );

      subject = await getWorkflowRunStep({
        context: mockContext,
        octokit: mockOctokit,
        runId,
        jobName,
        stepName,
      });
    });

    it("returns expected results", () => {
      expect(subject).toBeDefined();
      expect(subject?.name).toEqual("run tests");
    });
  });

  describe("uploadTraceLogArtifact", () => {
    let mockArtifactClient: artifact.ArtifactClient;
    beforeEach(() => {
      mockArtifactClient = mockDeep<artifact.ArtifactClient>();
    });

    it("successfully uploads artifact", async () => {
      (
        mockArtifactClient.uploadArtifact as jest.MockedFunction<
          typeof mockArtifactClient.uploadArtifact
        >
      ).mockResolvedValue(
        mock<artifact.UploadResponse>({
          failedItems: [],
        })
      );
      await uploadTraceLogArtifact({
        jobName: "lint-and-format-check",
        stepName: "run tests",
        path: "trace.log",
        artifactClient: mockArtifactClient,
      });
    });

    it("throws error when upload fails", async () => {
      const jobName = "lint-and-format-check";
      const stepName = "run tests";
      (
        mockArtifactClient.uploadArtifact as jest.MockedFunction<
          typeof mockArtifactClient.uploadArtifact
        >
      ).mockResolvedValue(
        mock<artifact.UploadResponse>({
          failedItems: [`{${jobName}}{${stepName}}`],
        })
      );

      await expect(
        uploadTraceLogArtifact({
          jobName,
          stepName,
          path: "trace.log",
          artifactClient: mockArtifactClient,
        })
      ).rejects.toThrowError();
    });
  });
});
