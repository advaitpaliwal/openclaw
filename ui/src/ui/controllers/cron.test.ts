import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CRON_FORM } from "../app-defaults.ts";
import { addCronJob, type CronState } from "./cron.ts";

function createState(overrides: Partial<CronState> = {}): CronState {
  return {
    client: null,
    connected: true,
    cronLoading: false,
    cronJobs: [],
    cronStatus: null,
    cronError: null,
    cronForm: { ...DEFAULT_CRON_FORM },
    cronRunsJobId: null,
    cronRuns: [],
    cronBusy: false,
    ...overrides,
  };
}

describe("cron controller", () => {
  it("forwards webhook delivery in cron.add payload", async () => {
    const request = vi.fn(async (method: string, _payload?: unknown) => {
      if (method === "cron.add") {
        return { id: "job-1" };
      }
      if (method === "cron.list") {
        return { jobs: [] };
      }
      if (method === "cron.status") {
        return { enabled: true, jobs: 0, nextWakeAtMs: null };
      }
      return {};
    });

    const state = createState({
      client: {
        request,
      } as unknown as CronState["client"],
      cronForm: {
        ...DEFAULT_CRON_FORM,
        name: "webhook job",
        scheduleKind: "every",
        everyAmount: "1",
        everyUnit: "minutes",
        sessionTarget: "isolated",
        wakeMode: "next-heartbeat",
        payloadKind: "agentTurn",
        payloadText: "run this",
        deliveryMode: "webhook",
        deliveryTo: "https://example.invalid/cron",
      },
    });

    await addCronJob(state);

    const addCall = request.mock.calls.find(([method]) => method === "cron.add");
    expect(addCall).toBeDefined();
    expect(addCall?.[1]).toMatchObject({
      name: "webhook job",
      delivery: { mode: "webhook", to: "https://example.invalid/cron" },
    });
  });
});
