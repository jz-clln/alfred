const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");

// Exercise the actual Supabase query builder used by each page, intercepting
// fetch to verify its HTTP filters without connecting to a real database.
async function renderPage(page, applicationId) {
  const requests = [];
  const client = createClient("https://example.supabase.co", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, options) => {
      requests.push(new URL(url));
      return new Response(options?.method === "HEAD" ? null : "[]", {
        status: 200, headers: { "Content-Type": "application/json", "Content-Range": "*/0" },
      });
    } },
  });
  const mocks = {
    "@/lib/supabase/server": { createClient: () => client },
    "@/lib/applications": { getActiveApplicationId: () => applicationId },
    "@/lib/time": { philippineDate: () => "2026-10-01" },
    "@/lib/currency-preference": { getDisplayCurrency: () => "PHP" },
    "@/lib/exchange-rates": { getExchangeRate: async () => null },
    "@/components/Money": { Money: "money", ExchangeRateNote: "exchange-rate-note" },
    "@/lib/leads/score": { scoreLead() { throw new Error("No leads expected in query test"); } },
    "./actions": { sendEmails: async (scope) => ({ success: true, scope }) },
    "./ComposeForm": { ComposeForm: "compose-form" },
    "./AddClientForm": { AddClientForm: "add-client-form" },
    "./AddLeadForm": { AddLeadForm: "add-lead-form" },
    "./AddProjectForm": { AddProjectForm: "add-project-form" },
    "./LeadActions": { LeadActions: "lead-actions" },
    "../leads/AddLeadForm": { AddLeadForm: "add-lead-form" },
    "./RepliesPanel": { RepliesPanel: "replies-panel" },
    "./SentPanel": { SentPanel: "sent-panel" },
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "next/link": { default: "a" },
  };
  const filename = path.join(__dirname, `../app/(app)/${page}/page.tsx`);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    URLSearchParams,
    require(name) {
      if (name === "@/lib/application-scope" || name === "@/lib/money") {
        const scope = {};
        vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, `../${name.slice(2)}.ts`), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.CommonJS },
        }).outputText, { exports: scope });
        return scope;
      }
      if (name === "react/jsx-runtime") return require(name);
      if (name === "lucide-react") return new Proxy({}, { get: (_, key) => key });
      if (name.startsWith("@/components/ui/")) return new Proxy({}, { get: (_, key) => key });
      assert.ok(name in mocks, `Unexpected dependency: ${name}`);
      return mocks[name];
    },
  }, { filename });
  const tree = await exports.default({ searchParams: { to: "lead:outside" } });
  return { requests, tree };
}

function findElement(tree, type) {
  if (!tree || typeof tree !== "object") return undefined;
  if (tree.type === type) return tree;
  const values = Array.isArray(tree) ? tree : Object.values(tree.props ?? {});
  for (const value of values) {
    const found = findElement(value, type);
    if (found) return found;
  }
}

for (const page of ["outreach", "dashboard", "insights", "clients", "leads", "projects"]) {
  for (const scope of ["A", "unassigned"]) {
  test(`${page} scopes database requests to ${scope}`, async () => {
    const { requests, tree } = await renderPage(page, scope);
    const expected = scope === "unassigned" ? "is.null" : "eq.A";
    assert.ok(requests.length > 0);
    for (const request of requests) {
      const table = request.pathname.split("/").pop();
      const params = request.searchParams;
      if (table === "sequences") continue; // Templates are shared across applications.
      if (page === "outreach" && ["inbound_emails", "google_tokens"].includes(table)) continue;
      if (table === "applications") {
        if (page === "dashboard" && params.has("id")) assert.equal(params.get("id"), "eq.A");
        continue;
      }
      if (["clients", "leads"].includes(table)) {
        assert.equal(params.get("application_id"), expected);
      } else if (["projects", "meetings"].includes(table)) {
        assert.equal(params.get("clients.application_id"), expected);
        if (!params.get("select").includes("clients!inner")) assert.equal(params.get("clients"), "not.is.null");
      } else if (table === "email_messages") {
        if (page === "leads") continue; // History is matched to already-scoped leads by ID.
        assert.equal(params.get("leads.application_id"), expected);
        if (page === "dashboard") assert.equal(params.get("leads"), "not.is.null");
        else {
          assert.equal(params.get("clients.application_id"), expected);
          assert.equal(params.get("or"), "(leads.not.is.null,clients.not.is.null)");
        }
      } else assert.fail(`Unexpected table ${table}`);
    }
    if (page === "outreach") {
      const compose = findElement(tree, "compose-form");
      assert.equal(compose.key, scope, "Switching applications must reset the compose form");
      assert.equal(typeof compose.props.sendAction, "function");
      assert.equal((await compose.props.sendAction({}, new FormData())).scope, scope);
    }
    if (page === "dashboard") {
      const form = findElement(tree, "add-lead-form");
      assert.ok(Array.isArray(form.props.applications));
      assert.equal(form.props.defaultApplicationId, scope === "unassigned" ? null : scope);
    }
    if (["clients", "leads"].includes(page) && scope === "unassigned") {
      const title = tree.props.children[0];
      const form = title.props.action.props.children;
      assert.equal(form.props.defaultApplicationId, null, "Unassigned must not be submitted as an application UUID");
    }
  });
  }

  test(`${page} keeps All applications unfiltered`, async () => {
    const { requests, tree } = await renderPage(page, null);
    if (page === "outreach") {
      const compose = findElement(tree, "compose-form");
      assert.equal(compose.key, "all");
      assert.equal((await compose.props.sendAction({}, new FormData())).scope, null);
    }
    for (const request of requests) {
      for (const key of request.searchParams.keys()) {
        assert.equal(key.includes("application_id"), false);
      }
      assert.equal(request.searchParams.has("or"), false);
    }
  });
}
