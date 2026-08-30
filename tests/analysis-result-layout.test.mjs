import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(file, "utf8");

test("Stage 1 presents a concise result before collapsed evidence", () => {
  const page = read("analyze.html");
  const result = page.indexOf('id="resultTitle"');
  const facts = page.indexOf('id="facts"');
  const disclaimer = page.indexOf('id="resultDisclaimer"');
  const why = page.indexOf('id="resultWhy"');
  const sources = page.indexOf('id="recognitionEvidence"');
  const edit = page.indexOf('id="edit"');
  const save = page.indexOf('id="save"');
  assert.ok(result >= 0 && facts > result && disclaimer > facts && why > disclaimer);
  assert.ok(sources > why, "source candidates must start inside the collapsed explanation");
  assert.ok(edit > why && save > edit, "edit and save remain explicit pre-save actions");
});

test("correction updates the working analysis and does not silently save a coin", () => {
  const source = read("analysis-inline-correction.js");
  assert.match(source, /apo:analysis-corrected/);
  assert.match(source, /rawAI/);
  assert.match(source, /input\.select\(\)/);
  assert.match(source, /apoNominalSuggestions/);
  assert.match(source, /denominationSuggestions/);
  assert.match(source, /canonicalDenomination/);
  assert.doesNotMatch(source, /ApoMonet\?\.upsertCoin|ApoMonet\.upsertCoin/);
  assert.doesNotMatch(source, /location\.href\s*=\s*['"]analyze\.html/);
});

test("result presentation supports all current languages without mutating identity", () => {
  const source = read("analysis-result-view.js");
  let language = "pl";
  const sandbox = {
    window: { ApoLanguageRegistry: { current: () => language } },
    location: { pathname: "/analyze.html" },
    localStorage: { getItem: () => language },
    document: {
      readyState: "loading",
      addEventListener() {},
      getElementById() { return null; },
      body: {},
    },
    MutationObserver: class { observe() {} },
    addEventListener() {},
    setTimeout,
  };
  vm.runInNewContext(source, sandbox, { filename: "analysis-result-view.js" });
  const view = sandbox.window.ApoAnalysisResultView;
  const analysis = {
    country: "Polska",
    ruler: "Zygmunt II August",
    year: "1551",
    nominal: "Dukat",
    mint: "Gdańsk",
    metal: "Złoto",
    grade: "xf",
    recognition: { status: "confirmed-candidate", observations: { portrait: "popiersie króla" } },
    confidence: 88,
  };
  const original = JSON.stringify(analysis);
  for (const code of ["pl", "en", "de", "fr"]) {
    language = code;
    const rows = view.rows(analysis);
    assert.equal(rows.length, 9);
    assert.ok(rows.every(([label]) => label && typeof label === "string"));
  }
  assert.equal(JSON.stringify(analysis), original);
  language = "de";
  assert.equal(view.stageOneState(analysis).label, "Typ bestimmt");
});

test("Stage 2 distinguishes an established variety from an unresolved one", () => {
  const source = read("analysis-result-view.js");
  assert.match(source, /Odmiana potwierdzona/);
  assert.match(source, /Typ ustalony — odmiana nierozstrzygnięta/);
  assert.match(source, /confidence >= 80 && diagnostics\.length >= 2/);
  assert.match(read("stage2-literature-request.js"), /compact analysis screen renders Stage 2 itself/);
});

test("dynamic translation includes the new identity fields and refreshed cache", () => {
  const client = read("analysis-content-i18n.js");
  const api = read("api/translate-analysis.js");
  for (const field of ["issuer", "depictedPerson"]) {
    assert.match(client, new RegExp(`\\"${field}\\"`));
    assert.match(api, new RegExp(`\\"${field}\\"`));
  }
  assert.match(client, /translation_cache_v5/);
});
