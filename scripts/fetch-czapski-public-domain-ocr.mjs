#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import initDjvu, { WasmDocument } from "djvu-rs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = resolve(ROOT, "data/recognition/build/kpbc");
const CONCURRENCY = Math.max(1, Math.min(32, Number(process.env.CZAPSKI_CONCURRENCY) || 24));
const VOLUMES = [
  { volume: 1, edition: 81665, publication: 74966 },
  { volume: 2, edition: 81670, publication: 74967 },
  { volume: 3, edition: 81683, publication: 74968 },
  { volume: 4, edition: 81955, publication: 74969 },
  { volume: 5, edition: 81956, publication: 74970 },
];

function requestedVolumes() {
  const selected = String(process.env.CZAPSKI_VOLUMES || "1,2,3,4,5")
    .split(",").map(Number).filter(Number.isFinite);
  return VOLUMES.filter((item) => selected.includes(item.volume));
}

function cleanOcr(value) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\u00ad\n?/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function request(url, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "APOMONET-public-domain-catalog-builder/1.0" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response;
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500 * (2 ** attempt)));
    return request(url, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

function pageNumber(url) {
  // Component pages end with e.g. `_001_0001.djvu`. The tiny indirect
  // document itself may also contain two numeric filename segments, so the
  // four-digit component suffix is part of the contract here.
  return Number(url.match(/_(\d{3,5})_\d{4}\.djvu(?:\?|$)/i)?.[1]) || 0;
}

async function volumePageUrls(edition) {
  const metsUrl = `https://kpbc.umk.pl/dlibra/oai-pmh-repository.xml?verb=GetRecord&metadataPrefix=mets&identifier=oai:kpbc.umk.pl:${edition}`;
  const xml = await (await request(metsUrl)).text();
  if (!/Domena publiczna \(Public domain\)/i.test(xml) || !/PublicAccess><!\[CDATA\[true\]\]>/i.test(xml)) {
    throw new Error(`Tom ${edition} nie ma oczekiwanej deklaracji public-domain/public-access`);
  }
  const urls = [...xml.matchAll(/xlink:href="(https:\/\/kpbc\.umk\.pl\/Content\/[^"?]+\.djvu)"/gi)]
    .map((match) => match[1].replace(/&amp;/g, "&"))
    .filter((url) => pageNumber(url) > 0);
  return [...new Set(urls)].sort((left, right) => pageNumber(left) - pageNumber(right));
}

function decodeDjvu(bytes) {
  const document = WasmDocument.from_bytes(bytes);
  try {
    const page = document.page(0);
    try {
      return cleanOcr(page.text());
    } finally {
      page.free();
    }
  } finally {
    document.free();
  }
}

async function fetchVolume(config) {
  const output = resolve(CACHE_DIR, `czapski-vol${config.volume}-ocr.json`);
  const urls = await volumePageUrls(config.edition);
  if (!urls.length) throw new Error(`Brak stron DjVu dla tomu ${config.volume}`);
  let cached = {};
  try {
    cached = JSON.parse(await readFile(output, "utf8"));
  } catch {
    cached = {};
  }
  const pages = cached.pages || {};
  const jobs = urls.map((url, index) => ({ url, page: index + 1 })).filter((job) => !pages[job.page]);
  let position = 0;
  let completed = urls.length - jobs.length;
  let checkpoint = Promise.resolve();
  const payload = {
    source: "KPBC public-domain DjVu embedded OCR",
    sourceUrl: `https://kpbc.umk.pl/dlibra/doccontent?id=${config.edition}`,
    publicationUrl: `https://kpbc.umk.pl/dlibra/publication/${config.publication}/edition/${config.edition}`,
    volume: config.volume,
    edition: config.edition,
    pages,
  };
  async function worker() {
    while (position < jobs.length) {
      const job = jobs[position++];
      const response = await request(job.url);
      pages[job.page] = decodeDjvu(new Uint8Array(await response.arrayBuffer()));
      completed += 1;
      if (completed % 50 === 0 || completed === urls.length) {
        console.log(`[Czapski] tom ${config.volume}: OCR ${completed}/${urls.length}`);
        checkpoint = checkpoint.then(() => writeFile(output, `${JSON.stringify(payload)}\n`));
      }
    }
  }
  console.log(`[Czapski] tom ${config.volume}: wznowienie ${completed}/${urls.length}`);
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length || 1) }, () => worker()));
  await checkpoint;
  await writeFile(output, `${JSON.stringify(payload)}\n`);
  console.log(`[Czapski] tom ${config.volume}: zapisano ${output}`);
  return { volume: config.volume, pages: urls.length, output };
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const variant = WebAssembly.validate(await readFile(resolve(ROOT, "node_modules/djvu-rs/simd128/djvu_rs_bg.wasm")))
    ? "simd128" : "scalar";
  await initDjvu(await readFile(resolve(ROOT, `node_modules/djvu-rs/${variant}/djvu_rs_bg.wasm`)));
  const results = [];
  for (const config of requestedVolumes()) results.push(await fetchVolume(config));
  console.log(JSON.stringify({ concurrency: CONCURRENCY, results }, null, 2));
}

await main();
