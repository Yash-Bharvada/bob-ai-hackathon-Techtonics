# Grid Load Optimisation & Renewable Energy Performance Advisor RAG Chatbot

A self-contained, production-ready Retrieval-Augmented Generation (RAG) operational advisor designed for power grid control rooms and renewable energy operations.

This standalone service ingests operational telemetry from solar and wind generation assets alongside grid load measurements, builds semantic embeddings stored in Qdrant (local disk or Qdrant Cloud), and provides evidence-grounded operational diagnostics and load-balancing advisories via Groq LLMs (`llama-3.3-70b-versatile`).

---

## Table of Contents
1. [Overview & Capabilities](#1-overview--capabilities)
2. [Architecture](#2-architecture)
3. [System Requirements](#3-system-requirements)
4. [Python Setup](#4-python-setup)
5. [Virtual Environment Setup](#5-virtual-environment-setup)
6. [Dependency Installation](#6-dependency-installation)
7. [Environment Configuration (.env)](#7-environment-configuration-env)
8. [Groq API Key Setup](#8-groq-api-key-setup)
9. [Local Qdrant Mode](#9-local-qdrant-mode)
10. [Remote / Qdrant Cloud Mode](#10-remote--qdrant-cloud-mode)
11. [Placing Real Operational CSV Data](#11-placing-real-operational-csv-data)
12. [Modifying COLUMN_MAP](#12-modifying-column_map)
13. [Testing the CSV Loader](#13-testing-the-csv-loader)
14. [Building & Rebuilding the Qdrant Index](#14-building--rebuilding-the-qdrant-index)
15. [Starting the FastAPI Service](#15-starting-the-fastapi-service)
16. [Example GET /health Request](#16-example-get-health-request)
17. [Example POST /chat Request](#17-example-post-chat-request)
18. [Example cURL Commands](#18-example-curl-commands)
19. [How the RAG Pipeline Works](#19-how-the-rag-pipeline-works)
20. [First-Run FastEmbed Caveat](#20-first-run-fastembed-caveat)
21. [Production Deployment Considerations](#21-production-deployment-considerations)
22. [Exporting & Integrating into Other Applications](#22-exporting--integrating-into-other-applications)

---

## 1. Overview & Capabilities

Grid operators face rapid fluctuations in renewable generation, demand surges, curtailment events, and asset anomalies. This RAG Chatbot operates as a **control-room operational advisor**:

- **Evidence-Grounded Insights**: Strictly answers from retrieved telemetry data; zero fabrication of numbers, asset IDs, dates, or root causes.
- **Structured CSV Aggregation**: Converts timeseries generation telemetry into structured daily operational summaries with computed metrics (total actual kWh, expected kWh, deviation %, average grid load MW, weather notes).
- **Control Room Persona**: Formats output concisely, leading with status, providing 1-2 core data points, and asking single clarifying questions when queries are ambiguous.
- **Safe Recommendations**: Advisories for curtailment or load balancing are delivered strictly as recommendations for operator review, never claiming automated execution.

---

## 2. Architecture

```
                                  +------------------------------------+
                                  |     Operator / Upstream System     |
                                  +------------------------------------+
                                                    |
                                            HTTP POST /chat
                                                    v
+----------------------------------------------------------------------------------------+
| Standalone RAG Chatbot Service (rag-chatbot/)                                          |
|                                                                                        |
|  +---------------------+      +---------------------+      +------------------------+  |
|  | CSV Telemetry Data  | ---> |   ingestion/loader  | ---> | Daily Operational Docs |  |
|  | (data/raw/*.csv)    |      | (Asset + Date Agg)  |      |   with Rich Metadata   |  |
|  +---------------------+      +---------------------+      +------------------------+  |
|                                                                         |              |
|                                                                         v              |
|                                                            +------------------------+  |
|                                                            | FastEmbed Local Model  |  |
|                                                            | (bge-small-en-v1.5)    |  |
|                                                            +------------------------+  |
|                                                                         |              |
|                                                                         v              |
|  +----------------------------------------------------------------------------------+  |
|  | Vector Store: Qdrant (Local Disk or Qdrant Cloud Cluster)                        |  |
|  +----------------------------------------------------------------------------------+  |
|                                          |                                             |
|                                          v Semantic Similarity Search                  |
|                                 +------------------+                                   |
|                                 | Top-K Context    |                                   |
|                                 +------------------+                                   |
|                                          |                                             |
|                                          v                                             |
|                                 +------------------+                                   |
|                                 | Control-Room RAG | <====== System Grounding Prompt   |
|                                 | Chain & Prompt   |                                   |
|                                 +------------------+                                   |
|                                          |                                             |
+------------------------------------------|---------------------------------------------+
                                           v
                             +---------------------------+
                             | Groq LLM API              |
                             | (llama-3.3-70b-versatile) |
                             +---------------------------+
                                           |
                                           v
                             Evidence-Grounded Response
```

---

## 3. System Requirements

- **Python**: 3.12 or higher (compatible with 3.12 and 3.13)
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 2 GB RAM (for FastEmbed ONNX runtime)
- **Internet Access**: Required for initial Hugging Face embedding model download and Groq LLM API requests.

---

## 4. Python Setup

Verify your Python version:
```bash
python --version
# Expected: Python 3.12.x or 3.13.x
```

---

## 5. Virtual Environment Setup

Inside the `rag-chatbot` directory, create and activate an isolated virtual environment:

### Linux / macOS
```bash
cd rag-chatbot
python3 -m venv .venv
source .venv/bin/activate
```

### Windows (PowerShell)
```powershell
cd rag-chatbot
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### Windows (Command Prompt)
```cmd
cd rag-chatbot
python -m venv .venv
.venv\Scripts\activate.bat
```

---

## 6. Dependency Installation

Install all required standalone packages:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 7. Environment Configuration (.env)

Copy the example configuration file:
```bash
cp .env.example .env
```
*(On Windows: `copy .env.example .env`)*

### Supported Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `GROQ_API_KEY` | `string` | *(empty)* | Groq API authentication key |
| `GROQ_MODEL` | `string` | `llama-3.3-70b-versatile` | Groq LLM model name |
| `GROQ_TEMPERATURE` | `float` | `0.1` | Temperature for deterministic operational answers |
| `GROQ_MAX_COMPLETION_TOKENS` | `int` | `1024` | Maximum tokens in generation |
| `QDRANT_MODE` | `string` | `local` | `local` (disk persistence) or `remote` (Qdrant Cloud) |
| `QDRANT_LOCAL_PATH` | `string` | `./data/processed/qdrant` | Local database storage directory |
| `QDRANT_URL` | `string` | *(empty)* | Qdrant Cloud cluster URL (e.g. `https://xxx.cloud.qdrant.io:6333`) |
| `QDRANT_API_KEY` | `string` | *(empty)* | Qdrant Cloud cluster API key |
| `QDRANT_COLLECTION` | `string` | `grid_operations` | Vector collection name |
| `EMBEDDING_MODEL` | `string` | `BAAI/bge-small-en-v1.5` | FastEmbed embedding model |
| `TOP_K` | `int` | `4` | Number of context documents to retrieve |
| `API_HOST` | `string` | `0.0.0.0` | API bind address |
| `API_PORT` | `int` | `8001` | API port |

---

## 8. Groq API Key Setup

1. Obtain an API key from [Groq Console](https://console.groq.com/keys).
2. Add your key to `rag-chatbot/.env`:
```env
GROQ_API_KEY=gsk_your_actual_key_here
```

---

## 9. Local Qdrant Mode

To use embedded on-disk Qdrant storage (no server setup or external cluster required):

```env
QDRANT_MODE=local
QDRANT_LOCAL_PATH=./data/processed/qdrant
QDRANT_COLLECTION=grid_operations
```

The database files will be created automatically in `data/processed/qdrant/` and are excluded from Git.

---

## 10. Remote / Qdrant Cloud Mode

To connect to Qdrant Cloud:

1. Create a cluster on [Qdrant Cloud Console](https://cloud.qdrant.io).
2. Obtain your **Cluster URL** and **API Key**.
3. Update `.env` (no Python code changes needed):

```env
QDRANT_MODE=remote
QDRANT_URL=https://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.us-east4-0.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_cloud_api_key
QDRANT_COLLECTION=grid_operations
```

---

## 11. Placing Real Operational CSV Data

Place any operational CSV telemetry files into:
```
rag-chatbot/data/raw/
```
For example: `rag-chatbot/data/raw/scada_september_2026.csv`.

All `.csv` files inside `data/raw/` are automatically discovered and processed during indexing.

---

## 12. Modifying COLUMN_MAP

If your real CSV uses different column header names, customize `COLUMN_MAP` at the top of `ingestion/loader.py`:

```python
# ingestion/loader.py

COLUMN_MAP = {
    "asset_id": "Turbine_Or_Panel_ID",    # Physical column in your CSV
    "asset_type": "Generation_Type",      # e.g., "Solar" or "Wind"
    "site_name": "Substation_Location",
    "timestamp": "Event_Time_UTC",
    "actual_kwh": "Active_Power_Output_kWh",
    "expected_kwh": "P50_Forecast_kWh",
    "grid_load_mw": "Regional_Demand_MW",
    "weather": "Atmospheric_Observations",
}
```

The loader validates column presence on load and provides informative error messages if any mapped column is absent.

---

## 13. Testing the CSV Loader

To run a dry-run check of CSV parsing, aggregation, and natural-language document generation:

```bash
python -m ingestion.loader
```

This will parse the files in `data/raw/` and print each generated operational document along with its calculated metrics and metadata.

---

## 14. Building & Rebuilding the Qdrant Index

To compute vector embeddings and populate the Qdrant collection:

```bash
python -m ingestion.embed_and_store
```

### CLI Flags:
- `--data-dir <path>`: Custom directory for raw CSVs (default: `data/raw/`).
- `--collection <name>`: Custom collection name (default: from config).
- `--no-recreate`: Upsert documents without wiping the existing collection.

---

## 15. Starting the FastAPI Service

Start the standalone API server:

```bash
python -m api.main
```
Or via Uvicorn:
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

Interactive OpenAPI documentation is available at:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

---

## 16. Example GET /health Request

### Request:
`GET http://localhost:8001/health`

### Response:
```json
{
  "status": "ok"
}
```

---

## 17. Example POST /chat Request

### Request:
`POST http://localhost:8001/chat`

```json
{
  "question": "Why did SOL-001 underperform on September 15, 2026?"
}
```

### Response:
```json
{
  "answer": "SOL-001 at Kutch Solar Park underperformed by -26.22% on 2026-09-15 (actual generation of 4,980.00 kWh vs expected 6,750.00 kWh). Observed telemetry notes Inverter Derating alongside partly cloudy conditions.",
  "sources": [
    {
      "asset_id": "SOL-001",
      "asset_type": "Solar",
      "site_name": "Kutch Solar Park",
      "date": "2026-09-15",
      "actual_kwh": 4980.0,
      "expected_kwh": 6750.0,
      "deviation_pct": -26.22,
      "grid_load_mw": 382.32,
      "weather": "Hazy; Partly Cloudy; Partly Cloudy / Inverter Derating; Clear Sky",
      "relevance_score": 0.8954
    }
  ]
}
```

---

## 18. Example cURL Commands

### Health Check:
```bash
curl -X GET "http://localhost:8001/health"
```

### Chat Query (Asset Anomaly):
```bash
curl -X POST "http://localhost:8001/chat" \
  -H "Content-Type: application/json" \
  -d '{"question": "What was the performance deviation of WND-101 on September 15?"}'
```

### Chat Query (Curtailment / High Load):
```bash
curl -X POST "http://localhost:8001/chat" \
  -H "Content-Type: application/json" \
  -d '{"question": "Did any wind farm experience grid curtailment or feeder trips?"}'
```

---

## 19. How the RAG Pipeline Works

1. **Structured Ingestion**: Time-series telemetry records are grouped by `(asset_id, date)`. For each day, total actual generation, expected generation, deviation percentage, average grid load, and distinct weather events are calculated.
2. **Operational Document Generation**: The group is formatted into a standardized summary with exact numbers and classification (`UNDERPERFORMING`, `SURGE`, or `NOMINAL`).
3. **Local Embedding**: The document text is converted to high-density vector embeddings using FastEmbed (`BAAI/bge-small-en-v1.5`).
4. **Deterministic Storage**: Each record is stored in Qdrant with a deterministic UUID derived from `asset_id` and `date`, ensuring reproducible indexing.
5. **Semantic Retrieval**: Operator queries are embedded and matched against Qdrant's vector index using cosine similarity to fetch the top-k most relevant days and assets.
6. **Strict Evidence-Grounded Generation**: The retrieved operational context is passed to Groq (`llama-3.3-70b-versatile`) with strict control-room guidelines prohibiting hallucinations and unverified causal claims.

---

## 20. First-Run FastEmbed Caveat

> [!NOTE]
> During the very first run of `python -m ingestion.embed_and_store` or `python -m api.main`, FastEmbed downloads the `BAAI/bge-small-en-v1.5` ONNX model (~130 MB) from Hugging Face.
> Ensure that your environment has internet connectivity on the first run. Subsequent runs will use the cached model locally in `~/.cache/fastembed/`.

---

## 21. Production Deployment Considerations

- **Qdrant Cloud**: Set `QDRANT_MODE=remote` with cluster credentials in environment variables for a scalable, highly available vector store.
- **Port Isolation**: Default port is set to `8001` so it runs seamlessly alongside existing services on port `8000`.
- **CORS & Proxying**: CORS is enabled by default for all origins, allowing direct communication from dashboard frontends or reverse proxies (e.g. NGINX).
- **Secrets Management**: Never commit `.env` or API keys. Always supply `GROQ_API_KEY` and `QDRANT_API_KEY` via container secrets or platform environment managers (e.g., Kubernetes Secrets, AWS Secrets Manager, Railway/Render env vars).

---

## 22. Exporting & Integrating into Other Applications

The `rag-chatbot` directory is completely standalone and contains zero imports or dependencies from the host repository.

To copy it into another project:
1. Copy the entire `rag-chatbot/` directory.
2. Run `pip install -r rag-chatbot/requirements.txt`.
3. Set your `.env` variables.
4. Run `python -m ingestion.embed_and_store` to build the index.
5. Start the service via `python -m api.main` or call `RAGChatbotChain` directly in Python.
