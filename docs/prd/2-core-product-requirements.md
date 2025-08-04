# 2. Core Product Requirements

1. **Batch Datasheet Parsing Engine**
   - Accept 50+ PDF datasheets at once
   - Use AI to extract key electrical parameters (e.g., Vth, Ron, BVdss, Qg)
   - Support both GaN and SiC technologies
   - Include a confidence score per extracted value

2. **Curve Digitization Tool**
   - Digitize I-V, C-V, and transfer characteristics from plots
   - Support axis calibration and unit detection
   - Enable overlay of digitized vs original graph

3. **SPICE Model Generator**
   - Output models in ASM-HEMT and MVSG formats
   - Support temperature-dependent behavior
   - Allow user overrides for key parameters
   - Generate `.lib`/`.sp` for Cadence, Keysight, and LTspice

4. **Web Scraper & Market Integration**
   - Continuously crawl major manufacturer sites
   - Extract product specs, datasheets, and categories
   - Organize data into searchable catalog for users
   - Auto-flag new entries or changes (as of July 2025 baseline)

5. **User Interface & Interactivity**
   - Desktop-first UX (Windows/Linux)
   - Visual editing and model validation pane
   - Role-based UI options (Engineer, Manager, Analyst)

6. **Integration & Export Features**
   - Export SPICE models directly to Cadence/Keysight
   - Option to export in project-bundled ZIP with metadata
   - API for future automation or enterprise integration

---
