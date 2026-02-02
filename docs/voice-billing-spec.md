# Voice-Driven Billing Specification

## 1. Purpose & Goals
- **Primary Objective:** Allow cashiers to add items to a bill hands-free by speaking product names in either Tamil or English while maintaining accuracy in crowded store environments.
- **Key Outcomes:**
  1. Recognize spoken product and quantity commands with ≥95% confidence in <1.5s latency for top-selling SKUs.
  2. Mitigate ambient noise (up to ~75 dB SPL) so commands remain reliable at busy checkouts.
  3. Integrate seamlessly with existing POS billing, loyalty, discount, and PDF generation flows without duplicating business logic.

## 2. Assumptions & Non-Goals
- Assumes browsers support `getUserMedia`. For legacy desktop apps, we rely on Electron shell parity (future work).
- Not attempting speech synthesis (voice replies). Only recognition and billing automation are in scope.
- Hardware acoustic echo cancellation (AEC) is assumed; software stack adds another layer.

## 3. User Personas & Flows
1. **Cashier (primary):**
   - Toggles the "Voice Billing" control within the POS Billing tab.
   - Selects preferred language (Tamil / English / Auto).
   - Speaks commands like "Add three Heritage Milk" or "மலர் சோப்பு இரண்டு".
   - Receives visual confirmation chips showing interpreted command and matched product(s).
   - Confirms or rejects matches before the bill updates.
2. **Supervisor (secondary):**
   - Configures microphone sensitivity thresholds and store-specific hotwords from Settings → Devices.

### Happy Path Flow
1. Cashier taps **Start Voice Billing**.
2. Microphone check & VAD (voice activity detection) gate the stream.
3. Language auto-detect model picks Tamil or English; manual override stays honored for the session.
4. STT returns transcript + confidence. Parser extracts `{action, product, quantity}`.
5. Product fuzzy-matched against inventory (weighted by SKU popularity). If confidence ≥ threshold, it calls existing `addProduct` → `BillItem` pipeline.
6. UI displays success toast; PDF/email logic remains unchanged.

### Edge Cases
- **Low confidence:** Show inline dialog with top 3 matches; require button selection.
- **Ambient spike:** Automatic pause + prompt “Can you repeat?” with icon.
- **Mixed-language commands:** Auto mode splits Tamil/English segments and reruns detection per chunk.

## 4. Functional Requirements
1. **Voice Session Controls**
   - Button group (Start/Pause/Stop) inside `POSBilling` above `ProductSearch`.
   - Visual meter for input level + status badges (Listening, Processing, Error).
2. **Language Handling**
   - Reuse `LanguageContext` state, extend to include `voiceLanguagePreference` ("en" | "ta" | "auto").
   - Auto mode runs language ID (fastText-lite) on buffered MFCCs (~500 ms window) before STT.
3. **Command Grammar**
   - Supported intents v1: `add <qty?> <product>`, `remove <qty?> <product>`, `hold bill`, `clear bill`.
   - Tamil grammar examples: "<product> <qty> போடு" etc. Provide phrase library for supervised training.
4. **Product Matching**
   - Use `/products?search=` endpoint with fuzzy score (Jaro-Winkler) plus fallback to `/product/{code}`.
   - Maintain in-memory hotlist of the last 50 scanned SKUs for rapid lookup.
5. **Billing Integration**
   - After confirmation, call existing `addProduct`/`updateItem` functions to reuse discount, tax, and loyalty logic.
   - Voice-triggered items flagged with `source: "voice"` for analytics (extend `BillItem` type).
6. **Error Handling & UX**
   - Confidence < threshold → toast + suggestions list.
   - Timeouts (>5s no speech) → auto-pause to reduce processor load.
   - Offline mode: message guiding cashier to manual search.

## 5. Technical Architecture
```
Mic Stream → Web Audio Graph → Noise Cancellation → Voice Activity Detection →
  (a) Language ID Router ──► Tamil STT (Azure Speech) ─┐
                      └──► English STT (Web Speech API / Azure) ─┤
                                           ▼                    │
                                     Command Parser              │
                                           ▼                    │
                                 Product Resolver + Confidence   │
                                           ▼                    │
                                     Billing Mutation Layer ◄────┘
```

