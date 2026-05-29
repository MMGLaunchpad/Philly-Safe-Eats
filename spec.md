# Product Specification: Philly Safe Eats

Philly Safe Eats is an interactive 3D spatial health and safety audit tool for restaurants in Philadelphia. By leveraging the City of Philadelphia's live open-data infrastructure, the application provides a visual heatmap of active municipal code and sanitation violations mapped directly onto a 3D globe using CesiumJS. Users can search for specific food establishments, filter out high-risk venues, and inspect custom digital health scorecards to make informed dining decisions.

---

## 1. User Experience & Core Interactions

The application consists of a full-screen CesiumJS 3D globe centered on Philadelphia, overlaid with a clean, modern, floatable UI framework. 

### Map Visuals & Heatmap
* **Color-Coded Entities:** Every active food service business is plotted on the map using custom 3D pins or billboard markers. The marker colors indicate safety health:
    * **Green (Clean):** 0 active violations.
    * **Orange (Minor Risk):** 1–2 active violations.
    * **Red (High Risk):** 3 or more active violations.
* **Camera Bounds:** On initialization, the camera performs an elegant fly-to animation, positioning itself directly over Center City, Philadelphia, tilted at an angle to showcase the city's 3D building data.

### Controls Overlay
* **Search Input:** A persistent text input overlay allows users to look up restaurants by trade name or culinary category (e.g., "Pizza", "Sushi"). Filtering is reactive, instantly updating the visible entities on the globe.
* **The "Panic Switch" Toggle:** A prominent toggle button labeled **"Hide High Risk"**. When enabled, all Orange and Red entities are instantly clipped from the viewer, leaving only clean (Green) establishments visible.

### Scorecard Side Panel
* **Contextual Selection:** Clicking an entity on the globe opens a slide-out drawer or persistent side panel.
* **Scorecard Metrics:** The panel displays the establishment's legal/trade name, full physical address, active license tier, and a highly visible "Safety Scorecard" chip detailing the precise count of open violations.

---

## 2. Data Architecture & Flow

The application relies entirely on real-time data orchestration utilizing Philadelphia’s public Carto SQL API database endpoints. No static asset files or paid API keys are required.

### API Specifications
* **Base Endpoint:** `https://phl.carto.com/api/v2/sql`
* **HTTP Method:** `GET`
* **Authentication:** Completely public, no tokens required.
* **CORS Behavior:** Open public access enabled by the city infrastructure.

### The Matchmaking SQL Query
To ensure client-side performance, data matching is performed server-side by embedding a unified PostgreSQL query inside the request URL parameter (`?q=`). The query performs a `LEFT JOIN` between the active food business licenses and open L&I violations table grouped by geographic location.

The specific production URI query parameter maps to this functional logic:

    SELECT 
        l.cartodb_id,
        l.tradename,
        l.legalname,
        l.address,
        l.lat,
        l.lng,
        COUNT(v.violationid) AS open_violation_count
    FROM business_licenses l
    LEFT JOIN li_violations v 
        ON UPPER(l.address) = UPPER(v.address) 
        AND v.violationstatus = 'Open'
    WHERE l.licensestatus = 'Active'
      AND (l.licensetype LIKE '%Food%' OR l.licensetype LIKE '%Restaurant%')
      AND l.lat IS NOT NULL 
      AND l.lng IS NOT NULL
    GROUP BY l.cartodb_id, l.tradename, l.legalname, l.address, l.lat, l.lng

### API Response Format
The endpoint returns a structured JSON payload. The core array lives under the `rows` property:

    {
      "rows": [
        {
          "cartodb_id": 10245,
          "tradename": "Philly Cheesesteak Haven",
          "legalname": "HAVEN FOOD ENTERPRISES LLC",
          "address": "123 SOUTH ST",
          "lat": 39.9425,
          "lng": -75.1612,
          "open_violation_count": 3
        }
      ],
      "time": 0.085,
      "fields": {
        "tradename": {"type": "string"},
        "open_violation_count": {"type": "number"}
      },
      "total_rows": 1
    }

### Client-Side Injection & Mapping
1. **Fetch:** React Query executes the payload initialization on application boot.
2. **Caching Strategy:** Stale-time is explicitly set to 5 minutes to limit unnecessary server hits during user navigation transitions.
3. **Entity Translation:** The system loops over the `rows` collection. For each entry:
    * Coordinates (`lat`, `lng`) are converted into standard `Cesium.Cartesian3.fromDegrees`.
    * The system assigns a `Cesium.Color` property dynamically based on the value of `open_violation_count`.
    * The row object is stored directly inside the `Cesium.Entity.properties` payload for instant extraction during pointer interaction events.

---

## 3. Technical Architecture & State Management

The frontend is built on a modern, decoupled stack prioritizing performance, type safety, and clean lifecycle management.

### Engineering Stack
* **Framework:** React + TypeScript + Vite
* **Map Engine:** CesiumJS
* **Build Optimization:** `vite-plugin-cesium` (manages automated asset compilation pipelines cleanly without complex asset copies or manual base URL assignments)
* **Data Layer:** `@tanstack/react-query` (handles global network state caching and stale deduplication)
* **UI State:** `zustand` (lightweight reactive state for interaction management)
* **Styles:** Standard vanilla CSS for optimal component encapsulation.

### Critical Constraints
* **Mount Cycle Protection:** `React.StrictMode` must be completely omitted from `main.tsx`. Cesium's internal WebGL contexts cannot survive React 18's double-mounting architecture in development environments.
* **Authentication Safeguards:** The Cesium Ion default access token must be read exclusively from `import.meta.env.VITE_CESIUM_ION_TOKEN` inside a standard `.env` configuration file. The implementation must throw a clear, custom console warning if the token is unpopulated.

### Component & Viewer Architecture
The global `Cesium.Viewer` instance is handled through a single reference pattern, allowing pure UI elements and map controllers to seamlessly cross-communicate:

1. **Root Layout (`App.tsx