/**
 * SIH Geo-Climate Multi-Hazard Intelligence System
 * Core Application Logic & Geospatial Engine
 * Enhanced with Multi-Task AI Nowcasting, Explainable AI & Automated Early Warning
 */

// Global State
const STATE = {
  srtmMeta: null,
  srtmGrid: null,
  gpmData: null,
  imdaaData: null,
  stationsData: null,
  modelsData: null,
  
  // Map layers
  map: null,
  srtmLayer: null,
  gpmLayer: null,
  markersLayer: null,
  inspectMarker: null,
  
  // Nowcasting prediction horizon: NOW, +2_HOURS, +4_HOURS, +6_HOURS
  currentHorizon: "NOW",
  selectedStationId: null,
  
  // Timeline animation (GPM Daily)
  currentDay: 1,
  isPlaying: false,
  playTimer: null,
  
  // Extreme event simulator factors
  simRainAdd: 0,
  simSlopeMult: 1.0,
  simTempAdd: 0,
  
  // Charts
  chartPrecip: null,
  chartTemp: null,
  chartTransect: null,
  chartScatter: null
};

// DOM ready initialization
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[*] Initializing SIH Multi-Hazard Nowcasting Engine...");
  setupEventListeners();
  await loadAllDatasets();
  initMap();
  initCharts();
  
  // Select highest risk station by default for XAI panel
  if (STATE.stationsData && STATE.stationsData.stations.length > 0) {
    STATE.selectedStationId = STATE.stationsData.stations[0].id;
  }
  
  renderAllComponents();
  console.log("[*] SIH Multi-Hazard Prototype ready!");
});

// -------------------------------------------------------------
// DATA LOADING
// -------------------------------------------------------------
async function loadAllDatasets() {
  try {
    const [srtmMetaRes, srtmGridRes, gpmRes, imdaaRes, stationsRes, modelsRes] = await Promise.all([
      fetch("data/srtm_metadata.json"),
      fetch("data/srtm_grid.json"),
      fetch("data/gpm_daily_timeseries.json"),
      fetch("data/imdaa_climate_stats.json"),
      fetch("data/stations_risk.json"),
      fetch("data/model_benchmarks.json")
    ]);

    STATE.srtmMeta = await srtmMetaRes.json();
    STATE.srtmGrid = await srtmGridRes.json();
    STATE.gpmData = await gpmRes.json();
    STATE.imdaaData = await imdaaRes.json();
    STATE.stationsData = await stationsRes.json();
    STATE.modelsData = await modelsRes.json();

    console.log("[*] All scientific datasets and nowcasting models loaded successfully.");
  } catch (err) {
    console.error("[!] Error loading datasets:", err);
  }
}

// -------------------------------------------------------------
// UNIFIED COMPONENT RENDERING
// -------------------------------------------------------------
function renderAllComponents() {
  updateStationMarkers();
  renderStationsList();
  renderRiskTable();
  renderAutomatedAlerts();
  renderExplainableAIPanel();
  updateKPIs();
  updateScatterChart();
}

// -------------------------------------------------------------
// LEAFLET MAP ENGINE
// -------------------------------------------------------------
function initMap() {
  STATE.map = L.map("leaflet-map", {
    center: [12.8, 76.5],
    zoom: 7,
    minZoom: 4,
    maxZoom: 16
  });

  const darkMatter = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | SRTM &bull; GPM &bull; IMDAA',
    maxZoom: 19
  });

  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  });

  const openTopo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenTopoMap'
  });

  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap'
  });

  darkMatter.addTo(STATE.map);

  const baseMaps = {
    "Dark Canvas (Night)": darkMatter,
    "High-Res Satellite": satellite,
    "Topographic Terrain": openTopo,
    "Standard Street Map": osm
  };

  L.control.layers(baseMaps, null, { position: "topright" }).addTo(STATE.map);

  // 1. SRTM 30m South India DEM Overlay
  const srtmBounds = STATE.srtmMeta.bounds.leaflet_bounds;
  STATE.srtmLayer = L.imageOverlay("data/srtm_elevation.png", srtmBounds, {
    opacity: 0.82,
    interactive: false
  }).addTo(STATE.map);

  // 2. GPM IMERG Precipitation Overlay
  const gpmBounds = STATE.gpmData.bounds.leaflet_bounds;
  STATE.gpmLayer = L.imageOverlay("data/gpm_cumulative_rain.png", gpmBounds, {
    opacity: 0.65,
    interactive: false
  }).addTo(STATE.map);

  // 3. Markers Layer
  STATE.markersLayer = L.layerGroup().addTo(STATE.map);
  updateStationMarkers();

  // 4. Map Click & Elevation Inspector
  STATE.map.on("click", (e) => {
    handleMapInspect(e.latlng.lat, e.latlng.lng);
  });

  addMapLegend();
}

