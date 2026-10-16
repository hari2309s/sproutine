<div align="center">

<img src="apps/web/public/icons/sproutine.png" alt="Sproutine" width="96" />

# Sproutine

### Eat well, one sprout at a time.

A voice-first healthy eating companion that logs your meals, plans your week and nudges you gently, without the guilt.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hari2309s/sproutine&root-directory=apps/web&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,SUPABASE_SECRET_KEY,GROQ_API_KEY&envDescription=Supabase%20project%20keys%20and%20a%20Groq%20API%20key&envLink=https://github.com/hari2309s/sproutine%23environment-setup)

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-server_state-FF4154?logo=reactquery&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)

![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)
![Web Speech API](https://img.shields.io/badge/Web_Speech_API-text--to--speech-orange?logo=googlechrome&logoColor=white)
![zxing-wasm](https://img.shields.io/badge/zxing--wasm-barcode_scanning-4B5563?logo=webassembly&logoColor=white)

![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-7-000000?logo=vercel&logoColor=white)
![LLM Router](https://img.shields.io/badge/LLM_Router-5_providers-F55036?logoColor=white)
![Groq](https://img.shields.io/badge/Groq-GPT--OSS_%2B_Whisper-F55036?logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-3.8_Flash_%2B_embedding-4285F4?logo=google&logoColor=white)

![BLS](https://img.shields.io/badge/BLS_4.0-CC_BY_4.0-003366?logoColor=white)
![Open Food Facts](https://img.shields.io/badge/Open_Food_Facts-ODbL-FF8714?logo=openfoodfacts&logoColor=white)
![USDA FoodData Central](https://img.shields.io/badge/USDA-FoodData_Central-2E5E3E?logoColor=white)

![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_Auth-3ECF8E?logo=supabase&logoColor=white)
![Langfuse](https://img.shields.io/badge/Langfuse-tracing_%2B_evals-000000?logo=langfuse&logoColor=white)
![PostHog](https://img.shields.io/badge/PostHog-analytics-F54E00?logo=posthog&logoColor=white)

![Node.js](https://img.shields.io/badge/Node.js-22-5FA04E?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

![Vitest](https://img.shields.io/badge/Vitest-unit_tests-6E9F18?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-e2e_tests-2EAD33?logo=playwright&logoColor=white)

</div>

---

Sproutine is an AI-native nutrition companion. Tell **Rosie** (from _Rosenkohl_, German for Brussels sprouts) what you ate by voice or text, or scan a pack, and she turns it into a meal log. The numbers come from real food databases, never from the model. It is built for people making a fresh start, such as after quitting smoking, and tuned for shopping at German supermarkets.

> Sproutine offers wellness guidance, not medical advice.

## Status

Sproutine is being built in phases (see [docs/dev-plan.md](docs/dev-plan.md)).

| Phase                       |     |                                                                                                              |
| --------------------------- | --- | ------------------------------------------------------------------------------------------------------------ |
| 0 · Foundation              | ✅  | Auth, onboarding with health-data consent, chat with Rosie, voice, safety gate, LLM router, Langfuse tracing |
| 1 · Food data               | ✅  | BLS 4.0 + Open Food Facts + USDA lookups, nutrient maths, food cache, barcode scanner                        |
| 2 · Logging                 | ✅  | Log meals from chat or barcode, confirm card, Today view, 50-case logging eval (photo logging still to come) |
| 3 · Planning + shopping     | ✅  | Weekly meal plans, cost-optimised planner, swap meals, shopping lists by aisle with estimated prices          |
| 4 · Knowledge + coach       | ✅  | 30-chunk knowledge base (EFSA, WHO), keyword retrieval, cited answers, 40-item coach-golden eval (100% retrieval) |
| 5 · Nudges + habits         | ✅  | Daily/weekly habit streaks, timed nudges (no-log, weekly review, plan reminder), Web Push notifications       |
| 6 · Safety + eval hardening | ✅  | 65-case safety eval (red-team, DE, role-play), GDPR export covers all tables, cascade delete verified         |
| 7 · Beta                    | ✅  | Demo account with nightly reset, one-click demo login, seed script                                           |

---

## Features

- 🎙️ **Voice first:** hold to talk, and Rosie answers out loud. Pick her voice (Rosie, Niamh or Isla) during onboarding or in Settings.
- 🥗 **Log meals by talking:** say "zwei Scheiben Vollkornbrot mit Käse" or "a bowl of porridge with blueberries". Rosie shows a card with the matched foods and estimated grams. Change grams, swap a match, remove items or pick the meal, then save.
- 📷 **Barcode scanning:** scan a pack on the Today screen. Uses the browser's built-in `BarcodeDetector` where available and a self-hosted `zxing-wasm` fallback elsewhere (iOS Safari, Firefox), so scanning makes no third-party requests.
- 📅 **Today view:** the day's meals by breakfast, lunch, dinner and snack, with a day total.
- 🔢 **Numbers from data, not the model:** the model only lists what you said. Matching, portion grams and nutrients are computed in code from BLS 4.0 (7,140 German foods), Open Food Facts and USDA data, and the server recomputes them on save.
- 🇩🇪 **German-aware portions:** understands compounds ("Linsensuppe", "Orangensaft"), units like Scheibe, Becher, Handvoll and Tafel, and typical German portion sizes.
- 🌿 **Allergen-aware data:** foods carry the EU-14 allergens, and "unknown" is never treated as "none".
- 🫶 **Safety first:** every message passes a safety gate. Crisis and eating-disorder signals get fixed, human-written replies with German helplines, and gentle mode removes all numbers from the app.
- 🌗 **Light, dark or system theme**, one tap to switch.

---

## How it works

```
You speak → Groq Whisper transcribes
→ Safety gate (keyword screen + gpt-oss-safeguard) and intent check run in parallel
→ log_meal: the model lists foods, counts and units you said (no weights, no nutrients)
→ Code matches each food: food cache → BLS 4.0 → Open Food Facts (Germany) → USDA
→ Code estimates grams from a German-context portion table
→ A confirm card appears; nothing is saved until you tap Save
→ The server recomputes nutrients from the foods table and stores a snapshot
→ Every step is traced to Langfuse (masked for personal data)
```

Other messages get a streamed reply from Rosie through the LLM router, read aloud with the Web Speech API.

---

## Tech stack

| Layer         | Technology                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router) + React 19 + TypeScript 6                                                          |
| Styling       | Tailwind CSS 4, self-hosted Material Symbols subset                                                        |
| Animations    | Framer Motion                                                                                              |
| PWA           | Web manifest (installable on iOS and Android)                                                              |
| Voice input   | MediaRecorder → Groq `whisper-large-v3-turbo`                                                              |
| Voice output  | Web Speech API with selectable voice personas                                                              |
| AI            | Vercel AI SDK 7, Zod 4 structured output                                                                   |
| LLM router    | Custom multi-provider router with daily budgets ([`packages/ai/src/router.ts`](packages/ai/src/router.ts)) |
| Food data     | BLS 4.0 (7,140 German foods), Open Food Facts API v3 + Search-a-licious, USDA FoodData Central              |
| Barcode       | `BarcodeDetector` → `zxing-wasm` fallback                                                                  |
| Database      | Supabase (PostgreSQL, Auth, RLS, `pg_trgm` food search, pgvector)                                          |
| Observability | Langfuse v5 (OpenTelemetry traces, masked content, datasets, experiments)                                  |
| Analytics     | PostHog                                                                                                    |
| State         | TanStack Query                                                                                             |
| Monorepo      | pnpm 12 workspaces + Turborepo                                                                             |
| Deployment    | Vercel                                                                                                     |

---

## LLM router

All providers run on free tiers. The router picks the first provider still under its daily budget and falls through on errors.

| Task                      | Priority order                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Chat                      | Groq `gpt-oss-20b` → Cerebras `gpt-oss-120b` → OpenRouter `gemma-4-31b-it:free` → Mistral `mistral-small-2603` |
| Classify (intent)         | Groq `gpt-oss-20b` → Cerebras → Mistral                                                                        |
| Safety                    | Groq `gpt-oss-safeguard-20b` → Cerebras → Mistral                                                              |
| Structured (meal parsing) | Gemini `gemini-3.8-flash` → Groq `gpt-oss-120b` → Cerebras                                                     |
| Reasoning                 | Gemini `gemini-3.8-flash` → Groq → Cerebras → OpenRouter                                                       |
| Vision                    | Gemini → Groq `qwen3.8-27b`                                                                                    |
| Embeddings                | Gemini `gemini-embedding-2`                                                                                    |

Run `pnpm --filter @sproutine/ai models:check` to confirm the model IDs are still served.

---

## Project structure

```
sproutine/
├── apps/
│   └── web/                  Next.js app (UI, API routes, e2e tests)
│       └── src/app/api/      chat, voice, meals, food/search, food/barcode, account
├── packages/
│   ├── ai/                   LLM router, safety gate, intent, meal parser, Langfuse, evals
│   ├── food/                 BLS + OFF + USDA clients, nutrients, portions, search, meal logs
│   ├── db/                   Supabase client, profile, food cache, meal logs
│   ├── types/                Shared types (diets, EU-14 allergens, intents, safety)
│   └── ui/                   Shared UI pieces
├── supabase/
│   ├── migrations/           Schema, RLS, RPCs
│   └── templates/            Email templates
└── docs/dev-plan.md          Roadmap and design decisions
```

---

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 12+ (`npx pnpm@12.11.2` works too)
- [Supabase CLI](https://supabase.com/docs/guides/cli) and a Supabase project (free)
- A [Groq](https://console.groq.com/keys) key (chat, safety, voice; free tier)

Optional (the router falls back without these):

- [Google AI Studio](https://aistudio.google.com) (Gemini), [Cerebras](https://cloud.cerebras.ai), [OpenRouter](https://openrouter.ai), [Mistral](https://console.mistral.ai)
- A [USDA FoodData Central](https://api.data.gov/signup) key for generic foods
- [Langfuse](https://cloud.langfuse.com) and [PostHog](https://posthog.com) projects

### Installation

```bash
git clone https://github.com/hari2309s/sproutine.git
cd sproutine
pnpm install
```

### Environment setup

One `.env.local` at the repo root serves the app and the scripts; the app reads it through a symlink:

```bash
cp .env.example .env.local
ln -s ../../.env.local apps/web/.env.local
```

```bash
# Required
GROQ_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=      # sb_publishable_…, safe in the browser
SUPABASE_SECRET_KEY=                       # sb_secret_…, server only

# Optional: more LLM providers
GEMINI_API_KEY=
CEREBRAS_API_KEY=
OPENROUTER_API_KEY=
MISTRAL_API_KEY=

# Optional: food data
OFF_CONTACT=                               # email or URL for the Open Food Facts User-Agent
USDA_API_KEY=                              # api.data.gov key; USDA is skipped without it

# Optional: observability and analytics
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=development
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

### Database setup

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Then in the Supabase dashboard:

- **Authentication → URL Configuration:** set the Site URL to your main address (your Vercel domain, or `http://localhost:3000` if you only run locally) and add every address you run on to the redirect URLs, e.g. `http://localhost:3000/**` and `https://<your-domain>/**`. Email links come back to the site that asked for them only if it's on this list.
- **Authentication → Sign In / Providers → Email:** sign-in is email and password. Turn **Confirm email** off if you don't want a confirmation email on sign-up (the built-in mailer allows only a few emails an hour); then the only email Sproutine sends is a password reset. With it off, sign-up does tell someone when an address already has an account (Supabase can't hide it, since a new account signs in straight away); with it on, both get the same "check your email" reply. Set the minimum password length to 8 to match the app, and turn on **Secure password change**.
- **Authentication → Emails:** paste [`supabase/templates/confirmation.html`](supabase/templates/confirmation.html) into _Confirm signup_ and [`supabase/templates/recovery.html`](supabase/templates/recovery.html) into _Reset password_. Their links are verified on the server, so they work even when the email is opened on another device.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

1. Import the repo in Vercel and set **Root Directory** to `apps/web`. [`apps/web/vercel.json`](apps/web/vercel.json) installs and builds with pinned pnpm 12 through `npx`, since Vercel's built-in pnpm stops at version 10.
2. Add the environment variables from [Environment setup](#environment-setup) for Production (and Preview if you use it). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are needed at build time; set `LANGFUSE_TRACING_ENVIRONMENT=production` and `NEXT_PUBLIC_APP_URL` to your domain.
3. In Supabase, under **Authentication → URL Configuration**, set the Site URL to your Vercel domain and add `https://<your-domain>/**` (plus `http://localhost:3000/**` for local work) to the redirect URLs, or confirmation and reset links fall back to the Site URL. For Preview deployments, also add `https://*-<your-vercel-team>.vercel.app/**`.
4. Vercel reads the Node version from `apps/web/package.json` (`>=22`); pnpm 12 needs Node 22 or newer.

---

## Safety

- **Safety gate on every message:** a deterministic keyword screen catches clear crisis and eating-disorder language without any model call, so it works even when every provider is down or a user's daily quota is used up. Everything else goes to the `gpt-oss-safeguard` policy classifier; if that is unavailable, the reply still follows the safety rules in Rosie's system prompt.
- **Templated replies:** crisis and eating-disorder replies are fixed text, never model output, with TelefonSeelsorge (0800 111 0 111 / 0800 111 0 222), 112, and the BIÖG eating-disorder helpline (0221 892031).
- **Gentle mode:** an eating-disorder signal switches it on. The app then shows and sends no calories or nutrient numbers anywhere.
- **Privacy:** prompts carry a pseudonym, never your email. Traces are masked for emails and phone numbers. No health data reaches a model without recorded consent (GDPR Art. 9).

---

## Evals

Golden datasets live in [`packages/ai/evals`](packages/ai/evals) and run as Langfuse experiments against the real production functions.

| Set                      | Measures                                                                | Gate                                                        |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| Intent routing           | Correct intent for messages that miss the keyword fast path             | ≥ 75 %                                                      |
| Safety                   | Must-trigger recall, exact category, false positives on benign messages | 100 % recall, ≥ 70 % exact category, ≤ 20 % false positives |
| Logging (55 EN/DE cases) | Foods found, grams within ±25 %, meal slot                              | ≥ 80 %                                                      |

```bash
pnpm --filter @sproutine/ai eval:sync-dataset   # push the cases to Langfuse
pnpm --filter @sproutine/ai eval                # run them
```

The portion half of the logging set also runs offline as a unit test.

---

## Testing

### Unit tests (Vitest)

```bash
pnpm test
```

| Package         | Covered                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/food` | BLS normalisation and quality checks, Open Food Facts and USDA normalisation against recorded fixtures (±2 %), nutrient maths, portion estimates, search ranking, rate limits, meal proposals |
| `packages/ai`   | Safety screen, intent rules, system prompt, router, trace masking, meal-parse normalisation, logging-golden portions                                    |
| `apps/web`      | Icon font subset, feedback tokens, translations                                                                                                         |

### E2E tests (Playwright)

Supabase calls are intercepted, so no real auth or data is needed.

```bash
cd apps/web
pnpm test:e2e
pnpm test:e2e:ui
```

---

## Food data attribution

German generic food data from the [Bundeslebensmittelschlüssel (BLS) 4.0](https://blsdb.de) by the Max Rubner-Institut, available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Product data from [Open Food Facts](https://world.openfoodfacts.org), available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). Generic food data from [USDA FoodData Central](https://fdc.nal.usda.gov) (public domain). See [docs/data-sources.md](docs/data-sources.md) for full licence details.

## License

[MIT](LICENSE)

---

<p align="center">Built with health and ❤️ from Berlin</p>
