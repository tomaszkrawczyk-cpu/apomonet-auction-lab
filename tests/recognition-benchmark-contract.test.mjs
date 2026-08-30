import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { localReferenceCandidates } from "../lib/recognition-core.mjs";

const benchmark = JSON.parse(await readFile(
  new URL("../data/benchmarks/recognition-stage1-v1.json", import.meta.url),
  "utf8",
));

test("the frozen Stage 1 benchmark covers requested historical and risk families", () => {
  assert.ok(benchmark.cases.length >= 28);
  const categories = new Set(benchmark.cases.map((entry) => entry.category));
  for (const category of [
    "medieval",
    "prl-metal",
    "prl-pattern-design",
    "second-republic-mint",
    "third-republic-bullion",
    "heavy-gold",
    "negative-object",
    "required-abstention",
  ]) assert.ok(categories.has(category), `missing benchmark category: ${category}`);
});

test("every positive benchmark target exists in the rights-gated runtime catalogue", () => {
  const candidateIds = new Set(localReferenceCandidates().map((candidate) => candidate.id));
  for (const entry of benchmark.cases.filter((item) => item.targetId)) {
    assert.ok(candidateIds.has(entry.targetId), `missing benchmark target: ${entry.targetId}`);
  }
});

test("negative and ambiguous benchmark cases require abstention", () => {
  const abstentions = benchmark.cases.filter((entry) => entry.expectAbstain);
  assert.ok(abstentions.length >= 6);
  assert.ok(abstentions.some((entry) => entry.objectKind === "copy"));
  assert.ok(abstentions.some((entry) => entry.objectKind === "medal"));
  assert.ok(abstentions.some((entry) => entry.objectKind === "token"));
});
