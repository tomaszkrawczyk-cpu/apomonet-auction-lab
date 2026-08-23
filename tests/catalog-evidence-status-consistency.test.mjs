import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

for (const file of ['coin-card-canonical-fields.js','collection-catalog-evidence-ui.js','user-album-catalog-evidence-ui.js','export-record-view.js']) {
  test(`${file} recognizes curated confirmation without downgrading it to candidate`, () => {
    const source = read(file);
    assert.match(source, /verified-curated/);
  });
}

test('collection and album views still visibly distinguish unconfirmed candidates', () => {
  assert.match(read('collection-catalog-evidence-ui.js'), /candidateRarity.*\?/s);
  assert.match(read('user-album-catalog-evidence-ui.js'), /candidateRef\|\|candidateRarity/);
});
