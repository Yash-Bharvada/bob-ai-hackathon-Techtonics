# VOLTRA — Predictive Grid Intelligence Transformation Plan

## 1. Executive Summary & Vision

### 1.1 Transformation Goal

Rebrand and architect the complete public website from **Farmora** (an agricultural produce marketplace and leaf disease scanner) to **VOLTRA** (an enterprise-grade predictive power-grid intelligence platform).

The transformation preserves and elevates the design language established on the First Page (`src/routes/index.tsx`):

- Soft cream background (`--color-background`, `--cream`)
- Deep ink typography and structural surfaces (`--color-ink`)
- Electric lime/signal accents (`--color-signal`, `--color-lime`)
- Editorial typography pairing: **Space Grotesk** for clean sans headers/telemetry, **Instrument Serif** for italic editorial punch, and **DM Sans** for legibility
- Premium glassmorphism (`glass`, `glass-dark`, backdrop blurs, delicate specular borders)
- Real-time animated telemetry indicators (`power-line` gradient motion, `node-risk` anomaly pulses)

### 1.2 Core Philosophy

> _"The lights have not gone out yet. VOLTRA sees that they are going to."_

Traditional power utility tools respond _after_ failure occurs (fault occurs → power drops → alert triggers → crews scramble). VOLTRA continuously monitors electrical waveforms, asset degradation, and environmental conditions to forecast outages **2.8+ hours in advance**, giving operators the window needed to reroute power, shed load, or dispatch preventive maintenance.

---

## 2. Blueprint from the First Page (Home Reference)

The first page (`src/routes/index.tsx`) defines the target aesthetic, brand voice, visual hierarchy, and telemetry vocabulary for the entire platform:

1. **Brand Identity**: **VOLTRA** — Predictive Grid Intelligence.
2. **Key Metric Anchors**:
   - `99.98%` Grid Online reliability
   - `94.2%` Overall grid health
   - `03` Active anomalies
   - `02` Predicted outage events within 24h
   - `87%` Outage risk on **Transmission Segment 04** with `2.8h` predicted failure window
   - `-38%` Reduction in unplanned utility downtime
3. **Interactive Components Introduced**:
   - `GridDiagram`: Interactive SVG/CSS topological grid map with animated power flow lines and selectable nodes (`stable`, `watch`, `risk`).
   - `FaultAnalysis`: Explainable AI (XAI) risk decomposition showing contributing factors (Voltage Instability 82%, Load Anomaly 76%, Historical Correlation 67%, Temperature 58%).
   - `Analytics`: Recharts 24-hour synchronized telemetry area chart showing load vs. voltage stability.
   - Pill-based navigation and action buttons with subtle glow states.
4. **Target Route Structure**:
   - `/` → **Home** (Product narrative, problem contrast, intelligence pipeline, fault analysis preview)
   - `/market` → **Live Grid** (Real-time network operator console, searchable grid assets, live telemetry, inspector drawer)
   - `/scan` → **Prediction Studio** (Outage prediction sandbox, multi-signal scenario simulator, explainable risk decomposition)
   - `/about` → **Technology** (Grid sensing pillars, ML pipeline architecture, reliability benchmarks, utility compliance)

---

## 3. Discrepancy Audit: Legacy Pages vs. VOLTRA Target

