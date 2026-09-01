import { describe, expect, it } from "vitest";

import {
  applyHostRouteOperations,
  emptyHostRouteTopology,
  listDeclaredHostRouteEdges,
  type HostRouteOperation,
} from "../../../src/host/host-route-topology.js";

/**
 * `docs/specs/aiox-compose-contract.md` §"Mesh와 directed override의 관계"
 * (W6 Stage 6 revision 14 correction, Blocker 1): `directed` narrows the pair
 * it names to exactly the declared direction(s); every pair it does not name
 * keeps the default bidirectional mesh; overlapping routes union their
 * per-route results so one route's narrowing can never delete an edge a
 * different route still declares.
 */

function edgesOf(members: string[], operations: HostRouteOperation[]) {
  const declared = new Set(members);
  const result = applyHostRouteOperations(emptyHostRouteTopology(), operations, declared);
  if (!result.ok) {
    throw new Error(`expected route operations to apply cleanly: ${JSON.stringify(result.issues)}`);
  }
  return sortEdges(listDeclaredHostRouteEdges(result.topology));
}

function sortEdges(edges: Array<{ sourceName: string; targetName: string }>) {
  return [...edges].sort((a, b) =>
    `${a.sourceName}->${a.targetName}`.localeCompare(`${b.sourceName}->${b.targetName}`),
  );
}

describe("listDeclaredHostRouteEdges (pair-local directed override)", () => {
  it("removes the reverse edge when only one direction of a pair is declared", () => {
    const edges = edgesOf(
      ["A", "B"],
      [
        { op: "add", name: "g", members: ["A", "B"] },
        { op: "direct", name: "g", from: "A", to: ["B"] },
      ],
    );

    expect(edges).toEqual([{ sourceName: "A", targetName: "B" }]);
  });

  it("keeps both directions when each is declared explicitly", () => {
    const edges = edgesOf(
      ["A", "B"],
      [
        { op: "add", name: "g", members: ["A", "B"] },
        { op: "direct", name: "g", from: "A", to: ["B"] },
        { op: "direct", name: "g", from: "B", to: ["A"] },
      ],
    );

    expect(edges).toEqual(
      sortEdges([
        { sourceName: "A", targetName: "B" },
        { sourceName: "B", targetName: "A" },
      ]),
    );
  });

  it("leaves a pair not mentioned in directed as full bidirectional mesh", () => {
    // members=[A,B,C], directed=[A->B] -- the aiox-compose-contract example.
    const edges = edgesOf(
      ["A", "B", "C"],
      [
        { op: "add", name: "g", members: ["A", "B", "C"] },
        { op: "direct", name: "g", from: "A", to: ["B"] },
      ],
    );

    expect(edges).toEqual(
      sortEdges([
        { sourceName: "A", targetName: "B" },
        { sourceName: "A", targetName: "C" },
        { sourceName: "C", targetName: "A" },
        { sourceName: "B", targetName: "C" },
        { sourceName: "C", targetName: "B" },
      ]),
    );
    expect(edges).not.toContainEqual({ sourceName: "B", targetName: "A" });
  });

  it("unions overlapping routes so one route's narrowing never deletes an edge another route requires", () => {
    const declared = new Set(["A", "B"]);
    const narrowed = applyHostRouteOperations(emptyHostRouteTopology(), [
      { op: "add", name: "narrow", members: ["A", "B"] },
      { op: "direct", name: "narrow", from: "A", to: ["B"] },
    ], declared);
    if (!narrowed.ok) throw new Error("expected first route to apply cleanly");

    const both = applyHostRouteOperations(narrowed.topology, [
      { op: "add", name: "mesh", members: ["A", "B"] },
    ], declared);
    if (!both.ok) throw new Error("expected second route to apply cleanly");

    // "narrow" alone would only produce A->B; "mesh" alone requires both
    // directions. The union across routes must keep B->A even though the
    // "narrow" route's own override excludes it.
    expect(sortEdges(listDeclaredHostRouteEdges(both.topology))).toEqual(
      sortEdges([
        { sourceName: "A", targetName: "B" },
        { sourceName: "B", targetName: "A" },
      ]),
    );
  });

  it("does not duplicate an edge declared identically by more than one route", () => {
    const declared = new Set(["A", "B"]);
    const first = applyHostRouteOperations(emptyHostRouteTopology(), [
      { op: "add", name: "one", members: ["A", "B"] },
    ], declared);
    if (!first.ok) throw new Error("expected first route to apply cleanly");
    const second = applyHostRouteOperations(first.topology, [
      { op: "add", name: "two", members: ["A", "B"] },
    ], declared);
    if (!second.ok) throw new Error("expected second route to apply cleanly");

    expect(sortEdges(listDeclaredHostRouteEdges(second.topology))).toEqual(
      sortEdges([
        { sourceName: "A", targetName: "B" },
        { sourceName: "B", targetName: "A" },
      ]),
    );
  });
});
