const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports,
    require(name) { assert.ok(name in mocks, name); return mocks[name]; },
  });
  return exports;
}
const money = load("lib/money.ts");
const scopeFunctions = load("lib/application-scope.ts");
const proposals = load("lib/proposals.ts", { "@/lib/money": money });
const { scoreLead } = load("lib/leads/score.ts");
const baseLead = { stage: "new", email_status: "valid", last_contacted_at: null, last_replied_at: null };

test("lead temperature can be manually set and returned to automatic", () => {
  for (const temperature of ["hot", "warm", "cold"]) {
    const score = scoreLead({ ...baseLead, temperature_override: temperature }, []);
    assert.equal(score.temperature, temperature);
    assert.match(score.reasons[0], /manually/);
  }
  assert.equal(scoreLead({ ...baseLead, temperature_override: null }, []).temperature, "cold");
});

function form(overrides = {}) {
  const data = new FormData();
  Object.entries({ title: "Website", description: "Design and build. Two revisions.", amount: "15000.50", currency: "PHP", kind: "quote", ...overrides })
    .forEach(([key, value]) => data.set(key, value));
  return data;
}

test("valid proposals preserve their exact quoted currency and amount", () => {
  const parsed = proposals.parseProposal(form());
  assert.equal(parsed.amount, 15000.5);
  assert.equal(parsed.currency, "PHP");
  const email = proposals.proposalEmail({ ...parsed, id: "reference" }, "Customer");
  assert.match(email.body, /₱15,000\.50 \(PHP\)/);
  assert.match(email.body, /Please reply.*accept/);
  assert.equal(email.subject, "Quote: Website");
});

test("invalid prices, currencies, dates and missing terms are rejected", () => {
  for (const change of [{ amount: "Infinity" }, { amount: "0" }, { amount: "-1" }, { amount: "1.001" },
    { amount: "10000000000" }, { currency: "EUR" }, { description: "" }, { title: "" },
    { valid_until: "2026-02-30" }, { valid_until: "not-a-date" }, { kind: "invoice" }]) {
    assert.equal(proposals.parseProposal(form(change)), null);
  }
});

const leadId = "11111111-1111-4111-8111-111111111111";
function harness({ cookie = "A", recipientScope = "A", proposalScope = "A", owner = "owner", status = "draft", providerFails = false, claimFails = false } = {}) {
  const sent = [];
  const writes = [];
  const rpcs = [];
  const rows = {
    proposals: [{ id: "proposal", owner_id: "owner", application_id: proposalScope, lead_id: leadId, client_id: null,
      status, title: "Website", description: "The scope", amount: 100, currency: "USD", kind: "proposal", valid_until: null }],
    leads: [{ id: leadId, owner_id: owner, application_id: recipientScope, name: "Lead", email: "lead@example.test", email_status: "valid" }],
  };
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    from(table) {
      let filters = [];
      let update;
      let insert;
      let single = false;
      return {
        select() { return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        filter(key, operator, value) { assert.ok(["eq", "is"].includes(operator)); return this.eq(key, value); },
        update(value) { update = value; return this; },
        insert(value) { insert = value; return this; },
        maybeSingle() { single = true; return this; },
        then(resolve, reject) {
          let matches = (rows[table] ?? []).filter((row) => filters.every(([key, value]) => row[key] === value));
          if (claimFails && update?.status === "sending") matches = [];
          if (insert) writes.push({ table, value: insert });
          if (update && matches.length) {
            writes.push({ table, value: update });
            matches.forEach((row) => Object.assign(row, update));
          }
          return Promise.resolve({ data: single ? matches[0] ? { ...matches[0] } : null : matches, error: null }).then(resolve, reject);
        },
      };
    },
    rpc: async (name, params) => { rpcs.push({ name, params }); return { data: "project", error: null }; },
  };
  const actions = load("app/(app)/proposals/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect() { throw new Error("Redirect"); } },
    "@/lib/supabase/server": { createClient: () => db },
    "@/lib/applications": { getActiveApplicationId: () => cookie },
    "@/lib/application-scope": scopeFunctions,
    "@/lib/time": { philippineDate: () => "2026-09-29" },
    "@/lib/proposals": proposals,
    "@/lib/email/send": { sendEmail: async (message) => {
      sent.push(message);
      return providerFails ? { ok: false, error: "Unavailable" } : { ok: true, id: "message" };
    } },
  });
  return { actions, sent, writes, rows, rpcs };
}

test("saving a quote records a draft without emailing anyone", async () => {
  const h = harness();
  const result = await h.actions.createProposal("A", {}, form({ recipient: `lead:${leadId}` }));
  assert.equal(result.success, true);
  assert.equal(h.sent.length, 0);
  assert.equal(h.writes[0].value.application_id, "A");
});

test("saving a quote fails for an out-of-scope recipient or stale form", async () => {
  for (const options of [{ recipientScope: "B" }, { cookie: "B" }, { owner: "other" }]) {
    const h = harness(options);
    assert.equal((await h.actions.createProposal("A", {}, form({ recipient: `lead:${leadId}` }))).success, false);
    assert.equal(h.writes.length, 0);
  }
});

test("sending claims the draft, sends once, logs it and records sent status", async () => {
  const h = harness();
  await h.actions.sendProposal("A", "proposal");
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, "lead@example.test");
  assert.equal(h.writes[0].value.status, "sending");
  assert.equal(h.rows.proposals[0].status, "sent");
  assert.ok(h.writes.some((write) => write.table === "email_messages"));
  await assert.rejects(h.actions.sendProposal("A", "proposal"));
  assert.equal(h.sent.length, 1);
});

for (const options of [{ cookie: "B" }, { recipientScope: "B" }, { proposalScope: "B" },
  { owner: "other" }, { status: "accepted" }, { claimFails: true }]) {
  test(`sending rejects invalid state without external delivery: ${JSON.stringify(options)}`, async () => {
    const h = harness(options);
    await assert.rejects(h.actions.sendProposal("A", "proposal"));
    assert.equal(h.sent.length, 0);
  });
}

test("provider rejection restores the draft instead of marking it sent", async () => {
  const h = harness({ providerFails: true });
  await assert.rejects(h.actions.sendProposal("A", "proposal"));
  assert.equal(h.rows.proposals[0].status, "draft");
  assert.equal(h.writes.some((write) => write.table === "email_messages"), false);
});

test("acceptance delegates project creation to the atomic database function", async () => {
  const h = harness({ status: "sent" });
  assert.equal(await h.actions.acceptProposal("A", "proposal"), "project");
  assert.equal(h.rpcs[0].name, "accept_proposal");
  assert.equal(h.rpcs[0].params.proposal_id, "proposal");
  assert.equal(h.writes.length, 0);
});

test("acceptance from a stale application view never calls the database function", async () => {
  const h = harness({ cookie: "B", status: "sent" });
  await assert.rejects(h.actions.acceptProposal("A", "proposal"));
  assert.equal(h.rpcs.length, 0);
});