### 5.1 Client Capture & Noise Mitigation
- **Media constraints:** `noiseSuppression: true`, `echoCancellation: true`, `autoGainControl: false` (manual gain).
- **Custom DSP:**
  - Apply RNNoise WASM module for spectral subtraction when SPL spikes >60 dB.
  - Adaptive Wiener filter tuned via calibration wizard (captures 5 sec ambient sample).
  - Use WebRTC `AudioWorklet` to run both RNNoise and VAD (WebRTC VAD or Picovoice Leopard VAD).
- **Beamforming Option:** For multi-mic POS setups, allow selection of pre-configured USB mic array and apply simple delay-and-sum algorithm (optional advanced mode).

### 5.2 Speech-to-Text Stack
- **Service:** Azure Speech SDK (supports Tamil + English with diarization & noise robustness). Keep provider pluggable.
- **Latency Strategy:**
  - Send interim hypotheses every 500 ms; update UI chips live.
  - Final result triggers parser only when `isFinal` flag true.
- **Fallback:** Browser Web Speech API for demo environments if Azure key missing (English only) + banner warning.

### 5.3 Command Parsing & Validation
- Deterministic parser using chevrotain grammar for both languages; lexicons stored in `/server/config/voice-commands.json`.
- Normalization:
  - Tamil numerals → integers.
  - Synonym table (e.g., "பால்" -> "Milk").
- Confidence scoring = `min(STT_confidence, product_match_confidence)`.

### 5.4 Backend Touchpoints
- **New Endpoint:** `POST /voice/session` (issue signed token + config such as noise profile).
- **WebSocket `/voice/stream`**
  - Accepts Opus chunks (16 kHz) or transcribed text payloads.
  - Emits events: `transcript`, `command`, `actionResult`, `error`.
- **Audit Logging:** Persist each voice action (`billId`, `commandText`, `confidence`, `resolvedProductId`, `userId`).

## 6. Noise Cancellation Strategy
1. **Hardware-Level:** Encourage POS headsets with cardioid pickup; document recommended models in deployment guide.
2. **Software-Level:**
   - Calibrate noise profile per counter and save in `localStorage` (per device) + optional server sync for shared kiosks.
   - RNNoise handles stationary background; spectral gating handles transient noises (scanner beeps).
   - Multi-band noise gate: high-pass at 120 Hz to drop HVAC rumble, low-pass at 7 kHz to reduce chatter spikes.
   - Post-processing SNR target = 20 dB; if below 12 dB, automatically prompt cashier to pause.

## 7. Security & Privacy
- Microphone permissions scoped to POS origin; show persistent recording indicator.
- All audio/transcript traffic encrypted via WSS with short-lived JWT (5 min) issued by `/voice/session`.
- Configurable retention: audio discarded post transcription by default; transcripts logged only for audit.

## 8. Performance & Reliability
- Max CPU utilization per station ≤30% on Intel i3 (8th gen). RNNoise chunk size tuned to 10 ms buffers.
- Implement exponential backoff for STT API retries; degrade to offline commands if failure >3 times/min.
- Add monitoring hooks (statsd events: `voice.latency`, `voice.confidence`, `voice.errors`).

## 9. UI/UX Additions
- **Voice HUD Component:**
  - Waveform visualizer + badges (Listening / Processing / Muted).
  - Transcript chips with edit icons for quick correction.
- **Settings Enhancements:**
  - Language preference dropdown syncs with Language selector.
  - Slider for microphone sensitivity.
  - Test microphone utility (records 3s, plays back with noise score).

## 10. Testing Strategy
- **Unit:** Parser grammar, fuzzy matcher, confidence scoring, Tamil numeral conversion.
- **Integration:** Cypress test mocking Web Speech + verifying bill items added via command events.
- **Load:** Simulate simultaneous voice sessions (max 5 per store) via mocked WebSocket stream.
- **Field Pilot:** Capture telemetry for top 100 product names; compare voice vs manual entry time savings.

## 11. Rollout Plan
1. **Phase 1 (Lab):** Enable behind feature flag `voiceBilling.enabled`. Use demo inventory dataset.
2. **Phase 2 (Pilot Stores):** Collect feedback on noise parameters, iterate thresholds.
3. **Phase 3 (General Availability):** Enable for all tenants with optional Tamil-only or English-only presets.

## 12. Open Questions
- Should we support mixed-language commands within a single sentence for GA or defer to v2?
- Customer-specific nicknames ("regular milk") – handle via per-store synonym mapping?
- Need to investigate licensing implications of bundling RNNoise WASM.
