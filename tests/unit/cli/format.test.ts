import { describe, expect, it } from "vitest";

import {
  formatDaemonStatus,
  formatDoctor,
  formatStatus,
} from "../../../src/cli/format.js";

describe("CLI output formatting", () => {
  it("formats daemon status as key-value output", () => {
    const output = formatDaemonStatus({
      running: true,
      pid: 1234,
      socketPath: "/tmp/aiox/daemon.sock",
      dbPath: ":memory:",
      startedAt: "2026-05-22T00:00:00.000Z",
      version: "1.2.3-test",
    });

    expect(output).toContain("COMPONENT  daemon\n");
    expect(output).toContain("PID        1234\n");
    expect(output).toContain("SOCKET     /tmp/aiox/daemon.sock\n");
    expect(output).toContain("DB         :memory:\n");
    expect(output).toContain("STARTED    2026-05-22T00:00:00.000Z\n");
    expect(output).toMatch(/UPTIME\s+\d+[smhd]\n/);
    expect(output).toContain("VERSION    1.2.3-test\n");
  });

  it("formats non-running daemon status without process fields", () => {
    const output = formatDaemonStatus({
      running: false,
      socketPath: "/tmp/aiox/daemon.sock",
      dbPath: ":memory:",
      version: "1.2.3-test",
    });

    expect(output).toBe(
      [
        "COMPONENT  daemon",
        "STATUS     not running",
        "SOCKET     /tmp/aiox/daemon.sock",
        "DB         :memory:",
        "VERSION    1.2.3-test",
        "",
      ].join("\n"),
    );
  });

  it("formats status sections with agent names and delivery counts", () => {
    const output = formatStatus({
      daemon: {
        pid: 1234,
        startedAt: "2026-05-22T00:00:00.000Z",
      },
      agents: [
        {
          id: "agent-1",
          name: "impl",
          kind: "codex",
          status: "connected",
          cwd: "/repo",
          pairId: "pair-1",
          deliveryDiagnostics: {
            acceptanceEvidence: "codex_turn_start",
            targetReceiptEvidence: "unavailable",
            automaticTargetAck: false,
            automaticCompletion: false,
            automaticRetry: "conclusive_pre_write_failure_only",
            manualRetransmit: {
              eligibleStatus: "unconfirmed",
              requiresDuplicateRiskConfirmation: true,
              requiredReadiness: "ready_codex_runtime_and_bound_thread",
              dispatch: "direct_never_queued",
              lateTransportOutcomeResolution: "correlated_response",
            },
          },
        },
        {
          id: "agent-2",
          name: "reviewer",
          kind: "claude",
          status: "disconnected",
          cwd: "/repo",
          pairId: "pair-1",
          deliveryDiagnostics: {
            acceptanceEvidence: "claude_http_2xx",
            targetReceiptEvidence: "unavailable",
            automaticTargetAck: false,
            automaticCompletion: false,
            automaticRetry: "conclusive_pre_write_failure_only",
            manualRetransmit: {
              eligibleStatus: "unconfirmed",
              requiresDuplicateRiskConfirmation: true,
              requiredReadiness: "ready_claude_channel_runtime",
              dispatch: "direct_never_queued",
              lateTransportOutcomeResolution: "none",
            },
          },
        },
      ],
      pairs: [{ id: "pair-1", name: "feature-x", status: "ready" }],
      routes: [
        {
          id: "route-1",
          sourceAgentId: "agent-1",
          targetAgentId: "agent-2",
          status: "active",
        },
        {
          id: "route-2",
          sourceAgentId: "missing-source",
          targetAgentId: "agent-1",
          status: "active",
        },
      ],
      messageCount: 3,
      deliveryCounts: {
        queued: 1,
        delivering: 2,
        delivered: 0,
        completed: 4,
        failed: 5,
        unconfirmed: 0,
      },
    });

    expect(output).toContain("DAEMON\n");
    expect(output).toContain("STARTED  2026-05-22T00:00:00.000Z\n");
    expect(output).toMatch(/UPTIME\s+\d+[smhd]\n/);
    expect(output).toContain("AGENTS\n");
    expect(output).toContain("NAME      KIND    STATUS\n");
    expect(output).toContain("impl      codex   connected\n");
    expect(output).toContain("reviewer  claude  disconnected\n");
    expect(output.replace(/ +/g, " ")).toContain(
      [
        "DELIVERY GUARANTEES",
        "AGENT ACCEPTANCE RECEIPT EVIDENCE AUTO TARGET ACK AUTO COMPLETION AUTO RETRY MANUAL RETRANSMIT",
        "impl codex_turn_start unavailable none none conclusive_pre_write_failure_only unconfirmed; confirm_duplicate_risk; ready_codex_runtime_and_bound_thread; direct_never_queued; late_transport=correlated_response",
        "reviewer claude_http_2xx unavailable none none conclusive_pre_write_failure_only unconfirmed; confirm_duplicate_risk; ready_claude_channel_runtime; direct_never_queued; late_transport=none",
      ].join("\n"),
    );
    expect(output).toContain("PAIRS\n");
    expect(output).toContain("feature-x  ready\n");
    expect(output).toContain("ROUTES\n");
    expect(output).toContain("impl -> reviewer\n");
    expect(output).toContain("<missing:missing-source> -> impl\n");
    expect(output).toContain("DELIVERIES\n");
    expect(output).toContain(
      "messages=3 queued=1 delivering=2 delivered=0 completed=4 failed=5 unconfirmed=0\n",
    );
  });

  it("formats an empty delivery-guarantees table without inventing agent rows", () => {
    const output = formatStatus({
      daemon: {
        pid: 1234,
        startedAt: "not-a-date",
      },
      agents: [],
      pairs: [],
      routes: [],
      messageCount: 0,
      deliveryCounts: {
        queued: 0,
        delivering: 0,
        delivered: 0,
        completed: 0,
        failed: 0,
        unconfirmed: 0,
      },
    });

    expect(output).toContain(
      [
        "DELIVERY GUARANTEES",
        "AGENT  ACCEPTANCE  RECEIPT EVIDENCE  AUTO TARGET ACK  AUTO COMPLETION  AUTO RETRY  MANUAL RETRANSMIT",
        "",
        "",
        "PAIRS",
      ].join("\n"),
    );
  });

  it("formats doctor checks with aligned component and status columns", () => {
    const output = formatDoctor({
      checks: [
        { name: "node", status: "ok", detail: "v22.4.0" },
        { name: "codex", status: "error", detail: "not found" },
      ],
    });

    expect(output).toBe(
      [
        "COMPONENT  STATUS",
        "node       ok (v22.4.0)",
        "codex      error (not found)",
        "",
      ].join("\n"),
    );
  });
});