| Route / Asset             | Current Legacy State (Farmora)                                                                                                                      | Required Target State (VOLTRA)                                                                                                                                                                                                                                                                                                         | Discrepancy Severity             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **`/` (Home)**            | Already transformed to VOLTRA Home story with Hero, Problem, Pipeline, Cinematic Grid, Dashboard, Fault Analysis, and Analytics.                    | Preserved as the master reference model for typography, colors, and components.                                                                                                                                                                                                                                                        | Nominal (Reference)              |
| **`/market` (Live Grid)** | **Farmer's Market**: Produce cards (tomatoes, honey, milk), shopping cart, checkout toast, and "List produce" dialog.                               | **Live Grid Operator Console**: Interactive regional network topology, searchable asset directory (substations, lines, transformers), live load/voltage metrics, asset inspector drawer with Recharts telemetry, and telemetry simulation modal.                                                                                       | **Critical (Complete overhaul)** |
| **`/scan` (Prediction)**  | **AI Crop Scan**: Leaf photo uploader, crop hint, plant pathology AI prompt (`gemini-3.5-flash`), disease diagnosis card with symptoms & treatment. | **Outage Prediction Studio**: Multi-signal grid stress simulator, preset crisis scenarios (Heatwave, Lightning Surge, Transformer Aging, Baseload), parameter tuning (load factor, temperature, voltage deviation), oscillogram waveform visualizer, outage probability gauge, time-to-failure window, and preventive action dispatch. | **Critical (Complete overhaul)** |
| **`/about` (Technology)** | **Farmora About**: Cooperative story, 10+ years farming innovation, 85% farmer satisfaction, farm & produce photography.                            | **VOLTRA Technology**: The 4 pillars of grid sensing, 5-stage ML pipeline architecture (Edge filtering → FFT/Wavelets → GNN → Transformers → XAI), empirical utility benchmarks (-38% downtime, 14.2 GW monitored), and NERC CIP/IEC 61850 compliance.                                                                                 | **Critical (Complete overhaul)** |
| **Data Layer**            | `marketData.ts` (produce items, farmers, prices in €) & `scan.functions.ts` (plant pathology prompt).                                               | `gridData.ts` (substations, transmission corridors, transformers, live telemetry metrics, event logs) & `prediction.ts` (physics-informed ML simulation engine).                                                                                                                                                                       | **High (Replace data model)**    |
| **Visual Assets**         | `hero-farm.jpg`, `produce.jpg`, `leaf.jpg`                                                                                                          | Grid diagrams, transmission photography (`voltra-home.jpg`, `voltra-grid.jpg`), waveform traces, and technical schematics.                                                                                                                                                                                                             | **Medium (Asset alignment)**     |

---

## 4. Page-by-Page Detailed Specifications

### 4.1 Route `/market` — Live Grid Operator Console

#### Purpose

A real-time operator workspace displaying the health, electrical load, voltage stability, and active anomalies across the entire distribution network. Operates without authentication to deliver an immediate, high-impact operator experience.

#### Layout & Components

1. **Console Header**:
   - Status badge: `LIVE TELEMETRY · SYNCHRONIZED` with pulsing signal beacon.
   - Live UTC timestamp display.
   - Headline: _"Real-time state of the distribution network."_
   - Subtitle: _"Continuous health monitoring, voltage stability, and thermal tracking across regional transmission lines, substations, and distribution feeders."_
   - Action buttons: "Simulate Surge", "Export Telemetry (CSV)", and "Register Grid Asset".
2. **Network Topology Map View**:
   - Embedded interactive `GridDiagram` component.
   - Nodes represent actual physical assets:
     - `S01`: North Intake (400 kV · Stable · 42% Load)
     - `S02`: West Substation (220 kV · Stable · 58% Load)
     - `S03`: Central Bus (132 kV · Watch · 78% Load)
     - `S04`: Segment 04 Corridor (132 kV · Critical Risk · 91% Load)
     - `S05`: East Feeder Cluster (33 kV · Stable · 49% Load)
   - Selecting any node highlights the corresponding asset card and opens the deep-dive inspector.
3. **Filter & Search Bar**:
   - Search input: Filter by asset name, ID, region, or substation tag.
   - Classification filter pills: `All Assets`, `Transmission Lines`, `Substations`, `Transformers`, `Distribution Feeders`.
   - Health status filter pills: `All Status`, `Critical Risk (1)`, `Watch / Degraded (1)`, `Nominal (6)`.
   - Voltage class selector: `All kV`, `400 kV`, `220 kV`, `132 kV`, `33 kV`.
4. **Asset Directory Cards**:
   - Each card features:
     - Asset ID badge and classification pill.
     - Status indicator (pulsing danger dot for Risk, amber dot for Watch, lime dot for Stable).
     - Live metrics grid:
       - **Load**: Current MW / % of rated capacity (with dynamic progress bar).
       - **Voltage**: Current kV and % deviation from nominal.
       - **Frequency**: Measured Hz (e.g., 50.02 Hz).
       - **Temperature**: Core/conductor temperature in °C.
     - Anomaly counter badge (e.g., `2 Active Anomalies`).
     - Quick actions: "Inspect Telemetry" (opens slide-over drawer) and "Reroute Flow".