// -------------------------------------------------------------
// STATION MARKERS & HAZARD MAPPING
// -------------------------------------------------------------
function updateStationMarkers() {
  if (!STATE.markersLayer || !STATE.stationsData) return;
  STATE.markersLayer.clearLayers();

  const stations = getSimulatedStations();

  stations.forEach((st) => {
    const iconHtml = `
      <div class="custom-pulse-marker" style="background-color: ${st.color}; border-color: ${st.color}; box-shadow: 0 0 12px ${st.color};"></div>
    `;

    const customIcon = L.divIcon({
      className: "hazard-marker-icon",
      html: iconHtml,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([st.lat, st.lon], { icon: customIcon });

    const popupContent = `
      <div style="font-family: var(--font-sans); min-width: 250px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="font-size:14px;">${st.name}</strong>
          <span class="tier-badge tier-${st.category}">${st.alert_level}</span>
        </div>
        <div style="font-size:11px; color:#9ca3af; margin-bottom:8px;">
          ${st.state} &bull; ${st.zone} &bull; <strong>Horizon: ${STATE.currentHorizon.replace('_', ' ')}</strong>
        </div>
        
        <!-- Multi-Task Probabilities -->
        <div style="background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; margin-bottom:8px;">
          <div style="font-size:11px; font-weight:700; color:var(--accent-cyan); margin-bottom:4px; text-transform:uppercase;">
            Multi-Task AI Prediction Heads:
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:11px;">
            <div>⚡ Thunderstorm:</div>
            <div style="text-align:right; font-weight:700; color:#fbbf24;">${st.multi_task_heads.thunderstorm_prob}%</div>
            <div>🌧️ Cloudburst:</div>
            <div style="text-align:right; font-weight:700; color:#38bdf8;">${st.multi_task_heads.cloudburst_prob}%</div>
            <div>🌊 Flash Flood:</div>
            <div style="text-align:right; font-weight:700; color:#ef4444;">${st.multi_task_heads.flash_flood_prob}%</div>
            <div><strong>Composite Risk:</strong></div>
            <div style="text-align:right; font-weight:800; color:${st.color};">${st.composite_risk_score}%</div>
          </div>
        </div>

        <!-- Atmospheric Predictor Snapshot -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:11px; margin-bottom:8px;">
          <div>Elevation (SRTM): <strong>${st.elevation_m}m</strong></div>
          <div>Slope: <strong>${st.slope_deg}&deg;</strong></div>
          <div>Rain: <strong style="color:#38bdf8;">${st.current_rain_24h_mm}mm</strong></div>
          <div>IWV Moisture: <strong style="color:#06b6d4;">${st.iwv_mm}mm</strong></div>
        </div>

        <div style="margin-top:6px; font-size:11px; color:#e2e8f0; line-height:1.35;">
          <strong>Advisory:</strong> ${st.advisory}
        </div>

        <button onclick="selectStationForXAI('${st.id}')" style="margin-top:8px; width:100%; padding:5px; background:rgba(59,130,246,0.25); border:1px solid rgba(59,130,246,0.5); color:#93c5fd; border-radius:4px; font-size:11px; cursor:pointer; font-weight:600;">
          🔍 Inspect Explainable AI (XAI) Factors
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.on("click", () => {
      selectStationForXAI(st.id);
    });

    STATE.markersLayer.addLayer(marker);
  });
}

function selectStationForXAI(id) {
  STATE.selectedStationId = id;
  highlightStationInSidebar(id);
  renderExplainableAIPanel();
}

// -------------------------------------------------------------
// MAP CLICK INSPECTOR (Live SRTM Grid & Hyper-Local Risk)
// -------------------------------------------------------------
function handleMapInspect(lat, lon) {
  if (!STATE.srtmGrid) return;

  const bounds = STATE.srtmGrid.bounds;
  const inSrtmBounds = (
    lat >= bounds.south && lat <= bounds.north &&
    lon >= bounds.west && lon <= bounds.east
  );

  let elevation = "Outside SRTM DEM";
  let slopeEst = 2.0;
  let tstormEst = 25.0;
  let cloudburstEst = 20.0;
  let floodEst = 18.0;
  let compositeEst = 25.0;
  let factors = ["Standard boundary layer", "Terrain outside high-relief Western Ghats zone"];

  if (inSrtmBounds) {
    const rows = STATE.srtmGrid.rows;
    const cols = STATE.srtmGrid.cols;
    const r = Math.floor(((bounds.north - lat) / (bounds.north - bounds.south)) * rows);
    const c = Math.floor(((lon - bounds.west) / (bounds.east - bounds.west)) * cols);

    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      elevation = STATE.srtmGrid.grid[r][c];
      let dz = 0;
      if (r > 0 && r < rows - 1) dz += Math.abs(STATE.srtmGrid.grid[r-1][c] - STATE.srtmGrid.grid[r+1][c]);
      if (c > 0 && c < cols - 1) dz += Math.abs(STATE.srtmGrid.grid[r][c-1] - STATE.srtmGrid.grid[r][c+1]);
      slopeEst = Math.min(50, Math.round(dz / 12.0 * 10) / 10);

      // Model estimation for arbitrary clicked point
      const slopeFactor = Math.min(1.0, slopeEst / 40.0);
      const elevFactor = Math.min(1.0, elevation / 2200.0);
      tstormEst = Math.round((0.4 * slopeFactor + 0.3 * elevFactor + 0.3) * 80);
      cloudburstEst = Math.round((0.5 * slopeFactor + 0.5 * elevFactor) * 85);
      floodEst = Math.round((0.6 * slopeFactor + 0.4) * 82);
      compositeEst = Math.max(tstormEst, cloudburstEst, floodEst);

      factors = [
        `SRTM 30m Measured Elevation: ${elevation}m`,
        `Local Relief Slope: ${slopeEst}°`,
        slopeEst > 25 ? "Steep Escarpment Convective Catalyst" : "Moderate Runoff Gradient",
        "Topographic convergence estimated from 30m DEM grid"
      ];
    }
  }

  // Update inspector panel
  document.getElementById("insp-lat").textContent = lat.toFixed(4) + "° N";
  document.getElementById("insp-lon").textContent = lon.toFixed(4) + "° E";
  document.getElementById("insp-elev").textContent = typeof elevation === "number" ? elevation + " m" : elevation;
  document.getElementById("insp-slope").textContent = slopeEst + "°";
  
  const riskBadge = document.getElementById("insp-risk");
  if (compositeEst >= 70) {
    riskBadge.textContent = `High (${compositeEst}%)`;
    riskBadge.style.color = "var(--accent-rose)";
  } else if (compositeEst >= 40) {
    riskBadge.textContent = `Moderate (${compositeEst}%)`;
    riskBadge.style.color = "var(--accent-amber)";
  } else {
    riskBadge.textContent = `Low (${compositeEst}%)`;
    riskBadge.style.color = "var(--accent-emerald)";
  }

  // Draw or move inspection marker
  if (STATE.inspectMarker) {
    STATE.inspectMarker.setLatLng([lat, lon]);
  } else {
    STATE.inspectMarker = L.circleMarker([lat, lon], {
      radius: 7,
      color: "#06b6d4",
      fillColor: "#38bdf8",
      fillOpacity: 0.9,
      weight: 2
    }).addTo(STATE.map);
  }

  // Update XAI drawer with inspected point
  document.getElementById("xai-selected-station").textContent = `Map Point (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`;
  document.getElementById("xai-selected-score").textContent = `Composite Risk: ${compositeEst}%`;
  document.getElementById("xai-tstorm-prob").textContent = `${tstormEst}%`;
  document.getElementById("xai-cloudburst-prob").textContent = `${cloudburstEst}%`;
  document.getElementById("xai-flood-prob").textContent = `${floodEst}%`;
  document.getElementById("xai-advisory-text").textContent = compositeEst > 60 ? "Steep relief requires flash flood awareness." : "Conditions nominal.";
  
  const xaiContainer = document.getElementById("xai-factors-container");
  xaiContainer.innerHTML = factors.map(f => `<span class="xai-factor-pill terrain">📍 ${f}</span>`).join("");
}

// -------------------------------------------------------------
// MAP LEGEND
// -------------------------------------------------------------
function addMapLegend() {
  const legend = L.control({ position: "bottomleft" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "map-legend glass");
    div.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">Layer Legends</div>
      <div><strong>SRTM 30m Elevation</strong> (South India)</div>
      <div class="legend-scale-bar srtm-scale"></div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:#9ca3af;">
        <span>0m (Sea)</span>
        <span>800m</span>
        <span>1600m</span>
        <span>2665m (Anamudi)</span>
      </div>
      <div style="margin-top:8px;"><strong>GPM Precipitation</strong> (Daily mm)</div>
      <div class="legend-scale-bar rain-scale"></div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:#9ca3af;">
        <span>0mm</span>
        <span>50mm</span>
        <span>100mm</span>
        <span>277mm</span>
      </div>
    `;
    return div;
  };
  legend.addTo(STATE.map);
}

// -------------------------------------------------------------
// EVENT LISTENERS & UI WIRING
// -------------------------------------------------------------
function setupEventListeners() {
  // Nowcasting prediction horizon tabs
  document.querySelectorAll(".horizon-tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".horizon-tab-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      STATE.currentHorizon = this.getAttribute("data-horizon");
      console.log(`[*] Switched nowcast horizon to: ${STATE.currentHorizon}`);
      renderAllComponents();
    });
  });

  // Layer toggles
  document.getElementById("toggle-srtm").addEventListener("change", (e) => {
    if (e.target.checked) STATE.map.addLayer(STATE.srtmLayer);
    else STATE.map.removeLayer(STATE.srtmLayer);
  });

  document.getElementById("toggle-gpm").addEventListener("change", (e) => {
    if (e.target.checked) STATE.map.addLayer(STATE.gpmLayer);
    else STATE.map.removeLayer(STATE.gpmLayer);
  });

  document.getElementById("toggle-markers").addEventListener("change", (e) => {
    if (e.target.checked) STATE.map.addLayer(STATE.markersLayer);
    else STATE.map.removeLayer(STATE.markersLayer);
  });

  // Opacity sliders
  document.getElementById("srtm-opacity").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("srtm-opacity-val").textContent = Math.round(val * 100) + "%";
    if (STATE.srtmLayer) STATE.srtmLayer.setOpacity(val);
  });

  document.getElementById("gpm-opacity").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById("gpm-opacity-val").textContent = Math.round(val * 100) + "%";
    if (STATE.gpmLayer) STATE.gpmLayer.setOpacity(val);
  });

  // Region focus dropdown
  document.getElementById("region-select").addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "south_india") {
      STATE.map.flyTo([12.5, 77.0], 7);
    } else if (val === "all_india") {
      STATE.map.flyTo([22.5, 80.0], 5);
    } else if (val === "wayanad_nilgiris") {
      STATE.map.flyTo([11.45, 76.45], 10);
    } else if (val === "mumbai_konkan") {
      STATE.map.flyTo([18.8, 73.2], 9);
    } else if (val === "himalayas") {
      STATE.map.flyTo([30.5, 79.5], 8);
    }
  });

  // Timeline scrubber
  const timelineSlider = document.getElementById("timeline-slider");
  timelineSlider.addEventListener("input", (e) => {
    setGpmTimelineDay(parseInt(e.target.value));
  });

  const playBtn = document.getElementById("timeline-play");
  playBtn.addEventListener("click", () => {
    toggleTimelinePlay();
  });

  // Simulator Sliders
  document.getElementById("sim-rain").addEventListener("input", (e) => {
    STATE.simRainAdd = parseFloat(e.target.value);
    document.getElementById("sim-rain-val").textContent = "+" + STATE.simRainAdd + " mm";
    renderAllComponents();
  });

  document.getElementById("sim-slope").addEventListener("input", (e) => {
    STATE.simSlopeMult = parseFloat(e.target.value);
    document.getElementById("sim-slope-val").textContent = STATE.simSlopeMult.toFixed(1) + "x";
    renderAllComponents();
  });

  document.getElementById("sim-temp").addEventListener("input", (e) => {
    STATE.simTempAdd = parseFloat(e.target.value);
    const sign = STATE.simTempAdd >= 0 ? "+" : "";
    document.getElementById("sim-temp-val").textContent = sign + STATE.simTempAdd + " °C";
    renderAllComponents();
  });

  document.getElementById("reset-sim-btn").addEventListener("click", () => {
    resetSimulation();
  });

  // Station search input
  document.getElementById("station-search-input").addEventListener("input", (e) => {
    renderStationsList(e.target.value.toLowerCase());
  });

  // Theme switch
  document.getElementById("theme-toggle-btn").addEventListener("click", () => {
    const isDark = document.body.getAttribute("data-theme") !== "light";
    document.body.setAttribute("data-theme", isDark ? "light" : "dark");
    document.getElementById("theme-toggle-btn").innerHTML = isDark ? "🌙 Dark Mode" : "☀️ Light Mode";
  });

  // Modal handlers
  document.getElementById("provenance-btn").addEventListener("click", () => {
    document.getElementById("provenance-modal").classList.add("open");
  });

  document.getElementById("close-provenance").addEventListener("click", () => {
    document.getElementById("provenance-modal").classList.remove("open");
  });

  document.getElementById("provenance-modal").addEventListener("click", (e) => {
    if (e.target.id === "provenance-modal") {
      document.getElementById("provenance-modal").classList.remove("open");
    }
  });
}

