import json
import re

def safe_json_parse(text: str):
    """
    Try to safely extract JSON from a Gemini response string.
    Handles JSON code blocks and plain text arrays.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON inside triple backticks
        match = re.search(r'```json(.*?)```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except Exception:
                pass
        # Try extracting JSON without code block
        match = re.search(r'(\[.*\]|\{.*\})', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
    return [{"raw_output": text}]
