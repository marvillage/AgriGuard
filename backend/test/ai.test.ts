import assert from "node:assert/strict";
import { test } from "node:test";
import { pauseAfter } from "../src/lib/ai/index.js";

test("a daily quota error pauses the model until the Pacific midnight reset", () => {
  const pause = pauseAfter('HTTP 429: {"error":{"details":[{"violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}');
  assert.ok(pause > 60000);
  assert.ok(pause <= 25 * 3600 * 1000);
});

test("per-minute limits and overloads pause for a minute; other errors do not pause", () => {
  assert.equal(pauseAfter('HTTP 429: {"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}'), 60000);
  assert.equal(pauseAfter("HTTP 503: model is experiencing high demand"), 60000);
  assert.equal(pauseAfter("HTTP 400: invalid argument"), 0);
  assert.equal(pauseAfter("HTTP 404: model is no longer available to new users"), 24 * 3600 * 1000);
  assert.equal(pauseAfter("empty response"), 0);
});
