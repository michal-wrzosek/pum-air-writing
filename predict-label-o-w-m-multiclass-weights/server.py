import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from dataikuscoring import load_model

# ---- Load model once on startup ----
EXPORT_PATH = os.path.dirname(os.path.realpath(__file__))
model = load_model(EXPORT_PATH)


def to_jsonable(obj):
    """Convert numpy/pandas objects to plain Python types for JSON serialization."""
    # numpy
    try:
        import numpy as np

        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
    except Exception:
        pass

    # pandas
    try:
        import pandas as pd

        if isinstance(obj, pd.DataFrame):
            return obj.to_dict(orient="records")
        if isinstance(obj, pd.Series):
            return obj.tolist()
    except Exception:
        pass

    # recursion
    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_jsonable(v) for v in obj]

    return obj


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict):
        body = json.dumps(to_jsonable(payload)).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))

        # CORS
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        if self.path == "/health":
            return self._send_json(200, {"ok": True})
        return self._send_json(404, {"ok": False, "message": "Not found"})

    def do_POST(self):
        if self.path != "/predict":
            return self._send_json(404, {"ok": False, "message": "Not found"})

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8")
            req = json.loads(raw) if raw else {}

            # Accept:
            # - { "features": {...} } (single)
            # - { "data": [ {...}, ... ] } (batch)
            if isinstance(req.get("data"), list):
                to_score = req["data"]
            elif isinstance(req.get("features"), dict):
                to_score = [req["features"]]
            else:
                return self._send_json(
                    400, {"ok": False, "message": "Missing 'features' or 'data'."}
                )

            y_pred = model.predict(to_score)

            probs = None
            try:
                probs = model.predict_proba(to_score)
            except Exception:
                probs = None

            # single vs batch output
            if len(to_score) == 1:
                pred_out = y_pred[0] if hasattr(y_pred, "__len__") else y_pred
            else:
                pred_out = list(y_pred) if hasattr(y_pred, "__len__") else y_pred

            payload = {
                "ok": True,
                "result": {"prediction": to_jsonable(pred_out)},
                "probabilities": to_jsonable(probs),
            }

            return self._send_json(200, payload)

        except Exception as e:
            return self._send_json(500, {"ok": False, "message": str(e)})


def main():
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", "8000"))
    httpd = HTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
