const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, ...globals,
    require(name) { assert.ok(name in mocks, name); return mocks[name]; },
  });
  return exports;
}

const money = load("lib/money.ts");
const rate = { base: "PHP", quote: "USD", date: "2026-09-29", rate: 0.02 };

test("PHP converts to USD by multiplying, USD to PHP by dividing", () => {
  assert.equal(money.convertMoney(100, "PHP", "USD", rate), 2);
  assert.equal(money.convertMoney(2, "USD", "PHP", rate), 100);
});

test("existing currency defaults to USD and formatting distinguishes pesos", () => {
  assert.equal(money.ledgerCurrency(undefined), "USD");
  assert.match(money.formatMoney(1234.5, "PHP"), /₱1,234\.50/);
  assert.match(money.formatMoney(1234.5, "USD"), /\$1,234\.50/);
});

test("mixed-currency totals convert before summing", () => {
  const rows = [{ amount: 100, currency: "PHP" }, { amount: 50, currency: "USD" }];
  assert.equal(money.sumMoney(rows, "PHP", rate), 2600);
  assert.equal(money.sumMoney(rows, "USD", rate), 52);
  assert.equal(money.sumMoney(rows, "PHP", null), null);
});

test("same-currency amounts, zeros and credits work without a rate", () => {
  assert.equal(money.convertMoney(50, "PHP", "PHP", null), 50);
  assert.equal(money.convertMoney(0, "USD", "PHP", null), 0);
  assert.equal(money.convertMoney(-100, "PHP", "USD", rate), -2);
});

test("missing rates show original currency rather than an invented conversion", () => {
  assert.equal(money.convertMoney(20, "USD", "PHP", null), null);
  assert.equal(money.moneyLabel(20, "USD", "PHP", null), money.formatMoney(20, "USD"));
  assert.match(money.moneyLabel(20, "USD", "PHP", rate), /^≈ /);
});

test("invalid or wrong-direction rates are rejected", () => {
  for (const invalid of [null, {}, { ...rate, base: "USD" }, { ...rate, quote: "EUR" },
    { ...rate, rate: 0 }, { ...rate, rate: -1 }, { ...rate, rate: Infinity },
    { ...rate, rate: "0.02" }, { ...rate, date: "invalid" }]) {
    assert.equal(money.parseExchangeRate(invalid), null);
  }
  assert.equal(money.parseExchangeRate(rate).rate, 0.02);
});

test("Frankfurter request uses the public pair endpoint, a timeout and an hourly cache", async () => {
  let request;
  const rates = load("lib/exchange-rates.ts", {
    react: { cache: (fn) => fn }, "@/lib/money": money,
  }, {
    AbortSignal,
    fetch: async (url, options) => { request = { url, options }; return { ok: true, json: async () => rate }; },
  });
  assert.equal((await rates.getExchangeRate()).rate, 0.02);
  assert.equal(request.url, "https://api.frankfurter.dev/v2/rate/php/usd");
  assert.equal(request.options.next.revalidate, 3600);
  assert.ok(request.options.signal instanceof AbortSignal);
});

for (const failure of ["http", "network", "malformed"]) {
  test(`Frankfurter ${failure} failure returns unavailable`, async () => {
    const rates = load("lib/exchange-rates.ts", {
      react: { cache: (fn) => fn }, "@/lib/money": money,
    }, {
      AbortSignal,
      fetch: async () => {
        if (failure === "network") throw new Error("Offline");
        return { ok: failure !== "http", json: async () => ({}) };
      },
    });
    assert.equal(await rates.getExchangeRate(), null);
  });
}

function actionHarness(currency = "PHP") {
  const writes = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: { currency }, error: null }),
        insert: async (value) => { writes.push({ table, value }); return { error: null }; },
      };
    },
  };
  const actions = load("app/(app)/clients/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "next/navigation": { redirect() { throw new Error("Redirect"); } },
    "@/lib/supabase/server": { createClient: () => db },
    "@/lib/time": { philippineDate: () => "2026-09-29" },
    "@/lib/money": money,
  });
  return { actions, writes };
}

function entry(currency, amount = "500") {
  const data = new FormData();
  data.set("currency", currency);
  data.set("amount", amount);
  data.set("type", "invoice");
  return data;
}

test("ledger saves native PHP without converting the recorded value", async () => {
  const { actions, writes } = actionHarness();
  assert.equal((await actions.addBalanceEntry("client", {}, entry("PHP"))).success, true);
  assert.equal(writes[0].value.amount, 500);
  assert.equal(writes[0].value.currency, "PHP");
});

test("ledger rejects a stale form with the wrong client currency", async () => {
  const { actions, writes } = actionHarness("USD");
  assert.equal((await actions.addBalanceEntry("client", {}, entry("PHP"))).success, false);
  assert.equal(writes.length, 0);
});

test("ledger rejects unsupported currencies and non-finite amounts", async () => {
  const { actions, writes } = actionHarness();
  for (const form of [entry("EUR"), entry("PHP", "Infinity"), entry("PHP", "-10"), entry("PHP", "NaN")]) {
    assert.equal((await actions.addBalanceEntry("client", {}, form)).success, false);
  }
  assert.equal(writes.length, 0);
});

test("new client saves the selected currency", async () => {
  const { actions, writes } = actionHarness();
  const form = new FormData();
  form.set("name", "Peso client");
  form.set("currency", "PHP");
  assert.equal((await actions.createClientRecord({}, form)).success, true);
  assert.equal(writes[0].value.currency, "PHP");
});