5. **Asset Telemetry Inspector (Slide-over Drawer / Modal)**:
   - Deep-dive panel when an operator clicks an asset:
     - Complete asset specifications (Commissioned date, manufacturer, rated capacity MVA, cooling type).
     - **Recharts 24-Hour Waveform**: Synchronized load (MW) and voltage fluctuation curve.
     - Real-time diagnostic sensor status: SF6 gas pressure, acoustic partial discharge, thermal dissipation gradient.
     - Incident timeline / event log for that asset.
     - Operator intervention controls: "Shed Load (-15 MW)", "Activate Forced Cooling", "Trigger Diagnostic Ping".
6. **Live Telemetry Event Ticker**:
   - Scrolling feed of real-time events (e.g., _"13:41 UTC: Harmonic distortion on Bus S03 normalized"_, _"13:38 UTC: Phase imbalance detected on Segment S04 (+4.2%)"_).
7. **Grid Simulation / Asset Registration Modal** _(replaces legacy SellDialog)_:
   - Allows operators to inject a virtual telemetry disturbance or register a new grid sensor node with custom parameters.

---

### 4.2 Route `/scan` — Outage Prediction Studio

#### Purpose

A predictive intelligence workspace allowing operators, power engineers, and grid planners to stress-test grid segments under simulated or real-time conditions and receive explainable failure forecasts before power is lost.

#### Layout & Components

1. **Studio Header**:
   - Badge: `OUTAGE PREDICTION STUDIO · ML ENGINE v4.2`
   - Headline: _"Simulate grid stress. Forecast the failure window."_
   - Subtitle: _"Run multi-signal predictive models across high-voltage corridors. VOLTRA evaluates electrical transients, load saturation, and meteorological stress to project outage probability hours ahead."_
2. **Split-Screen Studio Architecture**:
   - **Left Column: Simulation Controls & Telemetry Input**:
     - **Target Asset Selector**: Choose from monitored assets (Transmission Segment 04, Central Bus S03, Substation Alpha Transformer, etc.).
     - **Preset Scenario Quick-Picks**:
       - ⚡ _Severe Summer Heatwave & Peak Demand_ (Load: 94%, Ambient: 42°C, Conductor Sag: Elevated).
       - 🌩️ _Extreme Thunderstorm & Lightning Transient_ (Voltage spikes: ±14%, Wind: 65 knots, Surge Risk: High).
       - ⚙️ _Aging Transformer & Harmonic Resonance_ (Core Temp: 92°C, Dissolved Gas: Warning, Wear: 85%).
       - 🍃 _Nominal Baseload Grid Balance_ (Load: 48%, Temp: 21°C, Nominal 50.0 Hz).
     - **Live Parameter Tuning Sliders**:
       - _Load Capacity_: 20% to 150% (color shifts from lime to amber to red as capacity exceeds 85%).
       - _Ambient Temperature_: -10°C to +50°C.
       - _Voltage Fluctuation_: -15% to +15% deviation.
       - _Severe Weather Condition_: Clear, Heavy Gale, Ice Storm, Severe Lightning.
       - _Asset Operating Age / Wear_: 0% (New) to 100% (End-of-life).
     - **Waveform / SCADA Trace Selector**:
       - Interactive oscillogram waveform preview.
       - Operator toggle: "Use Live SCADA Stream" or "Load Anomaly Waveform Sample".
     - **Action Button**:
       - _"Run Outage Prediction"_ button with animated computing state (calculating multi-variate correlations, transient stability, thermal degradation curve).
   - **Right Column: Predictive Intelligence & XAI Output**:
     - **Outage Probability Gauge**:
       - Large high-contrast risk meter (e.g., **87%** with elevated risk badge).
       - State-based color styling (Lime for <30%, Amber for 30-70%, Red for >70%).
     - **Predicted Time-to-Failure Horizon**:
       - Estimated failure countdown window: **2.8 hours (± 25 min)**.
     - **Cascading Impact & Downstream Footprint**:
       - Number of downstream feeders affected (e.g., 4 feeders).
       - Dependent industrial facilities & estimated consumer accounts (e.g., ~38,400 customers).
     - **Explainable AI (XAI) Factor Decomposition**:
       - Horizontal bar breakdown of weighted risk contributors:
         - _Voltage Instability_: 82%
         - _Peak Load Saturation_: 76%
         - _Historical Failure Correlation_: 67%
         - _Ambient Thermal Dissipation_: 58%
         - _Harmonic Distortion_: 41%
     - **12-Hour Projected Fault Trajectory Chart**:
       - Recharts area/line chart showing the projected degradation trajectory over the next 12 hours against the critical tripping threshold.
     - **Recommended Preventive Dispatch Protocols**:
       - Ranked mitigation actions:
         1. _Divert 35 MW load through Western Corridor B_ (Lowers failure risk by 64%).
         2. _Force-start Substation Auxiliary Cooling Fans_ (Lowers thermal gradient by 16°C).
         3. _Pre-dispatch emergency repair crew to Segment 04 junction box_.
     - **Export & Action Bar**:
       - "Export Incident Briefing (PDF/JSON)", "Trigger Automated Rebalancing", "Send Control Room Alert".

