import assert from "node:assert/strict";
import { test } from "node:test";
import { cropKeys, diseaseKnowledge, getDiseaseInfo } from "../src/data/disease-knowledge.js";

const languages = ["en", "hi", "mr", "pa", "te", "ta"] as const;
const entries = Object.values(diseaseKnowledge);

test("every PlantVillage class the model can predict has advice", () => {
  assert.equal(entries.length, 38);
  assert.equal(new Set(entries.map((entry) => entry.label)).size, 38);
  assert.ok(cropKeys.length >= 14);
});

test("advice is complete and parallel in all six languages", () => {
  for (const entry of entries) {
    const english = entry.text.en;
    for (const language of languages) {
      const text = entry.text[language];
      assert.ok(text, `${entry.label} has no ${language} text`);
      assert.ok(text.name.trim(), `${entry.label} ${language} name is empty`);
      for (const key of ["symptoms", "actions", "prevention"] as const) {
        assert.equal(text[key].length, english[key].length, `${entry.label} ${language} ${key} count differs from English`);
        for (const line of text[key]) assert.ok(line.trim(), `${entry.label} ${language} ${key} has an empty line`);
      }
    }
  }
});

test("diseased entries name a pathogen and have actions; healthy ones do not claim a pathogen", () => {
  for (const entry of entries) {
    if (entry.healthy) {
      assert.equal(entry.pathogen, null, `${entry.label} is healthy but names a pathogen`);
    } else {
      assert.ok(entry.pathogen, `${entry.label} names no pathogen`);
      assert.ok(entry.text.en.actions.length > 0, `${entry.label} has no actions`);
    }
  }
});

test("labels resolve regardless of case and spacing", () => {
  const [first] = entries;
  assert.equal(getDiseaseInfo(first.label), first);
  assert.equal(getDiseaseInfo(`  ${first.label.toUpperCase()} `), first);
  assert.equal(getDiseaseInfo("not a label"), undefined);
});
