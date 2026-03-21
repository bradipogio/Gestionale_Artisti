#!/usr/bin/env python3

import json
import os
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


PORT = int(os.environ.get("PORT", "3000"))
HOST = os.environ.get("HOST", "0.0.0.0")
ROOT_DIR = Path(__file__).resolve().parent
DB_PATH = ROOT_DIR / "db.json"
WRITE_LOCK = threading.Lock()
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

STATIC_ROUTES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/app.js": "app.js",
    "/styles.css": "styles.css",
}

CONTENT_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
}

FALLBACK_STATE = {
    "users": [
        {"id": "admin-1", "name": "Admin", "role": "admin"},
        {"id": "artist-1", "name": "Giulia Serra", "role": "artist", "specialty": "Violinista"},
        {"id": "artist-2", "name": "Lorenzo Ferri", "role": "artist", "specialty": "Violoncellista"},
        {"id": "artist-3", "name": "Elisa Conti", "role": "artist", "specialty": "Cantante lirica"},
        {"id": "artist-4", "name": "Matteo Valli", "role": "artist", "specialty": "Pianista"},
    ],
    "locations": [
        {
            "id": "location-1",
            "name": "Villa Aurelia, Roma",
            "mapsUrl": "https://maps.google.com/?q=Villa+Aurelia+Roma",
        },
        {
            "id": "location-2",
            "name": "Lago di Garda",
            "mapsUrl": "https://maps.google.com/?q=Lago+di+Garda",
        },
    ],
    "events": [
        {
            "id": "event-1",
            "title": "Wedding Martini",
            "date": "2026-06-06",
            "locationId": "location-1",
            "locationName": "Villa Aurelia, Roma",
            "info": "Cerimonia ore 17:30, repertorio classico e ingresso sposi.",
            "assignments": [
                {
                    "id": "assignment-1",
                    "artistId": "artist-1",
                    "status": "accettata",
                    "updatedAt": "2026-03-21T09:00:00.000Z",
                },
                {
                    "id": "assignment-2",
                    "artistId": "artist-2",
                    "status": "inviata",
                    "updatedAt": "2026-03-21T09:00:00.000Z",
                },
                {
                    "id": "assignment-3",
                    "artistId": "artist-3",
                    "status": "confermata",
                    "updatedAt": "2026-03-21T09:00:00.000Z",
                },
            ],
            "createdAt": "2026-03-21T09:00:00.000Z",
        },
        {
            "id": "event-2",
            "title": "Ricevimento Villa Blu",
            "date": "2026-07-12",
            "locationId": "location-2",
            "locationName": "Lago di Garda",
            "info": "Setup entro le 18:00, service gia incluso.",
            "assignments": [
                {
                    "id": "assignment-4",
                    "artistId": "artist-4",
                    "status": "inviata",
                    "updatedAt": "2026-03-21T09:00:00.000Z",
                }
            ],
            "createdAt": "2026-03-21T09:00:00.000Z",
        },
    ],
}


def ensure_db_exists():
    if not DB_PATH.exists():
        write_db(FALLBACK_STATE)


def read_db():
    with DB_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_db(payload):
    with WRITE_LOCK:
        with DB_PATH.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=True, indent=2)
            handle.write("\n")


def is_valid_state(payload):
    return (
        isinstance(payload, dict)
        and isinstance(payload.get("users"), list)
        and isinstance(payload.get("locations"), list)
        and isinstance(payload.get("events"), list)
    )


def get_local_urls():
    urls = {f"http://localhost:{PORT}"}

    try:
        hostname = socket.gethostname()
        for result in socket.getaddrinfo(hostname, None, family=socket.AF_INET):
            address = result[4][0]
            if not address.startswith("127."):
                urls.add(f"http://{address}:{PORT}")
    except OSError:
        pass

    return sorted(urls)


class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request(include_body=True)

    def do_HEAD(self):
        self.handle_request(include_body=False)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/state":
            self.send_error(404, "Not found")
            return

        body_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(body_length).decode("utf-8")

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self.send_json(400, {"error": "JSON non valido."})
            return

        if not is_valid_state(payload):
            self.send_json(400, {"error": "Struttura stato non valida."})
            return

        write_db(payload)
        self.send_json(200, {"ok": True})

    def handle_request(self, include_body):
        parsed = urlparse(self.path)

        if parsed.path == "/api/state":
            self.send_json(200, read_db(), include_body=include_body)
            return

        file_name = STATIC_ROUTES.get(parsed.path)
        if not file_name:
            self.send_error(404, "Not found")
            return

        file_path = ROOT_DIR / file_name
        if not file_path.exists():
            self.send_error(404, "Not found")
            return

        content = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Cache-Control", "no-store")
        self.send_header(
            "Content-Type",
            CONTENT_TYPES.get(file_path.suffix, "application/octet-stream"),
        )
        self.end_headers()

        if include_body:
            self.wfile.write(content)

    def send_json(self, status_code, payload, include_body=True):
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()

        if include_body:
            self.wfile.write(body)

    def log_message(self, format, *args):
        return

    def end_headers(self):
        self.send_cors_headers()
        super().end_headers()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Vary", "Origin")


def main():
    ensure_db_exists()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)

    print("Gestionale Artisti disponibile su:")
    for url in get_local_urls():
        print(f"- {url}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
