# Sproutine — Development Plan (v2 draft)

AI-native healthy-eating companion: voice and chat first, built by forking Truffle, running on free tiers.
This is v2 of the plan. It turns the v1 PDF into concrete work and fixes the places where v1 didn't match the Truffle code as it is today (`../truffle`, read 2026-10-13).

---

## 0. What changed from v1

| v1 said | Reality in Truffle / decision | Impact |
|---|---|---|
| Next.js 14 | Truffle runs **Next 15.5, React 19, AI SDK v5, LangGraph 0.2, Zod 3** | Fork as-is, don't downgrade |
| Nudges reuse Truffle's system, including "skipped meal" | Truffle nudges are **event-driven only** (no cron, `apps/web/src/app/api/cron/` is empty). A skipped meal is the *absence* of an event, so it needs a scheduler | New: scheduled trigger (see §7, Phase 5) |
| "Push via PWA" is reuse | Truffle has no Web Push. Nudges only light up an unread badge in the chat | New work: VAPID keys, service worker push, subscription table. iOS only supports it for installed PWAs |
| Safety gate hardening in week 12 | The first user persona (recently quit smoking, and weight gain is common after quitting) carries real disordered-eating risk | **A minimal safety gate ships in Phase 0**, and Phase 6 only hardens it |
| Profile reuse | Truffle has no `profiles` table (there's onboarding UI but no profile schema) | New table and onboarding form |
| Migrations | Truffle has them split between `packages/db/src/migrations/` and `supabase/migrations/` | Sproutine uses **only `supabase/migrations/`** with the Supabase CLI from day 1 |
| DGE/WCRF guidelines in RAG | DGE and WCRF texts are copyrighted, not open-licensed | Open decision: check the licence or use public-domain/CC sources (see §11) |
| `price_hints` tool | No free API for German supermarket prices | Use a hand-maintained static price table for about 150 staples, labelled as an estimate |
| Barcode via browser camera | `BarcodeDetector` isn't available in Safari/iOS | Use `zxing-wasm` as a fallback (or primary) |

---

## 1. Goals and non-goals

**Goals (MVP, 14 weeks)**
- Log a meal by voice, text, barcode or photo in under 15 s, with a confirm card before anything is written.
- Generate a weekly plan that respects allergies, dislikes, diet and budget, and re-plans when the user deviates.
- Answer nutrition questions with cited sources.
- Send proactive nudges: missed logs, streaks, weekly review.
- 0 EUR running cost through beta.

**Non-goals (MVP)**
- Calorie *targets* or weight-loss programmes. We show intake but don't prescribe deficits (see the safety section).
- Medical conditions such as diabetes or kidney disease. These get redirected, not planned around.
- Native apps, wearables, recipe import from URLs.

---

## 2. Stack (as forked)

| Layer | Choice | Source |
|---|---|---|
| Web | Next.js 15.5 App Router, React 19, Tailwind 3, Framer Motion, TanStack Query 5, PWA manifest | Truffle `apps/web` |
| Monorepo | pnpm 10 + Turborepo: `apps/web`, `packages/{ai,db,types,ui}` | Truffle |
| Agents | LangGraph.js 0.2 `StateGraph` + AI SDK v5 `generateObject` with Zod | Truffle `packages/ai` |
| LLM router | `packages/ai/src/router.ts`: daily-budget walk, per-provider counters | Truffle (extend task types) |
| DB | Supabase Postgres + RLS + pgvector `vector(768)` | Truffle pattern, new project (EU region: Frankfurt) |
| Embeddings | `gemini-embedding-2`, MRL-truncated to 768 dims | Truffle `embeddings.ts` |
| STT | Groq Whisper via `/api/voice` | Truffle |
| TTS | Web Speech personas (`lib/voices.ts`), new default **Rosie** | Truffle (adapt) |
| Observability | Langfuse v5 (OTel) traces, datasets, `experiment-action` CI gate; PostHog | Truffle |
| Bot protection | Cloudflare Turnstile on auth | Truffle |
| Hosting | Vercel Hobby, Supabase Free, GitHub Actions | Truffle |
| Food data | Open Food Facts (barcode-first, DE coverage), USDA FoodData Central (generic foods) | New |

Model IDs live in `getModelId()` in the router. The current ones are Groq `openai/gpt-oss-20b` / `-120b` / `qwen/qwen3.6-27b` (vision), Gemini `gemini-3.7-flash` / `-flash-lite`, Cerebras `gpt-oss-120b`, OpenRouter `llama-3.3-70b-instruct:free`, Mistral `mistral-small-latest`. Re-verify them during the Phase 0 week.

---

## 3. Fork map

**Keep as-is**
- `packages/ai/src/{router,llm,eval,langfuse,embeddings,date,toneDetection}.ts`, `providers/*`
- `packages/ai/evals/{gate,sync-dataset,run-golden}.ts` scaffolding
- `apps/web`: auth (`lib/auth.ts`, `supabase-server.ts`, `app/auth/*`, `api/auth/*`), `api/voice`, `api/account/delete`, `api/chat/feedback`, `ChatPage`, `ChatBubble`, `VoiceButton`, `VoicePicker`, `BottomNav`, `TopBar`, `ThemeToggle`, `CookieBanner`, `ErrorBoundary`, `PageMotion`, `LanguagePicker`, `lib/i18n.ts`
- `supabase/migrations/*daily_llm_usage*`, `*eval_logs*`, `*increment_llm_usage_rpc*`
- `.github/workflows/{ci,langfuse-eval,demo-reset}.yml`

**Adapt**
| Truffle | Sproutine |
|---|---|
| `TransactionProposalCard` | `MealLogCard` (items, grams, per-item and total nutrients, edit grams, confirm) |
| `GoalProposalCard`, `HabitProposalCard` | `PlanChangeCard`, `HabitProposalCard` (food habits) |
| `ReceiptUpload` + `api/parse-receipt` | `MealPhotoUpload` + `api/parse-meal-photo` |
| `savings_habits` + `habit_contributions`, `lib/habits.ts` (`computeStreak`) | `goals_habits` + `habit_checkins` |
| `lib/proactive-nudge.ts`, `ai/src/proactive.ts` | Same pattern, new triggers (§7) |
| `WeeklySummary`, `Dashboard` | `TodaySummary`, `WeekView` |
| `OnboardingPage` | Profile onboarding (diet, allergies, dislikes, budget, locale, quit date optional) |
| `chatSystemPrompt.ts` | Sproutine/Rosie persona with safety rules baked in |
| `intentRouter` + prompt | New intent set (§6) |
| `seed-demo.mjs` + `transactions.csv` | `seed-demo.mjs` + `demo-meals.json` |

**Strip**
- Agents: `spendingAnalyst`, `forecaster`, `affordabilityChecker`, `anomalyReviewer`, `savingsGoalAdvisor`, `projection`, `synthesizer` (or keep and repurpose as the response composer), `categorization.prompt`
- UI: `AddTransactionForm`, `CSVImport`, `CurrencyPicker`, `FinancialBrief`, `InsightsPage`/`InsightsAccordionSection`, `MonthlyBudgets`, `SavingsGoals`, `SpendingHeatmap`, `TransactionFilterPanel`, `TransactionList`
- `lib/{categories,currency,forecast,subscriptions}.ts`, `api/{transactions,budgets,insights,goals}`
- `apps/landing` (defer to Phase 7)
- `scripts/reembed-transactions.ts`, finance evals and fixtures

**Fork procedure:** copy the tree without `.git`, `node_modules`, `.env*`, `.vercel`, `.turbo`, `.runs` or `transactions.csv`. Rename `@truffle/*` to `@sproutine/*`, strip in one commit, `pnpm type-check` green, then the first feature commit. That keeps "what we removed" reviewable on its own.

---

## 4. Data model

All in `supabase/migrations/`. RLS `user_id = auth.uid()` on every user table. `foods` and `knowledge_chunks` are public-read with service-role write.

```
profiles          user_id pk→auth.users, display_name, diet enum(omni|veg|vegan|pesc),
                  allergies text[] (EU-14 allergen codes), dislikes text[],
                  budget_weekly_cents int, goals text[] (free tags), quit_date date null,
                  locale text default 'de-DE', voice_id text default 'rosie',
                  safety_mode bool default false, consent_health_at timestamptz,
                  llm_pseudonym uuid default gen_random_uuid()

foods             id, source enum(off|usda|user), source_id, barcode null unique,
                  name, name_de, brand, per_100g jsonb {kcal,protein,fat,carbs,fiber,sugar,salt},
                  allergens text[], default_portion_g int, embedding vector(768),
                  fetched_at, created_by null (user-corrected entries)
                  idx: barcode, trigram on name/name_de, ivfflat on embedding

portion_defaults  food_class text pk, grams int    -- "slice bread"=40, "bowl muesli"=60 …

meal_logs         id, user_id, eaten_at, meal_slot enum(breakfast|lunch|dinner|snack),
                  items jsonb [{food_id, grams, nutrients}], totals jsonb,
                  source enum(voice|text|photo|barcode), is_estimate bool, trace_id

meal_plans        id, user_id, week_start date, plan jsonb (MealPlan schema), status enum(draft|active|archived)
                  unique(user_id, week_start) where status='active'
plan_adjustments  id, plan_id, reason, diff jsonb, created_at
shopping_lists    id, plan_id, items jsonb, est_cost_cents
knowledge_chunks  id, source, section, url, licence, text, embedding vector(768)
goals_habits      id, user_id, type, target, period, streak, last_checkin
habit_checkins    id, habit_id, date, done
chat_messages     Truffle schema + is_proactive, nudge_key (unique per user)
push_subscriptions id, user_id, endpoint, keys jsonb
daily_llm_usage, eval_logs   (Truffle, unchanged)
```

Rules:
- Nutrient numbers are stored per 100 g in `foods`. A log copies the computed nutrients into `items` so later cache corrections don't silently rewrite history.
- `totals` is always `sum(items)` computed in code (`compute_nutrients`), never by a model.

---

## 5. Router changes

Add two task types to `PRIORITY_ORDER`:
```ts
classify:      ['groq', 'cerebras', 'mistral'],      // safety + intent, gpt-oss-20b
'structured':  ['gemini', 'groq', 'cerebras'],        // generateObject for plans/logs
```
- Add a `routedGenerateObject(task, schema, opts)` wrapper. It validates with Zod, retries once with the validation error fed back, then falls through to the next provider.
- Caches: `foods` table (permanent), plus a `guideline_answers` cache keyed by normalised question hash with a 30-day TTL.
- Privacy: prompts carry `llm_pseudonym` and never name or email. Add a unit test that fails if a profile's display_name or email shows up in any built prompt.
- Keep Truffle's `DAILY_LIMITS`. Add a weekly GitHub Action smoke test that pings each provider and model once and opens an issue on failure.

---

## 6. Agent graph

```
START → safetyGate ─┬─ crisis/ED/medical → safeResponse → END
                    └─ ok → intentRouter → { logger | planner | coach | shopping | review | smalltalk } → composer → END
```

State (`Annotation.Root`): `userQuery, profile, intent, safety, recentLogs, activePlan, toolResults, proposal (card payload), agentResponse, citations`.

**Intents:** `log_meal, edit_log, plan_week, adjust_plan, ask_nutrition, shopping_list, daily_review, set_habit, greeting, other`.
Keep Truffle's pattern: keyword fast-path first, LLM fallback second.

| Node | Model task | Tools | Output |
|---|---|---|---|
| safetyGate | classify | — | `{category: ok|ed_risk|crisis|medical, confidence}`. Keyword pre-filter plus classifier, fail **closed** on classifier error for flagged keywords |
| logger | tool-calling | `search_food`, `barcode_lookup`, `estimate_portion`, `compute_nutrients` | `MealLogProposal` → `MealLogCard` |
| planner | structured | `get_profile`, `search_food`, `validate_plan` | `MealPlan` → `PlanChangeCard` |
| coach | fast-chat | `search_knowledge`, `get_recent_logs` | answer + `citations[]` |
| shopping | code + fast-chat | `get_plan`, `price_hints` | `ShoppingList` grouped by aisle |
| composer | fast-chat | — | Rosie-voice wrapper, tone detection, disclaimer where needed |

`validate_plan` is pure code with no model: allergen hits (EU-14 codes on foods vs. profile), dislikes, diet, budget within ±10 %, plus a minimum daily energy floor. That last check is a safety rail, not a target.

---

## 7. Nudges

Event-driven (reuse the pattern):
| Trigger | Where | nudge_key |
|---|---|---|
| Streak milestone (3/7/14/30) | `PATCH /api/habits` | `habit-streak:{id}:{n}` |
| Plan deviation (3+ unplanned meals in a week) | `POST /api/logs` | `deviation:{planId}:{isoWeek}` |
| First barcode / first photo log | `POST /api/logs` | `first:{source}` |

Time-driven (new):
| Trigger | nudge_key |
|---|---|
| No log by 14:00 local | `nolog:{date}` |
| Weekly review (Sunday 18:00 local) | `weekly:{isoWeek}` |
| Plan for next week not drafted (Saturday) | `plan-reminder:{isoWeek}` |

Scheduler: **Supabase `pg_cron` + `pg_net`** calls a protected `/api/cron/nudges` route hourly with a shared-secret header. The route checks which users are inside their local trigger window. That avoids Vercel Hobby's once-a-day cron limit. Fallback is an hourly GitHub Actions schedule, but those are delayed under load.

Safety: when `profile.safety_mode` is on, nudges never mention amounts, calories or missed meals. Only gentle check-ins.

Delivery: write to `chat_messages`, then Web Push if subscribed. Quiet hours run 21:00–08:00 local, with at most one push per day.

---

## 8. Safety spec

- **Signals:** extreme restriction (<1000 kcal intent, multi-day fasting), purging or compensatory exercise, laxatives, "punish", body-hate language, rapid-loss goals, crisis or self-harm language. Medical: pregnancy, diabetes/insulin, kidney disease, eating disorder history, medication interactions.
- **Behaviour:**
  - `ed_risk`: no numbers, no targets. Warm acknowledgement, and set `safety_mode=true` (user can see it and switch it off in settings, with a note).
  - `crisis`: fixed response with the Telefonseelsorge number (0800 111 0 111 / 0800 111 0 222), plus a localised list if locale isn't DE.
  - ED support for DE: BZgA eating disorder line. **Verify the number before shipping.**
  - `medical`: general info only, and "talk to your doctor or a registered dietitian".
- Safe responses are **templated strings**, not model-generated.
- Disclaimer in onboarding and settings: wellness guidance, not medical advice.
- Eval: `safety-golden` dataset with at least 60 cases (40 must-trigger, 20 must-not-trigger, e.g. "I'm fasting for Ramadan" or "low-sugar recipes"). The gate requires a 100 % trigger rate and a false-positive rate of 10 % or less.

---

## 9. Roadmap

Each phase ends with its exit criteria green in CI.

### Phase 0: Foundation (week 1)
- [ ] Name, domain, trademark check (DPMA + EUIPO for "Sproutine")
- [ ] Fork per §3, rename packages, strip commit, CI green
- [ ] New Supabase project (Frankfurt), CLI migrations, `profiles` and Truffle infra tables
- [ ] Re-verify free-tier limits and model IDs; update `router.ts` constants
- [ ] Onboarding with health-data consent checkbox (GDPR Art. 9(2)(a)), stored timestamp
- [ ] Rosie persona in `voices.ts` (German-accented English first, `de-DE` voice when locale is `de`)
- [ ] **Minimal safety gate** (keyword pre-filter + templated responses) wired before every agent
- [ ] Brand pass: palette, icon, manifest, copy

**Exit:** sign in → onboarding → chat answers using profile context; a crisis phrase returns the templated response.

### Phase 1: Food data (weeks 2–3)
- [ ] `packages/food`: OFF client (custom User-Agent, respect rate limits, about 100 req/min product and 10/min search; verify) and USDA FDC client (free API key)
- [ ] Normalise both sources to `per_100g` and EU-14 allergen codes; write-through cache into `foods`
- [ ] `search_food`: cache trigram, then cache vector, then OFF search (DE), then USDA, ranked
- [ ] `compute_nutrients(items[{food_id, grams}])`: pure code, unit-tested
- [ ] `estimate_portion`: `portion_defaults` table, seeded with about 80 German-context portions
- [ ] Barcode scanner component (`BarcodeDetector` → `zxing-wasm` fallback)
- [ ] User-corrected food entries (`source='user'`, scoped to the user until reviewed)
- [ ] ODbL attribution in the footer and about page

**Exit:** a 30-food fixture (15 German packaged by EAN, 15 generic) returns nutrients within ±2 % of the source, and the barcode scans on iOS Safari and Android Chrome.

### Phase 2: Logging (weeks 4–5)
- [ ] Logger agent + `MealLogProposal` Zod schema
- [ ] Text and voice logging ("zwei Scheiben Vollkornbrot mit Käse")
- [ ] `MealLogCard`: edit grams, swap a matched food, confirm, then insert
- [ ] Photo logging: vision → candidate items + grams → `search_food` → card labelled **estimate**
- [ ] `TodaySummary` view (totals, meals by slot; **no** target bars in `safety_mode`)
- [ ] `logging-golden` dataset: 50 utterances (EN/DE mix) with expected `food_id`s and grams ±25 %

**Exit:** at least 80 % of golden logging cases parsed correctly, numeric faithfulness 100 % (card totals = `compute_nutrients` output).

### Phase 3: Planning + shopping (weeks 6–8)
- [ ] `MealPlan` schema (7 days × slots, recipe refs, food_ids + grams)
- [ ] Small seed recipe set (about 60 simple, German-supermarket-friendly recipes as structured JSON) so the planner *selects and adapts* rather than invents
- [ ] `validate_plan` (§6) + repair loop (at most 2 retries, then return the best valid partial with a note)
- [ ] Re-plan on deviation; diff stored in `plan_adjustments`; `PlanChangeCard`
- [ ] Shopping list: aggregate by food, round to pack sizes, group by aisle; `price_hints` static table
- [ ] `WeekView` UI
- [ ] `planning-golden`: 30 profiles (allergy combos, vegan, tight budget)

**Exit:** 100 % of eval plans pass the allergen and diet validators, and at least 95 % come in within budget tolerance.

### Phase 4: Knowledge + coach (weeks 9–10)
- [ ] Resolve source licensing (§11) and record `licence` per chunk
- [ ] Chunker (heading-aware, about 500 tokens, 15 % overlap), embed, load
- [ ] `search_knowledge` (vector + keyword hybrid), Coach agent with inline citations
- [ ] Answer cache
- [ ] `coach-golden`: 40 Q&A items with expected source sections

**Exit:** citation correctness ≥ 0.9 and faithfulness judge ≥ 4.0/5, with the judge from a different model family than the generator.

### Phase 5: Nudges + habits (week 11)
- [ ] `goals_habits` + check-ins, `computeStreak` port
- [ ] Event triggers (§7)
- [ ] `pg_cron` → `/api/cron/nudges`, timezone-aware windows
- [ ] Web Push: VAPID, service worker, subscribe/unsubscribe in settings, iOS "add to home screen" hint
- [ ] Weekly review message (code-computed stats, model only phrases them)

**Exit:** simulated 14-day run fires every expected nudge exactly once, nothing fires in quiet hours, and `safety_mode` nudges contain no numbers.

### Phase 6: Safety + eval hardening (week 12)
- [ ] Expand `safety-golden` to at least 60 cases, adding red-team prompts (role-play, "for a friend", German phrasing)
- [ ] CI gate covers all datasets: `agent-golden` (intent), `logging-golden`, `planning-golden`, `coach-golden`, `safety-golden`
- [ ] GDPR: data export (JSON of all user tables), deletion (extend `api/account/delete` to new tables), privacy policy, records of processing
- [ ] Review each provider's data-use terms; disable any provider that trains on free-tier prompts for health-bearing tasks, or strip health context for it

**Exit:** CI green, safety 100 % trigger, export/delete verified by an e2e test.

### Phase 7: Beta (weeks 13–14)
- [ ] Demo seed + nightly reset (reuse `demo-reset.yml`)
- [ ] Landing page (from `apps/landing`)
- [ ] Invite 10–20 testers; PostHog funnels: onboarding → first log → 3-day streak → first plan
- [ ] In-app feedback (reuse `api/chat/feedback`)
- [ ] Triage and fix the top issues

**Exit:** D7 and W2 retention measured, plus a list of top 5 issues with owners.

---

## 10. Evaluation summary

| Dataset | Evaluators | Initial gate |
|---|---|---|
| `agent-golden` (intents) | exact match | ≥ 0.85 |
| `logging-golden` | food match, grams ±25 %, numeric faithfulness | parse ≥ 0.80, faithfulness = 1.0 |
| `planning-golden` | allergen/diet violation (hard fail), budget ±10 % | violations = 0, budget ≥ 0.95 |
| `coach-golden` | citation correctness, faithfulness (LLM judge), tone | ≥ 0.9 / ≥ 4.0 / ≥ 4.0 |
| `safety-golden` | must-trigger recall, false-positive rate | recall = 1.0, FPR ≤ 0.10 |

Datasets are git-synced via `sync-dataset.ts`. Set the gate after a real baseline run, with margin, as Truffle's `gate.ts` does. Keep `maxConcurrency: 2` for the Gemini free tier. As in Truffle, CI eval jobs get **no Supabase secrets**.

---

## 11. Open decisions

1. **Knowledge sources.** Is DGE/WCRF use allowed (licence request), or should we use openly licensed sources (EFSA DRVs, WHO fact sheets, CC-licensed university material)? This blocks Phase 4.
2. **Language at launch.** EN-only UI with German food names, or full DE UI? This affects Rosie's voice, prompts and eval datasets.
3. **Calorie display.** Show kcal by default, or macros and food groups first with kcal opt-in? Opt-in is safer for the ED-risk persona.
4. **Quit-smoking angle.** Is it just onboarding context, or a feature (cravings → snack swaps)? The second needs care around medical claims.
5. **Provider data terms.** Which free tiers are acceptable for health-bearing prompts? This decides the router order for `structured` and `tool-calling`.

---

## 12. Risks (additions to v1)

| Risk | Mitigation |
|---|---|
| Portion estimation is the real accuracy bottleneck, not food lookup | `portion_defaults`, editable grams on every card, golden set measures grams separately |
| OFF data quality varies (missing nutrients, wrong units) | Validate on ingest (kcal ≈ 4P+4C+9F ±15 %), flag and fall back to USDA generic |
| Planner invents recipes or quantities | Seed recipe library, planner selects and scales, validators in code |
| iOS push only works for installed PWAs | Chat badge stays the primary channel, push is a bonus |
| `pg_cron` hourly job eats into the Groq budget | Nudge text is templated where possible; LLM is used only for weekly review |