---

### 4.3 Route `/about` — Technology & Methodology

#### Purpose

A technical authority page explaining the physics, sensor telemetry, and machine learning architecture that powers VOLTRA's predictive capability, designed to build trust with utility executives and grid operators.

#### Layout & Components

1. **Hero Header**:
   - Navigation pill tabs: `Architecture`, `Sensor Pillars`, `ML Pipeline`, `Reliability Metrics`, `Compliance`.
   - Headline: _"The science of outage prevention."_
   - Subtitle: _"How VOLTRA converts raw electromagnetic waveforms, physical asset diagnostics, and atmospheric telemetry into actionable failure forecasts before physical damage occurs."_
2. **The 4 Pillars of Grid Sensing**:
   - **Pillar 01 — Synchronized Electrical Telemetry**:
     - Phasor Measurement Units (PMU) sampling at 50/60 Hz, micro-transients, sub-cycle voltage sag, phase angle deviation, and total harmonic distortion (THD).
   - **Pillar 02 — Physical Asset Diagnostics**:
     - Transformer dissolved gas analysis (DGA), fiber-optic winding temperature, acoustic partial discharge detection, and SF6 gas pressure telemetry.
   - **Pillar 03 — Hyperlocal Meteorological Feeds**:
     - Conductor line temperature, wind gusts inducing line galloping, real-time lightning strike proximity sensors, and ambient humidity/icing metrics.
   - **Pillar 04 — Historical Failure Archives**:
     - 15+ years of cascading blackout post-mortems, failure signature libraries, and component-specific degradation curves.
3. **The 5-Stage Machine Learning Pipeline**:
   - Visual sequential pipeline diagram:
     1. _Ingestion & Edge Filtering_: 50,000 samples/sec filtered at substation edge gateways to eliminate sensor noise.
     2. _Feature Extraction_: Continuous Wavelet Transform (CWT) and Fast Fourier Transform (FFT) isolating transient fault signatures.
     3. _Graph Neural Network (GNN)_: Spatial topology modeling capturing interconnected bus and feeder interdependencies to detect cascading risks.
     4. _Temporal Transformer Model_: Multi-horizon attention architecture forecasting failure probabilities from 15 minutes to 48 hours.
     5. _Explainable AI (XAI) Attribution_: SHAP-based feature weighting giving dispatchers the exact physical reason for elevated risk.
4. **Empirical Reliability & Impact Benchmarks**:
   - High-impact stat callouts:
     - **99.98%** Predictive forecast accuracy across transmission-level assets.
     - **−38%** Reduction in unplanned grid downtime across pilot utility deployments.
     - **2.5 Hours** Average advance warning window before physical arc faults or insulation breakdown.
     - **14.2 GW** Cumulative generation and transmission capacity actively monitored.
5. **Utility Standards, Security & Deployment**:
   - **NERC CIP Compliance**: Built to meet critical infrastructure protection requirements.
   - **IEC 61850 Native**: Seamless integration with existing utility SCADA and substation automation protocols.
   - **Deployment Model**: Cloud-hosted, hybrid, or 100% on-premises air-gapped substation appliances.