// -------------------------------------------------------------
// TIMELINE SCRUBBER & ANIMATION (GPM)
// -------------------------------------------------------------
function setGpmTimelineDay(day) {
  STATE.currentDay = day;
  document.getElementById("timeline-slider").value = day;
  document.getElementById("current-timeline-date").textContent = `2024-01-${String(day).padStart(2, "0")}`;

  if (STATE.gpmData && STATE.gpmData.daily_records) {
    const record = STATE.gpmData.daily_records.find(d => d.day === day);
    if (record) {
      document.getElementById("timeline-day-stat").textContent = `Max: ${record.max_rain_mm} mm/d | Mean: ${record.mean_rain_mm} mm/d`;
      if ([1, 4, 15, 25].includes(day)) {
        STATE.gpmLayer.setUrl(`data/gpm_day_${day}.png`);
      } else {
        STATE.gpmLayer.setUrl("data/gpm_cumulative_rain.png");
      }
    }
  }
}

function toggleTimelinePlay() {
  const btn = document.getElementById("timeline-play");
  if (STATE.isPlaying) {
    clearInterval(STATE.playTimer);
    STATE.isPlaying = false;
    btn.innerHTML = "▶";
  } else {
    STATE.isPlaying = true;
    btn.innerHTML = "⏸";
    STATE.playTimer = setInterval(() => {
      let nextDay = STATE.currentDay + 1;
      if (nextDay > 30) nextDay = 1;
      setGpmTimelineDay(nextDay);
    }, 700);
  }
}

