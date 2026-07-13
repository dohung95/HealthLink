"""
Ollama Service for local LLM inference
Uses Qwen2.5-0.5B model for CV parsing and text analysis
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import Config

# Global Ollama client (lazy loaded)
_ollama_client = None


def get_ollama_client():
    """Get or create Ollama client (singleton)"""
    global _ollama_client
    if _ollama_client is None:
        import ollama
        _ollama_client = ollama.Client(host=Config.OLLAMA_HOST, timeout=Config.OLLAMA_TIMEOUT)
    return _ollama_client


def check_ollama_connection() -> tuple:
    """
    Check if Ollama is running and model is available.
    Returns: (is_connected, model_available, error_message)
    """
    try:
        client = get_ollama_client()
        models = client.list()
        model_names = [m.get('name', m.get('model', '')) for m in models.get('models', [])]

        # Check if our target model is available
        model_available = any(Config.OLLAMA_MODEL in name for name in model_names)

        return True, model_available, None
    except Exception as e:
        return False, False, str(e)


def generate(prompt: str, system_prompt: str = None, json_mode: bool = False) -> str:
    """
    Generate text using Ollama.
    Returns the generated text or empty string on error.
    """
    try:
        client = get_ollama_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": Config.OLLAMA_MODEL,
            "messages": messages,
            "options": {
                "temperature": Config.OLLAMA_TEMPERATURE,
                "num_predict": Config.OLLAMA_NUM_PREDICT,
            },
        }
        if json_mode:
            kwargs["format"] = "json"

        response = client.chat(**kwargs)
        return response["message"]["content"]
    except TypeError:
        return generate(prompt, system_prompt, json_mode=False)
    except Exception as e:
        print(f"Ollama error: {e}")
        return ""


def _merge_on_dup_keys(pairs):
    """Merge duplicate keys: accumulate list values, keep last for non-lists."""
    result = {}
    for key, val in pairs:
        if key in result:
            if isinstance(result[key], list) and isinstance(val, list):
                result[key].extend(val)
            else:
                result[key] = val
        else:
            result[key] = val
    return result


def generate_json(prompt: str, system_prompt: str = None) -> dict:
    """
    Generate JSON response using Ollama.
    Attempts to parse the response as JSON.
    Returns empty dict on error.
    """
    import json
    import re

    response = generate(prompt, system_prompt, json_mode=True)

    if not response:
        return {}

    def _try_parse(text):
        for parse_fn in [
            lambda t: json.loads(t, object_pairs_hook=_merge_on_dup_keys),
            lambda t: json.loads(t),
        ]:
            try:
                return parse_fn(text)
            except json.JSONDecodeError:
                continue
        return None

    # Try direct parsing
    result = _try_parse(response)
    if result:
        return result

    # Try to find JSON in markdown code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response)
    if json_match:
        result = _try_parse(json_match.group(1))
        if result:
            return result

    # Try to find JSON object in response
    json_match = re.search(r'\{[\s\S]*\}', response)
    if json_match:
        result = _try_parse(json_match.group(0))
        if result:
            return result

    return {}


def pull_model(model_name: str = None) -> bool:
    """
    Pull/download a model from Ollama registry.
    Returns True on success.
    """
    model = model_name or Config.OLLAMA_MODEL
    try:
        client = get_ollama_client()
        client.pull(model)
        return True
    except Exception as e:
        print(f"Failed to pull model {model}: {e}")
        return False
