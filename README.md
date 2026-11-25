# Verdicts AI ⚖️🏛️
## Autonomous Global Legal Verdicts, Precedents & Worldwide Legal News Publishing Platform

Verdicts AI is an autonomous, multi-agent AI engine designed to discover, research, synthesize, quality-audit, and publish comprehensive, 12-section definitive legal guides and breaking news dispatches for landmark court rulings across the globe.

---

## 🏗️ Architecture Overview

The system is powered by **LangGraph**, **FastAPI**, **PostgreSQL**, and **NVIDIA NIM** (`nvidia/nemotron-3.5-bolt-e4b`), with multi-source legal data synthesis across **Wikipedia API**, **Wikidata**, and **Tavily Search**, paired with **Wikimedia Commons** for freely licensed judicial and courthouse imagery.

```
       [START]
          │
    ┌─────▼────────────────────────────────────────┐
    │ Node 1: Topic Discovery                      │
    │ (10 Global Jurisdictions & 12 Legal Domains) │
    └─────┬────────────────────────────────────────┘
          │
    ┌─────▼────────────────────────────────────────┐
    │ Node 2: Deduplication Gate                  │
    │ (Canonical Citation & PostgreSQL Index)      │
    └─────┬───────────┬────────────────────────────┘
          │           │ (Duplicate)
          │           └────────────────────────────► [END]
          │ (Novel)
    ┌─────▼────────────────────────────────────────┐
    │ Node 3: Multi-Source Legal Research          │
    │ (Wikipedia REST + Wikidata + Tavily API)     │
    └─────┬────────────────────────────────────────┘
          │
    ┌─────▼────────────────────────────────────────┐
    │ Node 4: 12-Section Judicial Writer           │
    │ (1500+ Words with Statutory & Bench Tables)  │
    └─────┬────────────────────────────────────────┘
          │
    ┌─────▼────────────────────────────────────────┐
    │ Node 5: SEO & Legal Metadata Optimization    │
    │ (Slugs, Bluebook Citations, Legal Taxonomy)  │
    └─────┬────────────────────────────────────────┘
          │
    ┌─────▼────────────────────────────────────────┐
    │ Node 6: Media Discovery                      │
    │ (Wikimedia Commons Attribution & Licensing)  │
    └─────┬────────────────────────────────────────┘
          │
    ┌─────▼────────────────────────────────────────┐
    │ Node 7: 11-Dimension Quality Gate            │
    │ (Score >= 8.0/10.0 to auto-publish)          │
    └─────┬───────────┬────────────────────────────┘
          │           │ (Score < 8.0)
          │           ▼
          │    ┌───────────────────────────────────┐
          │    │ Node 8: Targeted Revisions Loop   │
          │    │ (Iterative Polish & Re-Evaluation)│
          │    └──────┬────────────────────────────┘
          │           │
          │ (Passed)  ▼ (Revisions Exhausted)
    ┌─────▼───────────▼────────────────────────────┐
    │ Node 9: Publisher Service                    │
    │ (Persists, Invalidates Feed, Quota Tracking) │
    └─────┬────────────────────────────────────────┘
          │
        [END]
```

---

## 📋 12-Section Standard Judicial Guide Structure

Every generated landmark verdict adheres to:
1. **Case Overview, Judicial Posture & Historical Context**: Court name, decision year, parties involved, procedural history.
2. **Statutory, Constitutional & Treaty Basis**: Articles of the Constitution, statutory codes, or treaties with comparison tables.
3. **Core Legal Questions & Certified Inquiries**: The precise judicial inquiries (*quaestiones iuris*) certified for review.
4. **Petitioner / Appellant Arguments**: Core contentions, legal doctrines invoked, prior precedents relied upon.
5. **Respondent / Appellee Arguments**: Rebuttals, sovereign immunity or defense doctrines, competing constitutional interests.
6. **Judicial Bench & Deliberation Dynamics**: Presiding Chief Justice, bench composition, voting split (e.g. 9-0, 5-4, 7-6).
7. **The Majority Opinion & Ratio Decidendi**: The binding legal rule, core reasoning, constitutional test formulated.
8. **Concurring Opinions & Alternative Reasoning**: Additional judicial perspectives agreeing with judgment on distinct grounds.
9. **Dissenting Opinions & Counter-Theories**: Vigorous dissents, warnings of future legal instability, doctrines for prospective overruling.
10. **Precedential Impact & Judicial Doctrines Established**: Tests established (Strict Scrutiny, Basic Structure, Proportionality, Chevron, Lemon).
11. **Global Comparative Law & International Reception**: How foreign supreme courts and international tribunals cite the ruling.
12. **Executive Summary, Case Citations & Quick FAQs**: Bluebook/OSCOLA citation table, key takeaways for counsel and citizens, and essential FAQs.

---

## ⚖️ 10 Covered Global Legal Jurisdictions
1. **United States**: Supreme Court of the United States (SCOTUS), Federal Circuit Courts
2. **European Union**: Court of Justice of the European Union (CJEU), General Court
3. **United Kingdom & Commonwealth**: UK Supreme Court, Judicial Committee of the Privy Council
4. **India & South Asia**: Supreme Court of India, State High Courts
5. **International Courts & Tribunals**: International Court of Justice (ICJ The Hague), International Criminal Court (ICC)
6. **Canada & North America**: Supreme Court of Canada
7. **Australia & New Zealand**: High Court of Australia, Supreme Court of New Zealand
8. **Latin America & Inter-American**: Inter-American Court of Human Rights, Brazil STF, Mexico SCJN
9. **East & Southeast Asia**: Supreme Court of Japan, Singapore Apex Courts, South Korea Constitutional Court
10. **Africa & Regional Tribunals**: Constitutional Court of South Africa, African Court on Human and Peoples' Rights

---

## 🚀 Quickstart & Diagnostics

### 1. Database & Config
Verify PostgreSQL connection and schema:
```powershell
python test_db.py
```

### 2. Diagnostics
- **LLM Connectivity**: `python test_nim.py`
- **Topic Discovery**: `python test_discovery.py`
- **Wikipedia & Legal Search**: `python test_research.py`
- **End-to-End Pipeline**: `python test_workflow.py`
- **API Endpoints**: `python test_api.py`

### 3. Running Backend (FastAPI on Port 8002)
```powershell
python run_server.py
```
API Documentation will be available at: `http://127.0.0.1:8002/docs`

### 4. Running Frontend (Vite + React on Port 5175)
```powershell
cd frontend
npm run dev
```
Frontend UI will be accessible at: `http://localhost:5175`

### 5. Background Automation Daemon
To continuously research and publish verdicts & breaking legal news (up to 200/day):
```powershell
python run_automation.py
```
