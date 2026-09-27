# AgriGuard — smart irrigation & crop intelligence

AgriGuard connects low-cost field sensors, real weather data and AI so a farm pumps only
the water the crop needs, spots disease early and applies the right fertilizer dose — and
proves the savings in litres, kWh, CO₂ and rupees.

```
ESP32 field node ──► /api/device/telemetry ──► decision engine (FAO-56 + forecast + ML) ──► pump ON/OFF
 (moisture, NPK,        (Express + Prisma 8        risk scores, recommendations, alerts        │
  flow, energy,          + PostgreSQL)             savings ledger, reports                      ▼
  tank, solar)                  ▲                                                      Next.js dashboard / PWA
                                └── Open-Meteo weather · Sentinel-2 satellite · on-server disease model · LLMs
```

## Run it locally

Requirements: Node.js 20.9+ (tested on 24). No Docker or system PostgreSQL needed.

```bash
# 1. Backend
cd backend
npm install
npm run db            # starts a local PostgreSQL (data in backend/.pgdata) using DATABASE_URL from .env — keep it running
npm run db:migrate    # applies all migrations (use `npm run db:init` instead on an empty database)
npm run dev           # API on http://localhost:5000
npm run seed:demo     # optional: 6 demo accounts on real farm locations with real weather and satellite data
npm run simulate      # optional: virtual field nodes streaming live telemetry (same API as the ESP32)
npm test              # unit tests for the irrigation, risk, fertilizer and AI-fallback logic

# 2. Frontend
cd ../frontend
npm install
npm run dev -- -p 3100   # http://localhost:3100
```

`backend/.env` needs `DATABASE_URL` and `JWT_SECRET`; everything else is optional (see
`backend/.env.example`). Demo accounts after seeding (password `agriguard123`): farmers
`demo@` (English), `sunita@` (Hindi), `anil@` (Marathi) and `lakshmi@agriguard.in` (Telugu),
agronomist `advisor@agriguard.in` and FPO admin `fpo@agriguard.in`.

The full platform guide (features, decision logic, data sources, API, data model, results) is
[`docs/AgriGuard-Platform-Guide.pdf`](docs/AgriGuard-Platform-Guide.pdf).

## Features

| Area | What it does |
|---|---|
| **IoT telemetry** | ESP32 node posts soil moisture, soil/air temperature, humidity, NPK, flow, energy, tank level, solar and battery every minute; the reply tells the relay to run or stop. |
| **Automatic pump control** | Auto / manual on / manual off modes, smart and fixed schedules, dry-run protection when the tank is low, a failsafe that stops the pump if the server is unreachable. |
| **Flow & energy metering** | YF-S201 flow meter and PZEM-004T energy meter turn every irrigation into measured litres and kWh (run-time estimate when a meter is missing). |
| **Weather** | Open-Meteo forecast and history per farm (rain, humidity, ET₀, radiation, wind) — no key needed. |
| **FAO-56 water balance** | Crop stage and Kc from the planting date, root depth, soil water holding, depletion, refill point and irrigation volume per event. |
| **Rain-aware & solar-aware decisions** | Skips irrigation when forecast rain covers the need; waits for the solar window when the farm has panels. |
| **Soil-moisture forecast (ML)** | Per-field regression learned from the field's own history (ETc, rain, irrigation), 72-hour forecast and "needs water in N hours" alerts. |
| **Crop disease scan (AI)** | MobileNetV2 trained on PlantVillage (38 classes) runs on the server, plus leaf-area damage estimate and an optional LLM second opinion; pest ID via vision AI. |
| **Risk center** | Water stress, disease risk (humidity hours + scans), weather risk (heat, heavy rain, wind), nutrient status and a crop-health score. |
| **Recommendations & alerts** | Explained, prioritised actions with "Why", in-app, browser push, SMS and WhatsApp; AI "explain this" button. |
| **Fertilizer optimisation** | Soil Health Card ratings → urea / DAP / MOP dose and split schedule vs blanket dose; card values read from a photo by vision AI. |
| **Satellite crop health** | Sentinel-2 NDVI heat-map of the field boundary with low/medium/high vigour zones. |
| **Field boundaries** | Draw the field on a satellite map; area and centre are calculated automatically. |
| **Field trials** | AgriGuard plot vs control plot: measured litres and kWh per acre, yield change. |
| **Savings ledger & reports** | Savings vs the farm's usual practice, SHA-256 hash-chained ledger, CSV and PDF impact report with AI summary. |
| **AI copilot** | Chat about your own farm data in 6 languages with voice input and read-aloud answers. |
| **Agronomist desk** | Farmers share a code; agronomists / FPOs monitor many farms, see risks and send notes. |
| **Languages & PWA** | English, Hindi, Marathi, Punjabi, Telugu, Tamil; installable app that opens offline. |

