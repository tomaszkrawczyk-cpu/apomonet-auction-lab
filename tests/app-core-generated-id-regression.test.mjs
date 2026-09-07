import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const KEY = "apomonet_state_v2";

async function runtime(initialState = null) {
  const completeSource = await readFile(new URL("../app-core.js", import.meta.url), "utf8");
  const source = `${completeSource.split("window.ApoMonet=ApoMonet;")[0]}this.ApoMonet=ApoMonet;`;
  const values = new Map();
  if (initialState) values.set(KEY, JSON.stringify(initialState));
  const localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  const context = {
    window: null,
    localStorage,
    document: { getElementById: () => null },
    addEventListener: () => {},
    console,
  };
  context.window = context;
  vm.runInNewContext(source, context);
  context.ApoMonet.seed();
  return { ApoMonet: context.ApoMonet, state: () => JSON.parse(values.get(KEY)) };
}

test("upsert generates and retains an id when the caller supplies id undefined", async () => {
  const { ApoMonet } = await runtime();
  const coin = ApoMonet.upsertCoin({
    id: undefined,
    title: "Jan III Sobieski 1685",
    obverseImage: "data:image/jpeg;base64,AA",
    reverseImage: "data:image/jpeg;base64,BB",
  });

  assert.match(coin.id, /^coin_/);
  assert.equal(ApoMonet.getCoin(coin.id)?.title, "Jan III Sobieski 1685");
});

test("seed repairs a legacy coin whose undefined id vanished during JSON storage", async () => {
  const { state } = await runtime({
    coins: [{ title: "Zapis uszkodzony", obverseImage: "a", reverseImage: "b" }],
    albums: [{ id: "album-test", name: "Test" }],
    watchlist: [], events: [], settings: {}, history: [],
  });
  const stored = state();
  assert.match(stored.coins[0].id, /^coin_/);
  assert.equal(stored.coins[0].title, "Zapis uszkodzony");
});
