# Karwan 2.0 — Product Requirements Document

**Status:** Approved implementation direction  
**Product:** Karwan disaster-relief resource optimizer  
**Approach:** Add a separate AI service while preserving the existing application and Express backend

## 1. Product summary

Karwan coordinates disaster-relief requests, depot inventory, allocation, dispatch, and delivery tracking. Karwan 2.0 adds an AI-assisted reporting and explanation layer without replacing the existing operational system.

A reporter can type or record a flood report in Urdu or English. The AI service converts the report into editable structured fields. The reporter reviews the result and confirms it. The confirmed request is then submitted to the existing Karwan API, where the current priority-scoring, allocation, inventory, routing, simulation, and delivery flows continue unchanged.

A coordinator can also use a scoped AI assistant to ask questions about Karwan requests, scores, stock, allocations, and deliveries. The assistant explains facts produced by Karwan; it does not calculate scores, allocate supplies, approve plans, or modify operational data.

**Product principle:** The existing Karwan backend calculates and decides. AI understands and explains.

## 2. Problem

Relief reports often arrive as unstructured calls, messages, and voice notes. A reporter may describe several needs in Urdu or English without following a form. Manually converting every report into structured data is slow and error-prone.

Coordinators can already inspect Karwan's score and allocation reasons, but they may still need help answering natural-language questions such as:

- Why did Badin receive less water?
- Which critical areas remain under-supplied?
- Which depot has the most medicine?
- Why is one request ranked above another?

Karwan 2.0 addresses these problems while retaining the transparent rule-based decision engine already implemented.

## 3. Goals

1. Accept natural-language reports by text or voice in Urdu and English.
2. Convert reports into Karwan's existing request structure.
3. Require human review before a request is saved.
4. Preserve the current Express backend and all existing operational workflows.
5. Add a scoped assistant that explains live Karwan data without inventing numbers.
6. Keep the manual request form available when AI or microphone access fails.
7. Let judges enter the coordinator demo without a login barrier.
8. Keep Gemini credentials exclusively on the AI service.

## 4. Non-goals

Karwan 2.0 will not:

- Replace the existing priority-scoring algorithm with AI.
- Replace the existing allocation algorithm with AI.
- Rewrite the Express backend in Python.
- Move inventory, routing, simulation, or delivery logic to the AI service.
- Let Gemini approve allocations or modify inventory.
- Automatically reject a request based on credibility.
- Add real authentication, WhatsApp, SMS, Sindhi, or multi-stop route optimization in this iteration.

## 5. Users

| User | Primary goal | Main screens |
|---|---|---|
| Community or field reporter | Submit an accurate relief request quickly by voice, natural text, or manual form | Requester |
| Coordinator | Monitor needs, review rankings, generate allocations, and ask questions about decisions | Dashboard, Requests, Allocation, Simulator, Assistant |
| Depot manager | Maintain depot stock, daily capacity, and vehicles | Inventory |
| Driver | Start and complete assigned deliveries | Driver |
| Community requester | Follow an assigned delivery | Tracker |

## 6. Product scope

### 6.1 Required additions

- Natural-language report text area on the requester screen.
- Voice recording for a complete report.
- AI analysis of English and Urdu reports.
- Editable confirmation screen populated from AI output.
- Confidence indicators for extracted fields.
- Clear label when the people count is estimated.
- Manual request entry fallback.
- Scoped coordinator assistant using current Karwan data.
- Text-to-speech for assistant answers using browser speech synthesis when available.
- English/Urdu language selection for new AI interactions.
- Open-demo entry for the coordinator role.
- Separate AI service deployed on Railway or, if necessary, Hugging Face Spaces.

### 6.2 Existing features retained

- Request storage and validation.
- Priority scoring and score breakdowns.
- Adjustable priority weights.
- Allocation generation and approval.
- First-come-first-served comparison.
- Depot inventory, capacity, vehicles, and stock logs.
- Dashboard, maps, routes, and heat layers.
- What-if simulator.
- Driver workflow and delivery progress.
- Requester delivery tracking.
- Supabase persistence and realtime updates.
- Demo reset.

### 6.3 Optional addition

Credibility assessment is an optional second phase. If implemented, it must be isolated from the existing request and allocation logic. Credibility metadata should be stored separately and must never cause automatic rejection.

## 7. Functional requirements

### F1. Analyse a text report

1. The reporter enters a natural-language report.
2. The reporter selects the interface language or leaves automatic language detection enabled.
3. The reporter presses **Analyse report**.
4. The frontend sends the report to the AI service.
5. The AI service returns structured fields and confidence values.
6. The frontend displays the result in the confirmation form.
7. No request is saved during analysis.

The extracted fields are:

- Area
- People affected
- Whether the people count is estimated
- Urgency: low, medium, high, or critical
- Vulnerable groups: children, elderly, or medical
- Supplies: food, water, medicine, or shelter, with quantities
- Accessibility: easy, medium, or hard
- Detected language
- English translation
- Confidence per field