// -------------------------------------------------------------
// MULTI-TASK NOWCASTING & SIMULATION ENGINE
// -------------------------------------------------------------
function getSimulatedStations() {
  if (!STATE.stationsData) return [];

  const hKey = STATE.currentHorizon;

  return STATE.stationsData.stations.map((st) => {
    // Extract baseline from selected nowcast horizon
    const baseHorizon = st.nowcast_horizons ? st.nowcast_horizons[hKey] : null;

    let tstormBase = baseHorizon ? baseHorizon.thunderstorm_prob : st.multi_task_heads.thunderstorm_prob;
    let cloudburstBase = baseHorizon ? baseHorizon.cloudburst_prob : st.multi_task_heads.cloudburst_prob;
    let floodBase = baseHorizon ? baseHorizon.flash_flood_prob : st.multi_task_heads.flash_flood_prob;
    let rainBase = baseHorizon ? baseHorizon.rain_trend_mm : st.current_rain_24h_mm;

    // Apply interactive simulator delta
    const simRain = Math.max(0, Math.round((rainBase + STATE.simRainAdd) * 10) / 10);
    const simTemp = Math.round((st.current_temp_c + STATE.simTempAdd) * 10) / 10;
    const simSlope = Math.min(50, st.slope_deg * STATE.simSlopeMult);

    // Dynamic Multi-Task recalculation with simulator additions
    const rainDeltaMult = 1.0 + (STATE.simRainAdd / 150.0);
    const slopeDeltaMult = STATE.simSlopeMult;

    const simTstorm = Math.min(100.0, Math.round(tstormBase * (1.0 + (STATE.simRainAdd / 250.0)) * 10) / 10);
    const simCloudburst = Math.min(100.0, Math.round(cloudburstBase * rainDeltaMult * 10) / 10);
    const simFlood = Math.min(100.0, Math.round(floodBase * rainDeltaMult * (0.7 + 0.3 * slopeDeltaMult) * 10) / 10);

    const compositeScore = Math.min(100.0, Math.max(simCloudburst * 0.95, simFlood, simTstorm * 0.85));

    // Standard 5-tier classification
    let cat = "LOW";
    let badge = "LOW";
    let color = "#10b981";
    let advisory = "LOW: Conditions nominal across local catchment.";

    if (compositeScore >= 85) {
      cat = "CRITICAL";
      badge = "RED ALERT";
      color = "#ef4444";
      advisory = "CRITICAL: Imminent Cloudburst & Flash Flood threat. Immediate evacuation protocol recommended.";
    } else if (compositeScore >= 70) {
      cat = "HIGH";
      badge = "AMBER WARNING";
      color = "#ea580c";
      advisory = "HIGH ALERT: Severe Convective Storm & Torrential Rain. Response teams on immediate standby.";
    } else if (compositeScore >= 50) {
      cat = "MODERATE";
      badge = "YELLOW WATCH";
      color = "#f97316";
      advisory = "MODERATE: Elevated atmospheric moisture & instability. Maintain close radar tracking.";
    } else if (compositeScore >= 30) {
      cat = "WATCH";
      badge = "WATCH";
      color = "#eab308";
      advisory = "WATCH: Convective initiation potential detected. Routine automated telemetry tracking active.";
    }

    return {
      ...st,
      current_rain_24h_mm: simRain,
      current_temp_c: simTemp,
      slope_deg: Math.round(simSlope * 10) / 10,
      multi_task_heads: {
        thunderstorm_prob: simTstorm,
        cloudburst_prob: simCloudburst,
        flash_flood_prob: simFlood,
        composite_risk_score: compositeScore
      },
      composite_risk_score: compositeScore,
      category: cat,
      alert_level: badge,
      color: color,
      advisory: advisory
    };
  });
}

