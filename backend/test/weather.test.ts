import assert from "node:assert/strict";
import { test } from "node:test";
import { solarWindow, summarizeForecast } from "../src/services/weather.service.js";
import { forecast, now } from "./fixtures.js";

// The current hour (offset 0) belongs to both the past-24 h and next-24 h windows.
test("forecast summary sums rain and counts humid hours around now", () => {
  const data = forecast({
    hourly: (hour) => ({
      rainMm: hour >= 0 && hour < 24 ? 0.5 : hour >= 24 && hour < 48 ? 1 : hour < 0 ? 0.25 : 0,
      rainProbability: hour === 3 ? 70 : 10,
      humidity: hour < 0 && hour >= -6 ? 92 : hour >= 1 && hour <= 4 ? 91 : 60,
    }),
    daily: [{ tempMax: 31, et0: 4.4 }, { tempMax: 36, rainMm: 12 }, { tempMax: 33, windMaxKmh: 30 }],
  });
  const summary = summarizeForecast(data, now);
  assert.equal(summary.rainNext24Mm, 12);
  assert.equal(summary.rainNext48Mm, 36);
  assert.equal(summary.rainPast24Mm, 6.3);
  assert.equal(summary.rainProbabilityNext24, 70);
  assert.equal(summary.humidHoursPast24, 6);
  assert.equal(summary.humidHoursNext24, 4);
  assert.equal(summary.et0Today, 4.4);
  assert.equal(summary.maxTempNext3Days, 36);
  assert.equal(summary.heaviestRainDay?.rainMm, 12);
  assert.equal(summary.maxWindNext3Days, 30);
});

// Predicted PV output = capacity x irradiance x 0.8 / 1000 (kW).
test("solar window is the first run of hours where PV output covers the pump", () => {
  const data = forecast({ hourly: (hour) => ({ radiation: hour >= 1 && hour <= 4 ? 800 : hour === 6 ? 900 : 100 }) });
  const window = solarWindow(data, 5, 3, now);
  assert.equal(window.usable.length, 4);
  assert.equal(window.usable[0].predictedKw, 3.2);
  const currentHour = Math.floor(now.getTime() / 3600000) * 3600000;
  assert.equal(window.start, new Date(currentHour + 3600000).toISOString());
  assert.equal(window.end, new Date(currentHour + 5 * 3600000).toISOString());
  assert.equal(window.activeNow, false);
});

test("no solar window when output never covers the pump", () => {
  const window = solarWindow(forecast({ hourly: () => ({ radiation: 500 }) }), 5, 3, now);
  assert.equal(window.start, null);
  assert.equal(window.end, null);
  assert.equal(window.usable.length, 0);
});