### F2. Analyse a voice report

1. The reporter grants microphone permission.
2. The reporter starts recording and speaks for no more than approximately 30 seconds.
3. The reporter stops the recording or the limit stops it automatically.
4. The frontend sends the audio to the AI service as multipart form data.
5. The AI service transcribes and extracts the report in one operation where possible.
6. The confirmation flow continues as described in F1.

If microphone access is denied, recording is unsupported, or audio cannot be understood, the reporter receives a friendly message and can type or complete the manual form.

### F3. Review and confirm AI output

- AI output must always be editable.
- Missing and low-confidence fields must be visually highlighted.
- Estimated population must be labelled as an estimate.
- Unknown locations require the reporter to place a map pin.
- Existing frontend validation remains active.
- The request is saved only after **Confirm request** is pressed.
- The frontend maps the confirmed result into the existing `POST /api/requests` contract.

### F4. Continue the existing request flow

After confirmation, the existing Express backend:

1. Validates and stores the request.
2. Calculates the priority score.
3. Returns the saved request and score breakdown.
4. Includes the request in rankings, allocation, dashboard, simulation, and delivery workflows.

Gemini must not calculate or override the priority score.

### F5. Coordinator assistant

- The assistant accepts typed questions.
- Voice input may use the AI transcription endpoint.
- The assistant answers only questions about Karwan requests, scores, stock, depots, allocations, routes, and deliveries.
- The AI service obtains current facts from the existing Karwan API.
- Answers must use the numbers and reasons found in that data.
- Off-topic questions return a fixed refusal.
- The answer language follows the selected interface language.
- A speaker button uses browser speech synthesis when a suitable voice is available.

Fixed refusal:

> I can only answer questions about Karwan's requests, stock, allocations, and deliveries.

### F6. Open demo access

- The existing role-based screens remain intact.
- The login screen or landing page provides **Open demo as Coordinator**.
- The button creates the same client-side coordinator session used by the current demo login.
- The user is taken directly to the coordinator dashboard.
- Existing credential-based role selection may remain available.

### F7. Language behaviour

- English and Urdu are supported for AI report input and assistant replies.
- The language selection is included in AI requests.
- New AI-facing interface labels are translated.
- Urdu content uses right-to-left layout.
- Existing untranslated screens may be migrated incrementally, but the requester confirmation and assistant flows must support both languages.

### F8. Optional credibility assessment

If included:

- The AI service returns a score, band, flags, and reasons.
- Bands are Green, Amber, and Red.
- Red means **needs review**, not rejected.
- Metadata is linked to the request ID outside the existing operational request table.
- Coordinators can view credibility reasons and mark a report as verified or rejected.
- Rejected reports must be excluded deliberately through the optional metadata integration; Gemini must never perform the rejection itself.

## 8. User experience requirements

- Show a clear loading state during AI analysis.
- Do not erase the original report when analysis fails.
- Preserve user edits while retrying.
- Explain that the reporter must verify AI-generated fields.
- Show confidence using text or badges, not colour alone.
- Keep the normal manual form accessible at all times.
- Display startup messaging if the AI service is waking from free-host sleep.
- Support approximately 390 px mobile width.

## 9. Success criteria

- An Urdu or English voice report produces an editable structured request.
- Nothing is saved before human confirmation.
- The confirmed request successfully enters the current scoring and allocation flow.
- The existing dashboard, simulator, inventory, driver, and tracker flows continue working.
- The assistant answers an allocation question using the exact stored figures.
- The assistant refuses an unrelated question.
- AI failure does not prevent manual request submission.
- A judge can open the coordinator demo without credentials.
- No Gemini key is exposed in frontend code or browser environment variables.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Gemini quota or outage | Manual form remains available; use timeouts, friendly errors, and limited retries |
| Incorrect extraction | Human confirmation, confidence indicators, and editable fields |
| Assistant invents numbers | Build context from live API data, constrain output, and instruct the model to use only supplied facts |
| Free AI host sleeps | Health endpoint, startup message, and pre-demo wake-up |
| Audio format incompatibility | Use browser-supported `MediaRecorder` MIME type and retain typed input |
| Existing application regression | Keep AI code isolated and leave current operational backend logic unchanged |
| Secrets exposed | Store Gemini keys only in AI-service environment variables |
| Credibility complicates the core flow | Keep it optional and store its metadata separately |

## 11. Delivery phases

### Phase 1 — Required AI sidecar

- AI service health endpoint
- Text and voice intake
- Confirmation interface
- Existing request submission integration
- Scoped assistant
- Open coordinator demo
- Basic English/Urdu support for new flows

### Phase 2 — Optional credibility metadata

- Credibility endpoint
- Separate metadata storage
- Credibility badges and reasons
- Needs-review filter and verification actions

### Phase 3 — Polish

- Wider full-application translations
- Improved voice controls
- Suggested assistant questions
- Caching and quota optimization

