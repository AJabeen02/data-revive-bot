#!/usr/bin/env python3
"""
SIH Geo-Climate Multi-Hazard Intelligence System
Local Web Server & Optional Live Query Backend
"""

import os
import sys
import webbrowser
from flask import Flask, send_from_directory, jsonify, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")

app = Flask(__name__, static_folder=WEB_DIR, static_url_path="")

@app.route("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(WEB_DIR, path)

@app.route("/api/status")
def status():
    return jsonify({
        "status": "online",
        "system": "SIH Geo-Climate Multi-Hazard Intelligence Prototype",
        "datasets": {
            "srtm_30m": "Available",
            "gpm_imerg_daily": "30 Days (Jan 2024)",
            "imdaa_temperature": "Available",
            "imdaa_precipitation": "Available",
            "bharathbench_models": "30 Models"
        }
    })

def main():
    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"
    print("=" * 60)
    print("  SIH GEO-CLIMATE MULTI-HAZARD DASHBOARD SERVER")
    print(f"  Serving dashboard at: {url}")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 60)
    
    # Auto-open default browser
    try:
        webbrowser.open(url)
    except Exception:
        pass

    app.run(host=host, port=port, debug=False)

if __name__ == "__main__":
    main()