function resetSimulation() {
  STATE.simRainAdd = 0;
  STATE.simSlopeMult = 1.0;
  STATE.simTempAdd = 0;

  document.getElementById("sim-rain").value = 0;
  document.getElementById("sim-rain-val").textContent = "+0 mm";
  document.getElementById("sim-slope").value = 1.0;
  document.getElementById("sim-slope-val").textContent = "1.0x";
  document.getElementById("sim-temp").value = 0;
  document.getElementById("sim-temp-val").textContent = "+0 °C";

  renderAllComponents();
}

// -------------------------------------------------------------
// EXPLAINABLE AI (XAI) PANEL
// -------------------------------------------------------------
function renderExplainableAIPanel() {
  const stations = getSimulatedStations();
  const selected = stations.find(s => s.id === STATE.selectedStationId) || stations[0];
  if (!selected) return;

  document.getElementById("xai-selected-station").textContent = `${selected.name} (${selected.state})`;
  
  const badgeEl = document.getElementById("xai-selected-badge");
  badgeEl.className = `tier-badge tier-${selected.category}`;
  badgeEl.textContent = selected.alert_level;
  
  document.getElementById("xai-selected-score").textContent = `Composite Risk: ${selected.composite_risk_score}%`;
  document.getElementById("xai-tstorm-prob").textContent = `${selected.multi_task_heads.thunderstorm_prob}%`;
  document.getElementById("xai-cloudburst-prob").textContent = `${selected.multi_task_heads.cloudburst_prob}%`;
  document.getElementById("xai-flood-prob").textContent = `${selected.multi_task_heads.flash_flood_prob}%`;
  document.getElementById("xai-advisory-text").textContent = selected.advisory;

  const container = document.getElementById("xai-factors-container");
  if (!container) return;

  // Dynamic physical factor badges
  const pills = [];
  pills.push(`<span class="xai-factor-pill moisture">💧 Rain: ${selected.current_rain_24h_mm} mm/24h</span>`);
  pills.push(`<span class="xai-factor-pill moisture">🌊 Moisture Fuel: IWV ${selected.iwv_mm} mm</span>`);
  pills.push(`<span class="xai-factor-pill instability">⚡ Energy: CAPE ${selected.cape_jkg} J/kg</span>`);
  pills.push(`<span class="xai-factor-pill terrain">🏔️ Relief: Slope ${selected.slope_deg}° &bull; Elev ${selected.elevation_m}m</span>`);

  if (selected.predictors && selected.predictors.satellite_cloud_signature) {
    const sat = selected.predictors.satellite_cloud_signature;
    pills.push(`<span class="xai-factor-pill satellite">🛰️ CTT Updraft: Cooling ${sat.ctt_cooling_rate_c_hr} °C/hr (${sat.cloud_top_temp_c}°C)</span>`);
  }

  if (selected.composite_risk_score > 70) {
    pills.push(`<span class="xai-factor-pill moisture" style="border-color:#ef4444; color:#fca5a5;">⚠️ Severe Orographic Saturation Threshold Exceeded</span>`);
  }

  container.innerHTML = pills.join("");
}