6. **Closing Action Block**:
   - "Ready to modernize your transmission intelligence? Schedule a technical architecture walkthrough with our grid systems team."

---

## 5. Shared Design System & Token Integration

All pages strictly follow the design tokens established in `src/styles.css`:

```css
--background: oklch(0.985 0.005 90); /* Soft neutral canvas */
--foreground: oklch(0.15 0.02 150); /* Deep ink text */
--cream: oklch(0.98 0.008 90); /* Editorial cream surface */
--ink: oklch(0.14 0.015 150); /* Deep obsidian ink */
--signal: oklch(0.88 0.21 125); /* Electric lime accent */
--signal-foreground: oklch(0.15 0.025 150);
--warning: oklch(0.76 0.16 75); /* Amber watch indicator */
--danger: oklch(0.62 0.2 28); /* Red critical risk indicator */
```

### Key Utilities & Motion

- `glass`: Translucent white card with blur and subtle border for daytime/primary surfaces.
- `glass-dark`: Obsidian ink surface with blur and light specular border for high-contrast telemetry panels.
- `pill`: Fully rounded pill buttons and badges (`border-radius: 999px`).
- `power-line`: Animated linear-gradient showing active power flow.
- `node-risk`: Pulsing shadow effect for anomalous components.
- `prefers-reduced-motion`: Fully respected across all animations and transitions.

---

## 6. Data Architecture & State Models

### 6.1 Grid Asset Model (`src/lib/gridData.ts`)

```typescript
export type GridAssetType =
  | "Transmission Corridor"
  | "Substation"
  | "Transformer"
  | "Distribution Feeder"
  | "Generation Intake";

export type AssetStatus = "stable" | "watch" | "risk";

export interface GridAsset {
  id: string; // e.g. "S04"
  name: string; // e.g. "Transmission Segment 04"
  substation: string; // e.g. "Northern Intertie"
  region: string; // e.g. "Sector 7 - West Grid"
  type: GridAssetType;
  voltageKv: number; // e.g. 132
  nominalVoltageKv: number; // e.g. 132
  currentLoadMw: number; // e.g. 182
  ratedCapacityMw: number; // e.g. 200
  frequencyHz: number; // e.g. 49.88
  coreTempC: number; // e.g. 74.2
  healthScore: number; // e.g. 46 (0-100)
  status: AssetStatus;
  activeAnomalies: number;
  lastInspected: string;
  telemetryHistory: { time: string; loadMw: number; voltageKv: number; tempC: number }[];
  incidentLog: { timestamp: string; message: string; severity: "info" | "warning" | "critical" }[];
}
```

### 6.2 Prediction Engine Model (`src/lib/prediction.ts`)

```typescript
export interface ScenarioInput {
  assetId: string;
  loadFactorPercent: number; // 20 - 150%
  ambientTempC: number; // -10 to +50°C
  voltageDeviationPercent: number; // -15 to +15%
  weatherCondition: "clear" | "gale" | "ice" | "lightning";
  equipmentWearPercent: number; // 0 - 100%
}

export interface PredictionResult {
  assetId: string;
  outageRiskPercent: number; // 0 - 100%
  predictedFailureHours: number; // e.g. 2.8
  confidenceIntervalHours: number; // e.g. 0.4
  affectedFeedersCount: number; // e.g. 4
  affectedCustomersEst: number; // e.g. 38400
  riskFactors: { name: string; weightPercent: number }[];
  trajectory: { hour: number; projectedRisk: number; safeThreshold: number }[];
  recommendedActions: {
    action: string;
    impactReductionPercent: number;
    priority: "high" | "medium" | "low";
  }[];
}
```

---

## 7. Step-by-Step Implementation Roadmap

- [ ] **Phase 1: Grid Data & Prediction Models**
  - Create `src/lib/gridData.ts` with comprehensive mock assets (Segment 04, Central Bus, North Intake, West Substation, East Feeder, Step-Down Transformer Alpha, Industrial Feed B, etc.).
  - Create `src/lib/prediction.ts` with deterministic, physics-informed prediction logic calculating realistic outage risk, time-to-failure, and factor weights.
