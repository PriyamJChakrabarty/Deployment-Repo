import json
import sys
import urllib.error
import urllib.request


def fetch_json(url, method="GET", payload=None, headers=None):
    data = None
    request_headers = headers or {}

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=request_headers, method=method)

    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read().decode("utf-8")
        content_type = response.headers.get("Content-Type", "")
        if "application/json" in content_type:
            return response.status, json.loads(body)
        return response.status, body


def main():
    base_url = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    failures = []

    print(f"Testing backend at: {base_url}")

    try:
        status, body = fetch_json(f"{base_url}/")
        if status == 200 and body.get("status") == "OK":
            print("PASS  /                root health returned status=OK")
        else:
            failures.append(f"/ returned unexpected response: {body}")
    except Exception as exc:
        failures.append(f"/ failed: {exc}")

    try:
        status, body = fetch_json(f"{base_url}/openapi.json")
        expected_paths = ["/", "/transcribe/chunk", "/api/extract", "/api/actions", "/api/chatbot"]
        missing = [path for path in expected_paths if path not in body.get("paths", {})]
        if status == 200 and not missing:
            print("PASS  /openapi.json    expected API routes are present")
        else:
            failures.append(f"/openapi.json missing paths: {missing}")
    except Exception as exc:
        failures.append(f"/openapi.json failed: {exc}")

    try:
        status, body = fetch_json(
            f"{base_url}/api/chatbot",
            method="POST",
            payload={"message": "What is a non-disclosure agreement?"},
        )
        if status == 200 and "response" in body and "is_legal_related" in body:
            print("PASS  /api/chatbot     Groq-backed endpoint responded correctly")
        else:
            failures.append(f"/api/chatbot returned unexpected response: {body}")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        failures.append(f"/api/chatbot failed with HTTP {exc.code}: {error_body}")
    except Exception as exc:
        failures.append(f"/api/chatbot failed: {exc}")

    if failures:
        print("\nBackend smoke test failed:")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)

    print("\nAll backend smoke tests passed.")


if __name__ == "__main__":
    main()
