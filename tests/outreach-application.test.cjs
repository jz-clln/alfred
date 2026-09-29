const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the real server action with an in-memory database and email transport.
// No network calls, credentials, or external test runner are needed.
function setup({ cookie = "A", queryError = false, unavailable = false } = {}) {
  const sent = [];
  const writes = [];
  const records = {
    applications: unavailable ? [] : [{ id: "A", owner_id: "owner" }, { id: "B", owner_id: "owner" }],
    leads: [
      { id: "a", owner_id: "owner", application_id: "A", email: "a@example.test", name: "A" },
      { id: "b", owner_id: "owner", application_id: "B", email: "b@example.test", name: "B" },
      { id: "none", owner_id: "owner", application_id: null, email: "none@example.test", name: "None" },
      { id: "other", owner_id: "other", application_id: "A", email: "other@example.test", name: "Other owner" },
    ],
    clients: [
      { id: "ca", owner_id: "owner", application_id: "A", email: "ca@example.test", name: "Client A" },
      { id: "cb", owner_id: "owner", application_id: "B", email: "cb@example.test", name: "Client B" },
    ],
  };
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    from(table) {
      let rows = records[table] ?? [];
      let single = false;
      let mutation = false;
      const query = {
        select() { return this; },
        eq(key, value) { rows = rows.filter((row) => row[key] === value); return this; },
        filter(key, operator, value) { assert.ok(["eq", "is"].includes(operator)); return this.eq(key, value); },
        in(key, values) { rows = rows.filter((row) => values.includes(row[key])); return this; },
        maybeSingle() { single = true; return this; },
        insert(value) { mutation = true; writes.push({ table, value }); return this; },
        update(value) { mutation = true; writes.push({ table, value }); return this; },
        upsert(value) { mutation = true; writes.push({ table, value }); return this; },
        then(resolve, reject) {
          const failed = queryError && !mutation && ["leads", "clients"].includes(table);
          return Promise.resolve({ data: failed ? null : single ? rows[0] ?? null : rows, error: failed ? { message: "Unavailable" } : null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const mocks = {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect() { throw new Error("Redirect"); } },
    "@/lib/supabase/server": { createClient: () => db },
    "@/lib/applications": { getActiveApplicationId: () => cookie },
    "@/lib/email/send": {
      renderTemplate: (text) => text,
      sendEmail: async (message) => { sent.push(message); return { ok: true, id: "test" }; },
    },
  };
  const filename = path.join(__dirname, "../app/(app)/outreach/actions.ts");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "@/lib/application-scope") {
        const scope = {};
        vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/application-scope.ts"), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText, { exports: scope });
        return scope;
      }
      assert.ok(name in mocks, `Unexpected dependency: ${name}`); return mocks[name];
    },
  }, { filename });
  return {
    sent, writes,
    async send(picks, application = "A") {
      const form = new FormData();
      form.set("subject", "Hello");
      form.set("body", "Test message");
      picks.forEach((pick) => form.append("recipients", pick));
      return exports.sendEmails(application, { success: false, message: "" }, form);
    },
  };
}

for (const [name, recipients] of [
  ["a different application's lead", ["lead:b"]],
  ["a different application's client", ["client:cb"]],
  ["a mixed batch, before any allowed recipient is sent", ["lead:a", "client:ca", "lead:b"]],
  ["an unassigned recipient in an application-specific send", ["lead:none"]],
  ["another owner's recipient", ["lead:other"]],
  ["a deleted or unknown recipient", ["lead:missing"]],
  ["an invalid recipient type", ["unknown:a"]],
]) {
  test(`rejects ${name}`, async () => {
    const harness = setup();
    assert.equal((await harness.send(recipients)).success, false);
    assert.equal(harness.sent.length, 0);
    assert.equal(harness.writes.length, 0);
  });
}

test("sends only valid application A leads and clients", async () => {
  const harness = setup();
  assert.equal((await harness.send(["lead:a", "client:ca"])).success, true);
  assert.deepEqual(harness.sent.map((m) => m.to).sort(), ["a@example.test", "ca@example.test"]);
});

test("deduplicates recipients", async () => {
  const harness = setup();
  assert.equal((await harness.send(["lead:a", "lead:a"])).success, true);
  assert.equal(harness.sent.length, 1);
});

for (const cookie of ["B", null]) {
  test(`rejects an A draft after another tab switches to ${cookie ?? "All applications"}`, async () => {
    const harness = setup({ cookie });
    assert.equal((await harness.send(["lead:a"])).success, false);
    assert.equal(harness.sent.length, 0);
    assert.equal(harness.writes.length, 0);
  });
}

test("rejects a stale All applications draft after switching to A", async () => {
  const harness = setup();
  assert.equal((await harness.send(["lead:b"], null)).success, false);
  assert.equal(harness.sent.length, 0);
});

test("All applications includes assigned and unassigned recipients", async () => {
  const harness = setup({ cookie: null });
  assert.equal((await harness.send(["lead:a", "lead:b", "lead:none", "client:cb"], null)).success, true);
  assert.equal(harness.sent.length, 4);
});

test("Unassigned sends only to recipients without an application", async () => {
  const harness = setup({ cookie: "unassigned" });
  assert.equal((await harness.send(["lead:none"], "unassigned")).success, true);
  assert.equal(harness.sent.length, 1);
});

test("Unassigned rejects an entire batch containing an assigned recipient", async () => {
  const harness = setup({ cookie: "unassigned" });
  assert.equal((await harness.send(["lead:none", "lead:a"], "unassigned")).success, false);
  assert.equal(harness.sent.length, 0);
  assert.equal(harness.writes.length, 0);
});

for (const options of [{ queryError: true }, { unavailable: true }]) {
  test(`fails closed on ${options.queryError ? "recipient query errors" : "an unavailable application"}`, async () => {
    const harness = setup(options);
    assert.equal((await harness.send(["lead:a"])).success, false);
    assert.equal(harness.sent.length, 0);
    assert.equal(harness.writes.length, 0);
  });
}
