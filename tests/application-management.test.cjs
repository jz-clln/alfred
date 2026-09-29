const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function setup({ owner = "owner", active = "A", failure = false, renamedDuringDelete = false } = {}) {
  let application = { id: "A", name: "Application A", owner_id: owner };
  const mutations = [];
  const invalidations = [];
  const jar = {
    get: () => active ? { value: active } : undefined,
    set: (_, value) => { active = value; },
    delete: () => { active = null; },
  };
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    from(table) {
      assert.equal(table, "applications", "Actions must not delete clients or leads");
      const filters = [];
      let operation = "read";
      let update;
      return {
        select() { return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        update(value) { operation = "update"; update = value; return this; },
        delete() { operation = "delete"; return this; },
        async maybeSingle() {
          if (failure) return { data: null, error: { message: "Database unavailable" } };
          if (operation === "delete" && renamedDuringDelete) application.name = "Renamed";
          if (!application || !filters.every(([key, value]) => application[key] === value)) return { data: null, error: null };
          const result = { ...application };
          if (operation !== "read") mutations.push(operation);
          if (operation === "delete") application = null;
          if (operation === "update") Object.assign(application, update);
          return { data: result, error: null };
        },
      };
    },
  };
  const mocks = {
    "next/cache": { revalidatePath: (...args) => invalidations.push(args) },
    "next/navigation": { redirect() { throw new Error("Redirect"); } },
    "next/headers": { cookies: () => jar },
    "@/lib/supabase/server": { createClient: () => db },
    "@/lib/applications": { ACTIVE_APPLICATION_COOKIE: "alfred_active_application" },
    "@/lib/application-scope": { UNASSIGNED_APPLICATION: "unassigned" },
  };
  const filename = path.join(__dirname, "../app/(app)/applications/actions.ts");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports,
    require(name) { assert.ok(name in mocks, name); return mocks[name]; },
  });
  return {
    ...exports, mutations, invalidations,
    get application() { return application; },
    get active() { return active; },
  };
}

function form(key, value) {
  const data = new FormData();
  data.set(key, value);
  return data;
}

for (const confirmation of ["", "Application", "application a", "Application A "]) {
  test(`delete rejects non-exact confirmation ${JSON.stringify(confirmation)}`, async () => {
    const harness = setup();
    assert.equal((await harness.deleteApplication("A", {}, form("confirmation", confirmation))).success, false);
    assert.equal(harness.mutations.length, 0);
    assert.equal(harness.active, "A");
  });
}

test("confirmed deletion deletes only the application and switches to Unassigned", async () => {
  const harness = setup();
  assert.equal((await harness.deleteApplication("A", {}, form("confirmation", "Application A"))).success, true);
  assert.deepEqual(harness.mutations, ["delete"]);
  assert.equal(harness.active, "unassigned");
  assert.equal(harness.application, null);
  assert.equal(harness.invalidations.length, 1);
});

test("deleting an application does not change a different active view", async () => {
  const harness = setup({ active: "B" });
  assert.equal((await harness.deleteApplication("A", {}, form("confirmation", "Application A"))).success, true);
  assert.equal(harness.active, "B");
});

for (const options of [{ owner: "other" }, { failure: true }, { renamedDuringDelete: true }]) {
  test(`delete fails safely: ${JSON.stringify(options)}`, async () => {
    const harness = setup(options);
    assert.equal((await harness.deleteApplication("A", {}, form("confirmation", "Application A"))).success, false);
    assert.equal(harness.mutations.length, 0);
    assert.equal(harness.active, "A");
  });
}

test("rename saves a trimmed name without changing the application ID", async () => {
  const harness = setup();
  assert.equal((await harness.renameApplication("A", {}, form("name", "  New name  "))).success, true);
  assert.equal(harness.application.name, "New name");
  assert.equal(harness.application.id, "A");
});

test("rename rejects blank names and other owners", async () => {
  const harness = setup();
  assert.equal((await harness.renameApplication("A", {}, form("name", "  "))).success, false);
  assert.equal(harness.mutations.length, 0);
  const other = setup({ owner: "other" });
  assert.equal((await other.renameApplication("A", {}, form("name", "New"))).success, false);
  assert.equal(other.mutations.length, 0);
});

test("switcher allows Unassigned but rejects another owner's application", async () => {
  const harness = setup({ owner: "other" });
  await harness.setActiveApplication("unassigned");
  assert.equal(harness.active, "unassigned");
  await assert.rejects(harness.setActiveApplication("A"));
  assert.equal(harness.active, "unassigned");
});
