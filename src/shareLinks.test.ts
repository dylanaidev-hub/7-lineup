import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const maybeSingle = vi.fn();

vi.mock("./lib/supabaseClient", () => ({
  get supabase() {
    return mockSupabase;
  },
  isSupabaseConfigured: true,
}));

let mockSupabase: unknown = null;

const withClient = () => {
  mockSupabase = {
    from: () => ({
      insert,
      select: () => ({ eq: () => ({ maybeSingle }) }),
    }),
  };
};

import { buildLineupUrlFromPayload, createShortCode, createShortShareLink, resolveShortShareLink } from "./shareLinks";
import { buildSharePayload, decodeSharePayload } from "./lineupShare";
import { formationsBySize, isFormationKey } from "./formationPresets";
import { isPitchSize } from "./appRouting";
import type { FormationKey } from "./formationTypes";

const validators = {
  isPitchSize,
  isFormationKey,
  hasFormation: (pitchSize: 5 | 7 | 11 | "custom", formation: FormationKey) =>
    Boolean(formationsBySize[pitchSize][formation]),
};

const payload = () =>
  buildSharePayload(
    7,
    "2-3-1" as FormationKey,
    0,
    [{ id: 1, starterName: "Dũng", substituteName: "", extraNames: [], x: 50, y: 90, onPitch: true }],
    [],
    [],
    [],
    "LINEUP",
  );

beforeEach(() => {
  mockSupabase = null;
  insert.mockReset();
  maybeSingle.mockReset();
});

describe("createShortCode", () => {
  it("produces 8 url-safe characters", () => {
    expect(createShortCode()).toMatch(/^[a-z0-9]{8}$/);
  });

  it("does not repeat itself", () => {
    const codes = new Set(Array.from({ length: 1000 }, () => createShortCode()));
    expect(codes.size).toBe(1000);
  });
});

describe("buildLineupUrlFromPayload", () => {
  it("rebuilds a link the existing decoder understands", () => {
    const source = payload();
    const url = buildLineupUrlFromPayload(source, "https://doihinhsanco.pro.vn");

    expect(url.pathname).toBe("/app/lineup");
    expect(url.searchParams.get("pitch")).toBe("7");

    const decoded = decodeSharePayload<FormationKey>(url.searchParams.get("lineup")!, validators);
    expect(decoded!.players[0].starterName).toBe("Dũng");
  });
});

describe("createShortShareLink", () => {
  it("returns null when supabase is not configured, so the caller falls back", async () => {
    expect(await createShortShareLink(payload(), "https://doihinhsanco.pro.vn/app/lineup")).toBeNull();
  });

  it("returns null when the insert fails", async () => {
    withClient();
    insert.mockResolvedValue({ error: new Error("nope") });

    expect(await createShortShareLink(payload(), "https://doihinhsanco.pro.vn/app/lineup")).toBeNull();
  });

  it("returns the short url on success", async () => {
    withClient();
    insert.mockResolvedValue({ error: null });

    const url = await createShortShareLink(payload(), "https://doihinhsanco.pro.vn/app/lineup");

    expect(url!.pathname).toMatch(/^\/s\/[a-z0-9]{8}$/);
    expect(url!.search).toBe("");
  });
});

describe("resolveShortShareLink", () => {
  it("returns null when supabase is not configured", async () => {
    expect(await resolveShortShareLink("abcd1234", validators)).toBeNull();
  });

  it("returns null on a select error", async () => {
    withClient();
    maybeSingle.mockResolvedValue({ data: null, error: new Error("nope") });

    expect(await resolveShortShareLink("abcd1234", validators)).toBeNull();
  });

  it("returns null when the code is unknown or expired", async () => {
    withClient();
    maybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await resolveShortShareLink("abcd1234", validators)).toBeNull();
  });

  it("returns null when the stored row is not a lineup", async () => {
    withClient();
    maybeSingle.mockResolvedValue({ data: { payload: { formation: "9-9-9" } }, error: null });

    expect(await resolveShortShareLink("abcd1234", validators)).toBeNull();
  });

  it("validates and returns a stored lineup", async () => {
    withClient();
    maybeSingle.mockResolvedValue({ data: { payload: payload() }, error: null });

    const resolved = await resolveShortShareLink("abcd1234", validators);
    expect(resolved!.players[0].starterName).toBe("Dũng");
  });
});