## AI providers (all free)

Put any of these in `backend/.env` and restart the backend. The app tries them in order and
falls back to built-in rules when none is reachable.

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | aistudio.google.com → Get API key |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys (uses `:free` models) |
| `OLLAMA_URL` | ollama.com (local, offline), e.g. `ollama pull gemma3:4b` or `qwen2.5vl:7b` |

Model names are discovered automatically; set `GEMINI_MODEL` etc. to pin one. With a Gemini key the
app rotates through every stable Flash and Flash-Lite model the key can use, because each has its own
free-tier quota (about 20 requests a day for the newest Flash model); a model that hits its daily limit
is paused until the midnight-Pacific reset. AI only explains and reads: every number comes from the
formulas and verified sources, and "Why?" explanations may not add numbers, products or doses.

## Alerts

Browser push works out of the box (keys are generated into `backend/data/vapid.json`).
For SMS / WhatsApp add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` and
`TWILIO_WHATSAPP_FROM`, then enable the channels in **Settings**.

## Hardware

Firmware, wiring and bill of materials: [`firmware/agriguard-node`](firmware/agriguard-node/README.md).
Register the node under **Field → Devices** to get its key; the Devices tab shows a ready-to-paste
`config.h`. Until the hardware is built, `npm run simulate` drives the same API with virtual nodes.

## How impact is measured

* **Baseline** = the farm's usual practice, editable per farm. The defaults (e.g. flood 70 mm every
  7 days) are not yet verified against a published source, so farms should enter their own.
* **Water used** = flow meter readings (or pump run-time × rated flow when no meter is fitted).
* **Saved** = baseline − used, per baseline period, written to a hash-chained ledger.
* **Energy** from the PZEM meter, else pump rating, else 30 m head at 30 % efficiency (0.27 kWh / 1,000 L, BEE AgDSM);
  **CO₂** at 0.675 kg/kWh (India grid, CEA v22.0, FY 2025-26); **₹** at the farm's tariff.
* **Field trials** compare an AgriGuard plot against a control plot; control plots are excluded from savings totals.

## Testing & validation

The **Testing & results** page in the app shows these, read from `backend/data/validation/`:

| Check | Result | Reproduce |
|---|---|---|
| Unit tests | 38 of 38 pass | `npm test` (`npm run test:report` refreshes the page) |
| Disease model on 236 real field photos (PlantDoc test split) | 60.6% right first time with the crop selected, 88.1% in the top 3 (published baseline: 15.08%) | `npx tsx scripts/validate-disease-model.ts` |
| Past-season replay on real 2025 weather (simulated) | 47.4% less water than a rain-blind weekly FAO-56 schedule on the 5 fields that needed irrigation | `npx tsx scripts/replay-season.ts` |

## Deploy on Render

`render.yaml` is a Render Blueprint: **New → Blueprint** → pick this repository → enter `GEMINI_API_KEY`.
It creates a PostgreSQL database, the API (migrations run on start with
`prisma db migrate --to production`) and the web app on the free plan. Load demo data once with
`DATABASE_URL=<external database URL> npm run seed:demo` from `backend/`. Pushes to `main` redeploy.

## Project layout

```
backend/     Express 5 API, Prisma 8 contract (prisma/schema.prisma), services, jobs, scripts
frontend/    Next.js 16 app (landing page, dashboard, field pages, PWA, i18n)
firmware/    ESP32 field node sketch and hardware guide
docs/        platform guide (PDF)
render.yaml  Render Blueprint (database, API, web app)
IMAGE_PROMPTS.md   prompts used to generate the site imagery
```
