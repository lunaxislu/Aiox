import { describe, expect, it } from "vitest";

import { parseCli } from "../../../src/cli/parse.js";

describe("CLI parser", () => {
  it("parses daemon start", () => {
    expect(parseCli(["daemon", "start"])).toEqual({
      kind: "daemon-start",
    });
  });
});
