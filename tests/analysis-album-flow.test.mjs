import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.type = "";
    this.onclick = null;
    this.classList = {
      values: new Set(["hidden"]),
      add: (value) => this.classList.values.add(value),
      remove: (value) => this.classList.values.delete(value),
      contains: (value) => this.classList.values.has(value),
    };
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = [...children]; }
}

async function runtime() {
  const source = await readFile(new URL("../analysis-album-flow.js", import.meta.url), "utf8");
  const document = { createElement: (tagName) => new Element(tagName) };
  const context = { window: null, document };
  context.window = context;
  vm.runInNewContext(source, context);
  return { flow: context.ApoAnalysisAlbumFlow, document };
}

test("save-and-choose-album opens, assigns, verifies and returns the same coin", async () => {
  const { flow, document } = await runtime();
  const coin = { id: "coin-current", albumIds: [] };
  const albums = [{ id: "album-royal", name: "Polska królewska", description: "Test" }];
  const store = {
    load: () => ({ albums }),
    getCoin: (id) => id === coin.id ? coin : null,
    assignCoinToAlbum(coinId, albumId) {
      assert.equal(coinId, coin.id);
      coin.albumIds.push(albumId);
      return coin;
    },
  };
  const list = new Element("div");
  const modal = new Element("div");
  let saved = null;
  let error = null;

  const opened = flow.open({
    coin,
    store,
    list,
    modal,
    documentRef: document,
    onSuccess: (value) => { saved = value; },
    onError: (value) => { error = value; },
  });

  assert.equal(opened, true);
  assert.equal(modal.classList.contains("hidden"), false);
  assert.equal(list.children.length, 1);
  assert.equal(list.children[0].dataset.id, "album-royal");
  list.children[0].onclick();
  assert.equal(error, null);
  assert.equal(saved.id, "coin-current");
  assert.deepEqual(coin.albumIds, ["album-royal"]);
  assert.equal(modal.classList.contains("hidden"), true);
});

test("album flow reports failed persistence instead of claiming success", async () => {
  const { flow, document } = await runtime();
  const list = new Element("div");
  const modal = new Element("div");
  let success = false;
  let error = null;
  flow.open({
    coin: { id: "coin-current" },
    store: {
      load: () => ({ albums: [{ id: "album-1", name: "Album" }] }),
      assignCoinToAlbum: () => ({ id: "coin-current", albumIds: [] }),
      getCoin: () => ({ id: "coin-current", albumIds: [] }),
    },
    list,
    modal,
    documentRef: document,
    onSuccess: () => { success = true; },
    onError: (value) => { error = value; },
  });
  list.children[0].onclick();

  assert.equal(success, false);
  assert.match(error.message, /Nie udało się potwierdzić/);
  assert.equal(modal.classList.contains("hidden"), false);
});

test("new-album assignment returns the freshly reloaded record", async () => {
  const { flow } = await runtime();
  const reloaded = { id: "coin-current", albumIds: ["album-new"] };
  const result = flow.assignAndVerify({
    coin: { id: "coin-current" },
    albumId: "album-new",
    store: {
      assignCoinToAlbum: () => ({ id: "coin-current", albumIds: ["album-new"] }),
      getCoin: () => reloaded,
    },
  });
  assert.equal(result, reloaded);
});