// -------------------------------------------------------------
// AUTOMATED EARLY WARNING ALERTS FEED
// -------------------------------------------------------------
function renderAutomatedAlerts() {
  const container = document.getElementById("automated-alerts-container");
  if (!container) return;

  const stations = getSimulatedStations();
  const alertStations = stations.filter(s => s.composite_risk_score >= 50);

  if (alertStations.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
        ✅ No critical alerts active for horizon <strong>${STATE.currentHorizon.replace('_', ' ')}</strong>. Catchments within safe thresholds.
      </div>
    `;
    return;
  }

  container.innerHTML = alertStations.map(s => {
    let cardClass = s.category === "CRITICAL" ? "critical" : (s.category === "HIGH" ? "high" : "moderate");
    let hazardName = s.multi_task_heads.flash_flood_prob >= 75 ? "Flash Flood & Cloudburst" : (s.multi_task_heads.thunderstorm_prob >= 70 ? "Severe Thunderstorm & Lightning" : "Convective Flash Flood");

    return `
      <div class="alert-card ${cardClass}" onclick="selectStationForXAI('${s.id}')" style="cursor:pointer;">
        <div class="alert-card-top">
          <span class="alert-station-name">${s.name}</span>
          <span class="tier-badge tier-${s.category}">${s.alert_level}</span>
        </div>
        <div class="alert-meta">
          ${s.state} &bull; ${hazardName} &bull; <strong>Horizon: ${STATE.currentHorizon.replace('_', ' ')}</strong>
        </div>
        <div class="alert-reasons-title">Contributing Trigger Factors:</div>
        <ul class="alert-reasons-list">
          <li>Precipitation rate: ${s.current_rain_24h_mm} mm/24h (GPM Satellites)</li>
          <li>Atmospheric moisture: IWV ${s.iwv_mm} mm | CAPE: ${s.cape_jkg} J/kg</li>
          <li>Terrain factor: Slope ${s.slope_deg}° (SRTM 30m DEM)</li>
        </ul>
        <div class="alert-advisory-box">
          <strong>Advisory:</strong> ${s.advisory}
        </div>
      </div>
    `;
  }).join("");
}

// -------------------------------------------------------------
// KPI METRICS DISPLAY
// -------------------------------------------------------------
function updateKPIs() {
  if (!STATE.stationsData) return;

  const stations = getSimulatedStations();
  const redCount = stations.filter(s => s.category === "CRITICAL").length;
  const amberCount = stations.filter(s => s.category === "HIGH").length;

  document.getElementById("kpi-alert-count").textContent = `${redCount} Red / ${amberCount} Amber`;
  
  if (redCount > 0) {
    document.getElementById("kpi-alert-status").textContent = `Active Nowcast Horizon: ${STATE.currentHorizon.replace('_', ' ')}`;
    document.getElementById("ticker-alert-text").textContent = `CRITICAL ALERT [${STATE.currentHorizon.replace('_', ' ')}]: ${redCount} zones under Red Warning due to intense rain and flash-flood susceptibility. Immediate evacuation preparedness recommended.`;
  } else {
    document.getElementById("kpi-alert-status").textContent = "Safe operational bounds";
    document.getElementById("ticker-alert-text").textContent = `Routine monitoring [${STATE.currentHorizon.replace('_', ' ')}]: No critical warnings active across monitored catchment basins.`;
  }

  const maxRain = Math.max(...stations.map(s => s.current_rain_24h_mm));
  document.getElementById("kpi-max-rain").textContent = `${maxRain} mm`;
}

// -------------------------------------------------------------
// SIDEBAR & RISK TABLE RENDERING
// -------------------------------------------------------------
function renderStationsList(filter = "") {
  const container = document.getElementById("station-list-container");
  if (!container || !STATE.stationsData) return;

  const stations = getSimulatedStations()
    .filter(s => s.name.toLowerCase().includes(filter) || s.state.toLowerCase().includes(filter) || s.zone.toLowerCase().includes(filter))
    .sort((a, b) => b.composite_risk_score - a.composite_risk_score);

  container.innerHTML = stations.map(s => `
    <div class="station-card ${s.id === STATE.selectedStationId ? 'active' : ''}" id="station-card-${s.id}" onclick="flyToStation('${s.id}')">
      <div class="station-card-top">
        <span class="station-name">${s.name}</span>
        <span class="tier-badge tier-${s.category}">
          ${s.alert_level}
        </span>
      </div>
      <div class="station-metrics">
        <div class="station-metric-item">
          Elev: <span>${s.elevation_m}m</span>
        </div>
        <div class="station-metric-item">
          Rain: <span style="color:#38bdf8;">${s.current_rain_24h_mm}mm</span>
        </div>
        <div class="station-metric-item">
          Risk: <span style="color:${s.color};">${s.composite_risk_score}%</span>
        </div>
      </div>
    </div>
  `).join("");
}

function flyToStation(id) {
  const stations = getSimulatedStations();
  const st = stations.find(s => s.id === id);
  if (!st || !STATE.map) return;

  STATE.map.flyTo([st.lat, st.lon], 11);
  selectStationForXAI(id);
}

function highlightStationInSidebar(id) {
  document.querySelectorAll(".station-card").forEach(el => el.classList.remove("active"));
  const card = document.getElementById(`station-card-${id}`);
  if (card) {
    card.classList.add("active");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function renderRiskTable() {
  const tbody = document.getElementById("risk-table-body");
  if (!tbody || !STATE.stationsData) return;

  const stations = getSimulatedStations().sort((a, b) => b.composite_risk_score - a.composite_risk_score);

  tbody.innerHTML = stations.map(s => `
    <tr onclick="selectStationForXAI('${s.id}')" style="cursor:pointer;" class="${s.id === STATE.selectedStationId ? 'active-table-row' : ''}">
      <td><strong>${s.name}</strong><br><small style="color:#9ca3af;">${s.state}</small></td>
      <td><small style="color:#a5b4fc;">${s.zone}</small></td>
      <td>${s.elevation_m} m</td>
      <td>${s.slope_deg}&deg;</td>
      <td><span style="color:#38bdf8; font-weight:700;">${s.current_rain_24h_mm} mm</span></td>
      <td>${s.current_temp_c} &deg;C</td>
      <td><span style="color:#06b6d4; font-weight:700;">${s.iwv_mm} mm</span></td>
      <td><span style="color:#fbbf24; font-weight:700;">${s.multi_task_heads.thunderstorm_prob}%</span></td>
      <td><span style="color:#38bdf8; font-weight:700;">${s.multi_task_heads.cloudburst_prob}%</span></td>
      <td><span style="color:${s.multi_task_heads.flash_flood_prob > 60 ? '#ef4444' : '#10b981'}; font-weight:700;">${s.multi_task_heads.flash_flood_prob}%</span></td>
      <td><strong style="color:${s.color};">${s.composite_risk_score}%</strong></td>
      <td>
        <span class="tier-badge tier-${s.category}">
          ${s.alert_level}
        </span>
      </td>
      <td style="font-size:11px; max-width:220px;">${s.advisory}</td>
    </tr>
  `).join("");
}

// -------------------------------------------------------------
// ANALYTICS & CHARTS (Chart.js Engine)
// -------------------------------------------------------------
function initCharts() {
  Chart.defaults.color = "#9ca3af";
  Chart.defaults.borderColor = "rgba(255, 255, 255, 0.08)";
  Chart.defaults.font.family = "'Inter', sans-serif";

  // 1. Chart 1: GPM Precipitation Trend
  if (STATE.gpmData && STATE.gpmData.daily_records) {
    const ctx = document.getElementById("chart-precip").getContext("2d");
    const labels = STATE.gpmData.daily_records.map(d => `Day ${d.day}`);
    const maxVals = STATE.gpmData.daily_records.map(d => d.max_rain_mm);
    const meanVals = STATE.gpmData.daily_records.map(d => d.mean_rain_mm);

    STATE.chartPrecip = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            type: "bar",
            label: "Max Daily Rain (mm)",
            data: maxVals,
            backgroundColor: "rgba(6, 182, 212, 0.6)",
            borderColor: "#06b6d4",
            borderWidth: 1,
            borderRadius: 4
          },
          {
            type: "line",
            label: "All-India Mean (mm)",
            data: meanVals,
            borderColor: "#3b82f6",
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3
          },
          {
            type: "line",
            label: "Severe Flood/Landslide Warning (100mm)",
            data: new Array(labels.length).fill(100),
            borderColor: "#ef4444",
            borderWidth: 2,
            borderDash: [6, 6],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12 } },
          tooltip: { mode: "index", intersect: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Precipitation (mm)" } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 2. Chart 2: IMDAA Temperature Profile
  if (STATE.imdaaData && STATE.imdaaData.temperature) {
    const ctx = document.getElementById("chart-temp").getContext("2d");
    const monthly = STATE.imdaaData.temperature.monthly;
    const labels = monthly.map(m => m.month);

    STATE.chartTemp = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Max Temp (°C)",
            data: monthly.map(m => m.max_c),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            fill: "+1",
            tension: 0.3
          },
          {
            label: "Mean Temp (°C)",
            data: monthly.map(m => m.mean_c),
            borderColor: "#f59e0b",
            backgroundColor: "transparent",
            borderWidth: 2.5,
            tension: 0.3
          },
          {
            label: "Min Temp (°C)",
            data: monthly.map(m => m.min_c),
            borderColor: "#3b82f6",
            backgroundColor: "transparent",
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12 } }
        },
        scales: {
          y: { title: { display: true, text: "Temperature (°C)" } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 3. Chart 3: Western Ghats Topographic Elevation Transect
  if (STATE.srtmMeta && STATE.srtmMeta.transect) {
    const ctx = document.getElementById("chart-transect").getContext("2d");
    const transect = STATE.srtmMeta.transect;

    STATE.chartTransect = new Chart(ctx, {
      type: "line",
      data: {
        labels: transect.map(p => `${p.distance_km} km`),
        datasets: [
          {
            label: "SRTM Elevation (m)",
            data: transect.map(p => p.elevation_m),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.2)",
            fill: true,
            tension: 0.2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const landmark = transect[ctx.dataIndex].landmark;
                return landmark ? `📍 Landmark: ${landmark}` : "";
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Elevation (meters)" } },
          x: {
            title: { display: true, text: "Distance from Coast across Western Ghats (km)" },
            ticks: { maxTicksLimit: 10 }
          }
        }
      }
    });
  }

  // 4. Chart 4: Multi-Hazard Vulnerability Matrix
  initScatterChart();
}

function initScatterChart() {
  const ctx = document.getElementById("chart-scatter").getContext("2d");
  const stations = getSimulatedStations();

  const data = stations.map(s => ({
    x: s.slope_deg,
    y: s.current_rain_24h_mm,
    r: Math.max(6, Math.round(s.composite_risk_score / 6.0)),
    name: s.name,
    score: s.composite_risk_score,
    color: s.color
  }));

  STATE.chartScatter = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [{
        label: "Monitoring Stations Risk",
        data: data,
        backgroundColor: data.map(d => d.color),
        borderColor: "#ffffff",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pt = ctx.raw;
              return `${pt.name}: Slope ${pt.x}°, Rain ${pt.y}mm, Risk Score ${pt.score}%`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: "Terrain Slope (degrees)" }, min: 0, max: 55 },
        y: { title: { display: true, text: "24h Rainfall Intensity (mm)" }, min: 0 }
      }
    }
  });
}

function updateScatterChart() {
  if (!STATE.chartScatter) return;
  const stations = getSimulatedStations();
  const data = stations.map(s => ({
    x: s.slope_deg,
    y: s.current_rain_24h_mm,
    r: Math.max(6, Math.round(s.composite_risk_score / 6.0)),
    name: s.name,
    score: s.composite_risk_score,
    color: s.color
  }));

  STATE.chartScatter.data.datasets[0].data = data;
  STATE.chartScatter.data.datasets[0].backgroundColor = data.map(d => d.color);
  STATE.chartScatter.update();
}
