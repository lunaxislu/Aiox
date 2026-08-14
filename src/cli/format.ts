import type { StatusResponse } from "../daemon/api.js";
import { messageDeliveryStatuses } from "../core/deliveries.js";
import type {
  DaemonStatusInfo,
  DoctorResult,
} from "./invocation.js";

export function formatDaemonStatus(info: DaemonStatusInfo): string {
  if (!info.running) {
    return formatKeyValues([
      ["COMPONENT", "daemon"],
      ["STATUS", "not running"],
      ["SOCKET", info.socketPath],
      ["DB", info.dbPath],
      ["VERSION", info.version],
    ]);
  }

  return formatKeyValues([
    ["COMPONENT", "daemon"],
    ["PID", String(info.pid)],
    ["SOCKET", info.socketPath],
    ["DB", info.dbPath],
    ["STARTED", info.startedAt],
    ["UPTIME", formatUptime(info.startedAt)],
    ["VERSION", info.version],
  ]);
}

export function formatStatus(response: StatusResponse): string {
  const agentNames = new Map(response.agents.map((agent) => [agent.id, agent.name]));
  const sections = [
    [
      "DAEMON",
      formatKeyValues([
        ["STARTED", response.daemon.startedAt],
        ["UPTIME", formatUptime(response.daemon.startedAt)],
      ]).trimEnd(),
    ],
    ["AGENTS", formatTable(["NAME", "KIND", "STATUS"], response.agents.map((agent) => [
      agent.name,
      agent.kind,
      agent.status,
    ]))],
    [
      "DELIVERY GUARANTEES",
      formatTable(
        [
          "AGENT",
          "ACCEPTANCE",
          "RECEIPT EVIDENCE",
          "AUTO TARGET ACK",
          "AUTO COMPLETION",
          "AUTO RETRY",
          "MANUAL RETRANSMIT",
        ],
        response.agents.map((agent) => [
          agent.name,
          agent.deliveryDiagnostics.acceptanceEvidence,
          agent.deliveryDiagnostics.targetReceiptEvidence,
          agent.deliveryDiagnostics.automaticTargetAck ? "automatic" : "none",
          agent.deliveryDiagnostics.automaticCompletion ? "automatic" : "none",
          agent.deliveryDiagnostics.automaticRetry,
          formatManualRetransmit(agent.deliveryDiagnostics.manualRetransmit),
        ]),
      ),
    ],
    ["PAIRS", formatTable(["NAME", "STATUS"], response.pairs.map((pair) => [
      pair.name,
      pair.status,
    ]))],
    [
      "ROUTES",
      response.routes
        .map(
          (route) =>
            `${agentName(agentNames, route.sourceAgentId)} -> ${agentName(
              agentNames,
              route.targetAgentId,
            )}`,
        )
        .join("\n"),
    ],
    [
      "DELIVERIES",
      [
        `messages=${response.messageCount}`,
        ...messageDeliveryStatuses.map(
          (status) => `${status}=${response.deliveryCounts[status] ?? 0}`,
        ),
      ].join(" "),
    ],
  ];

  return `${sections
    .map(([heading, body]) => `${heading}\n${body}`)
    .join("\n\n")}\n`;
}

function formatManualRetransmit(
  diagnostics: StatusResponse["agents"][number]["deliveryDiagnostics"]["manualRetransmit"],
): string {
  return [
    diagnostics.eligibleStatus,
    "confirm_duplicate_risk",
    diagnostics.requiredReadiness,
    diagnostics.dispatch,
    `late_transport=${diagnostics.lateTransportOutcomeResolution}`,
  ].join("; ");
}

export function formatDoctor(result: DoctorResult): string {
  const rows = result.checks.map((check) => [
    check.name,
    formatDoctorStatus(check),
  ]);

  return formatTable(["COMPONENT", "STATUS"], rows);
}

function formatKeyValues(rows: [string, string][]): string {
  const keyWidth = Math.max(...rows.map(([key]) => key.length));
  return `${rows
    .map(([key, value]) => `${key.padEnd(keyWidth)}  ${value}`)
    .join("\n")}\n`;
}

function formatTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const lines = [
    headers.map((header, index) => header.padEnd(widths[index])).join("  ").trimEnd(),
    ...rows.map((row) =>
      row.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd(),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function formatDoctorStatus(check: DoctorResult["checks"][number]): string {
  return check.detail ? `${check.status} (${check.detail})` : check.status;
}

function agentName(agentNames: Map<string, string>, id: string): string {
  return agentNames.get(id) ?? `<missing:${id}>`;
}

function formatUptime(startedAt: string): string {
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) {
    return "unknown";
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  return `${Math.floor(elapsedHours / 24)}d`;
}