- [x] **Phase 2: Live Grid Operator Console (`src/routes/grid.tsx`)**
  - Implement `grid.tsx` as the **Live Grid** console.
  - Implement the search & multi-tier filter bar (Asset Type, Health Status, Voltage Class).
  - Integrate the interactive topological `GridDiagram` with node selection.
  - Build the rich telemetry asset cards displaying load %, voltage dev, Hz, temperature, and anomaly status.
  - Build the slide-over Asset Telemetry Inspector with Recharts waveform and diagnostic sensors.
  - Build Community Incident Reporting modal.
  - Update page SEO/OpenGraph metadata to VOLTRA Live Grid.
- [x] **Phase 3: Outage Prediction Studio (`src/routes/predict.tsx`)**
  - Implement `predict.tsx` as the **Outage Prediction Studio**.
  - Build the scenario preset selector (Heatwave, Lightning Surge, Transformer Aging, Baseload).
  - Implement interactive tuning sliders (Load capacity, Ambient temperature, Voltage fluctuation, Equipment wear).
  - Implement the oscillogram waveform analyzer view.
  - Build the prediction results view: Outage Probability Gauge, Time-to-Failure countdown, Downstream customer footprint, and Explainable AI factor decomposition.
  - Integrate the 12-hour projected fault trajectory Recharts curve.
  - Implement recommended preventive actions and report export.
  - Update page SEO/OpenGraph metadata to VOLTRA Outage Prediction.
- [x] **Phase 4: Technology & Methodology (`src/routes/technology.tsx`)**
  - Implement `technology.tsx` as the **VOLTRA Technology** page.
  - Build the 4 Pillars of Grid Sensing cards with technical iconography and clean layout.
  - Build the 5-Stage Machine Learning Pipeline architecture visualization.
  - Build the Empirical Reliability Benchmarks section (99.98% accuracy, -38% downtime, 2.5h advance warning).
  - Implement NERC CIP, IEC 61850 compliance and utility security section.
  - Update page SEO/OpenGraph metadata to VOLTRA Technology.
- [ ] **Phase 5: Agricultural Cleanup & Asset Alignment**
  - Verify that no agricultural/crop copy or obsolete produce references remain across navigation, footer, error pages, or active routes.
  - Maintain build integrity and clean code separation.
- [ ] **Phase 6: End-to-End Verification & Quality Assurance**
  - Run `bun run build` to guarantee zero type, lint, or bundling errors.
  - Test all navigation links across desktop and mobile screen viewports.
  - Test all interactive flows: node selection, asset filtering, drawer opening, scenario simulation, slider adjustments, and report generation.

---

## 8. Verification & Acceptance Checklist

1. **Brand Consistency**:
   - [ ] No mentions of Farmora, produce, vegetables, leaf scanning, or agricultural cooperatives remain in user-facing UI.
   - [ ] Every page reflects VOLTRA's predictive power-grid intelligence identity.
2. **Visual & Aesthetic Polish**:
   - [ ] Glassmorphism surfaces (`glass`, `glass-dark`) render crisply with high contrast.
   - [ ] Editorial typography (Space Grotesk + Instrument Serif + DM Sans) applies consistently.
   - [ ] Power lines and risk pulses animate smoothly without layout thrashing.
3. **Interactive Functionality**:
   - [ ] Live Grid (`/market`): Node selection syncs with asset directory; filters narrow down assets; detail drawer displays live Recharts waveform; simulation modal opens and updates asset state.
   - [ ] Prediction Studio (`/scan`): Preset scenarios dynamically update sliders; sliders immediately alter risk calculations; "Run Outage Prediction" delivers an animated calculation cycle; explainable AI factor bars and 12-hour degradation curves reflect parameters.
   - [ ] Technology (`/about`): Clean responsive grid explaining sensor pillars, ML pipeline, and utility benchmarks.
4. **Performance & Build**:
   - [ ] Full project builds cleanly with `bun run build` without any compiler or TypeScript errors.
   - [ ] Zero runtime console errors across all 4 routes.
   - [ ] Fully responsive on mobile (375px), tablet (768px), and desktop (1280px+).
