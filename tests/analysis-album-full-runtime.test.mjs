import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

class Element {
  constructor(tagName = "div") {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.textContent = "";
    this.onclick = null;
    this.src = "";
    this.files = [];
    this.classList = {
      values: new Set(["hidden"]),
      add: (value) => this.classList.values.add(value),
      remove: (value) => this.classList.values.delete(value),
      contains: (value) => this.classList.values.has(value),
      toggle: (value, force) => force ? this.classList.values.add(value) : this.classList.values.delete(value),
    };
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = [...children]; }
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getAttribute(name) { return this[name] || null; }
  setAttribute(name, value) { this[name] = value; }
}

const storage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    raw: (key) => values.get(key) ?? null,
  };
};

async function fullRuntime() {
  const names = [
    "app-core.js",
    "analysis-album-flow.js",
    "album-photo-prep.js",
    "analysis-album-save-fix.js",
    "analysis-record-flow-fix.js",
  ];
  const sources = await Promise.all(names.map((name) => readFile(new URL(`../${name}`, import.meta.url), "utf8")));
  const localStorage = storage();
  const sessionStorage = storage();
  const elements = new Map([
    ["album", new Element("button")],
    ["albumList", new Element("div")],
    ["albumModal", new Element("div")],
    ["oi", Object.assign(new Element("img"), { src: "data:image/webp;base64,AWERS" })],
    ["ri", Object.assign(new Element("img"), { src: "data:image/webp;base64,REWERS" })],
    ["obverseInput", new Element("input")],
    ["reverseInput", new Element("input")],
    ["panel", new Element("section")],
    ["deepPanel", new Element("section")],
    ["savedActions", new Element("section")],
    ["status", new Element("p")],
  ]);
  const document = {
    body: new Element("body"),
    getElementById: (id) => elements.get(id) || null,
    createElement: (tag) => new Element(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };
  const ready = [];
  const context = {
    window: null,
    document,
    localStorage,
    sessionStorage,
    location: { pathname: "/analyze.html", href: "" },
    addEventListener: (name, handler) => { if (name === "DOMContentLoaded") ready.push(handler); },
    setTimeout: (handler) => { handler(); return 1; },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    MutationObserver: class { observe() {} },
    URLSearchParams,
    Date,
    Math,
    JSON,
    console,
  };
  context.window = context;
  const coreSource = `${sources[0].split("window.ApoMonet=ApoMonet;")[0]}this.ApoMonet=ApoMonet;`;
  vm.runInNewContext(coreSource, context);
  for (const source of sources.slice(1)) vm.runInNewContext(source, context);
  context.ApoMonet.seed();
  return { context, elements, ready };
}

test("the real analyze-page wrapper chain opens the album chooser and persists the current photos", async () => {
  const { context, elements, ready } = await fullRuntime();
  let currentCoin = null;
  let assigned = null;
  elements.get("album").onclick = () => {
    currentCoin = context.ApoMonet.upsertCoin({
      title: "Bieżąca moneta",
      obverseImage: elements.get("oi").src,
      reverseImage: elements.get("ri").src,
    });
    context.ApoAnalysisAlbumFlow.open({
      coin: currentCoin,
      store: context.ApoMonet,
      list: elements.get("albumList"),
      modal: elements.get("albumModal"),
      documentRef: context.document,
      onSuccess: (coin) => { assigned = coin; },
      onError: (error) => { throw error; },
    });
  };
  ready.forEach((handler) => handler());

  elements.get("album").onclick({ preventDefault() {} });
  assert.equal(elements.get("albumModal").classList.contains("hidden"), false);
  assert.equal(elements.get("albumList").children.length, 3);
  elements.get("albumList").children[0].onclick();

  assert.equal(assigned.id, currentCoin.id);
  assert.deepEqual(Array.from(assigned.albumIds), ["polska-krolewska"]);
  assert.equal(assigned.obverseImage, "data:image/webp;base64,AWERS");
  assert.equal(assigned.reverseImage, "data:image/webp;base64,REWERS");
  assert.equal(assigned.albumPhotoMode, "original");
});

test("compaction lets a near-quota legacy collection save repeated photos without deleting or changing them", async () => {
  const completeCoreSource = await readFile(new URL("../app-core.js", import.meta.url), "utf8");
  const coreSource = `${completeCoreSource.split("window.ApoMonet=ApoMonet;")[0]}this.ApoMonet=ApoMonet;`;
  const photo = `data:image/webp;base64,${"A".repeat(900)}`;
  const legacy = {
    coins: Array.from({ length: 4 }, (_, index) => ({ id: `legacy-${index}`, obverseImage: photo, reverseImage: photo })),
    albums: [{ id: "album", name: "Album" }],
  };
  const values = new Map([["apomonet_state_v2", JSON.stringify(legacy)]]);
  const limit = 5_000;
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      const text = String(value);
      if (text.length > limit) throw Object.assign(new Error("quota"), { name: "QuotaExceededError" });
      values.set(key, text);
    },
  };
  const context = { window: null, localStorage, Date, Math, JSON };
  context.window = context;
  vm.runInNewContext(coreSource, context);

  const saved = context.ApoMonet.upsertCoin({ title: "Nowa próba", obverseImage: photo, reverseImage: photo });
  const raw = JSON.parse(values.get("apomonet_state_v2"));
  assert.ok(saved.id);
  assert.ok(values.get("apomonet_state_v2").length < limit);
  assert.equal(Object.keys(raw.photos).length, 1);
  assert.equal(context.ApoMonet.load().coins.length, 5);
  assert.equal(context.ApoMonet.getCoin("legacy-0").obverseImage, photo);
});
