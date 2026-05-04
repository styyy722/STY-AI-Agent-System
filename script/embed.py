#!/usr/bin/env python3
"""
RAG store operations for STY Agent.
Uses Anthropic's embeddings API + numpy cosine similarity.
Stores vectors in rag_store/index.jsonl (one JSON object per line).

Commands:
  index  <id> <text> [--source <src>] [--category <cat>]
  search <query> [--top-k <k>] [--category <cat>]
  delete <id>
  list   [--category <cat>]
  stats
"""

import sys
import os
import json
import argparse
import hashlib
import math
from datetime import datetime
from pathlib import Path

# Anthropic embeddings via direct HTTP (no SDK needed in script)
import urllib.request
import urllib.error

RAG_DIR  = Path(os.getcwd()) / "rag_store"
INDEX_FILE = RAG_DIR / "index.jsonl"
API_KEY  = os.environ.get("ANTHROPIC_API_KEY", "")
EMBED_MODEL = "voyage-3"   # Anthropic's recommended embedding model via Voyage

def get_embedding(text: str) -> list[float]:
    """Call Voyage AI embeddings via Anthropic API."""
    if not API_KEY:
        print(json.dumps({"error": "ANTHROPIC_API_KEY not set"}))
        sys.exit(1)

    # Truncate to safe length (~16k chars)
    text = text[:16000]

    payload = json.dumps({
        "model": EMBED_MODEL,
        "input": [text],
        "input_type": "document"
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/embeddings",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data["embeddings"][0]["embedding"]
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(json.dumps({"error": f"Embedding API error {e.code}: {body}"}))
        sys.exit(1)

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)

def load_index() -> list[dict]:
    if not INDEX_FILE.exists():
        return []
    entries = []
    with open(INDEX_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return entries

def save_index(entries: list[dict]):
    RAG_DIR.mkdir(exist_ok=True)
    with open(INDEX_FILE, "w") as f:
        for entry in entries:
            f.write(json.dumps(entry) + "\n")

def cmd_index(args):
    entries = load_index()

    # Remove existing entry with same id
    entries = [e for e in entries if e.get("id") != args.id]

    text = args.text
    embedding = get_embedding(text)

    entry = {
        "id": args.id,
        "text": text[:2000],           # store preview only
        "full_text": text,
        "source": args.source or "manual",
        "category": args.category or "general",
        "indexed_at": datetime.utcnow().isoformat(),
        "embedding": embedding
    }
    entries.append(entry)
    save_index(entries)
    print(json.dumps({"ok": True, "id": args.id, "dims": len(embedding)}))

def cmd_search(args):
    entries = load_index()
    if not entries:
        print(json.dumps({"results": []}))
        return

    if args.category:
        entries = [e for e in entries if e.get("category") == args.category]

    query_vec = get_embedding(args.query)
    scored = []
    for e in entries:
        if "embedding" not in e:
            continue
        sim = cosine_similarity(query_vec, e["embedding"])
        scored.append({
            "id": e["id"],
            "score": round(sim, 4),
            "source": e.get("source", ""),
            "category": e.get("category", ""),
            "text": e.get("text", "")[:500],
            "indexed_at": e.get("indexed_at", "")
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    top_k = int(args.top_k) if args.top_k else 4
    print(json.dumps({"results": scored[:top_k]}))

def cmd_delete(args):
    entries = load_index()
    before = len(entries)
    entries = [e for e in entries if e.get("id") != args.id]
    save_index(entries)
    print(json.dumps({"ok": True, "removed": before - len(entries)}))

def cmd_list(args):
    entries = load_index()
    if args.category:
        entries = [e for e in entries if e.get("category") == args.category]
    summary = [{
        "id": e["id"],
        "source": e.get("source", ""),
        "category": e.get("category", ""),
        "indexed_at": e.get("indexed_at", ""),
        "text_preview": e.get("text", "")[:100]
    } for e in entries]
    print(json.dumps({"count": len(summary), "entries": summary}))

def cmd_stats(args):
    entries = load_index()
    cats = {}
    for e in entries:
        c = e.get("category", "general")
        cats[c] = cats.get(c, 0) + 1
    print(json.dumps({
        "total": len(entries),
        "categories": cats,
        "index_path": str(INDEX_FILE)
    }))

def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command")

    p_index = sub.add_parser("index")
    p_index.add_argument("id")
    p_index.add_argument("text")
    p_index.add_argument("--source", default="manual")
    p_index.add_argument("--category", default="general")

    p_search = sub.add_parser("search")
    p_search.add_argument("query")
    p_search.add_argument("--top-k", default="4")
    p_search.add_argument("--category")

    p_delete = sub.add_parser("delete")
    p_delete.add_argument("id")

    p_list = sub.add_parser("list")
    p_list.add_argument("--category")

    sub.add_parser("stats")

    args = parser.parse_args()
    if args.command == "index":   cmd_index(args)
    elif args.command == "search": cmd_search(args)
    elif args.command == "delete": cmd_delete(args)
    elif args.command == "list":   cmd_list(args)
    elif args.command == "stats":  cmd_stats(args)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
