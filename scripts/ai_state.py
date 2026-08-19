#!/usr/bin/env python3
"""ai_state — deterministic project-state CLI (AI OS protocol v1).

Agent-neutral helper so Claude, Hermes, ChatGPT, scripts, and humans can read
and safely mutate .ai/project-state.json without hand-editing JSON. Every
mutation validates against .ai/project-state.schema.json and regenerates
PROJECT_STATUS.md.

Usage: python scripts/ai_state.py <command> ... (run from anywhere in the repo)
"""
import argparse
import datetime
import json
import os
import sys

STATE_REL = os.path.join(".ai", "project-state.json")
SCHEMA_REL = os.path.join(".ai", "project-state.schema.json")
STATUS_REL = "PROJECT_STATUS.md"

STATUSES = ["planned", "active", "blocked", "paused", "completed", "archived"]
TEST_STATES = ["passing", "failing", "unknown", "not-run"]
DEPLOY_STATES = ["verified", "unverified", "failing", "unknown"]


class StateError(Exception):
    pass


def find_root(start=None):
    d = os.path.abspath(start or os.getcwd())
    while True:
        if os.path.isfile(os.path.join(d, STATE_REL)):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise StateError(
                "No .ai/project-state.json found in this directory tree. "
                "Run from a protocol-adopting repository, or bootstrap with: "
                "python scripts/ai_state.py init --id <id> --name <name>"
            )
        d = parent


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today():
    return datetime.date.today().isoformat()


def validate_state(state, schema):
    try:
        import jsonschema
    except ImportError:
        raise StateError("jsonschema package required: pip install jsonschema")
    try:
        jsonschema.validate(instance=state, schema=schema)
    except jsonschema.ValidationError as e:
        path = ".".join(str(p) for p in e.absolute_path) or "(root)"
        raise StateError(f"INVALID project state at '{path}': {e.message}")


def generate_status(state):
    p = state["project"]
    s = state["state"]
    h = state.get("health", {})
    lines = [
        "<!-- GENERATED from .ai/project-state.json — do not edit by hand. -->",
        "<!-- Regenerate: python scripts/ai_state.py status -->",
        "",
        f"# {p['name']} — Current Project Status",
        "",
        f"**Status:** {s['status']}",
    ]
    if s.get("phase"):
        lines.append(f"**Current phase:** {s['phase']}")
    if s.get("current_focus"):
        lines.append(f"**Current focus:** {s['current_focus']}")
    lines.append("")

    def section(title, items, fmt):
        lines.append(f"## {title}")
        lines.append("")
        if items:
            for it in items:
                lines.append(fmt(it))
        else:
            lines.append("- None recorded.")
        lines.append("")

    section("Last completed", state.get("last_completed", []),
            lambda i: f"- **{i['date']}** — {i['summary']}" + (f" (`{i['commit']}`)" if i.get("commit") else ""))
    section("Next", state.get("next_actions", []),
            lambda i: f"- [{i['id']}] {i['summary']}")
    section("Blockers", state.get("blockers", []),
            lambda i: f"- [{i['id']}] {i['summary']}")
    section("Parked", state.get("parked", []),
            lambda i: f"- [{i['id']}] {i['summary']} — {i['reason']}" + (f" (revisit: {i['revisit']})" if i.get("revisit") else ""))

    lines.append("## Health")
    lines.append("")
    lines.append(f"- Tests: {h.get('tests', 'unknown')}")
    lines.append(f"- Deployment: {h.get('deployment', 'unknown')}")
    lines.append(f"- Known critical issue: {'YES' if h.get('known_critical_issue') else 'no'}")
    lines.append("")

    ptr = state.get("pointers", {})
    refs = [f"- {k}: `{v}`" for k, v in ptr.items() if v]
    if refs:
        lines.append("## Canonical documents")
        lines.append("")
        lines.extend(refs)
        lines.append("")

    lu = state["last_updated"]
    lines.append(f"*Last updated: {lu['timestamp']} by {lu['agent']}*")
    lines.append("")
    return "\n".join(lines)


def touch(state, agent):
    state["last_updated"] = {"timestamp": now_iso(), "agent": agent}


def mutate(root, agent, fn):
    state_path = os.path.join(root, STATE_REL)
    schema_path = os.path.join(root, SCHEMA_REL)
    state = load_json(state_path)
    schema = load_json(schema_path)
    fn(state)
    touch(state, agent)
    validate_state(state, schema)
    write_json(state_path, state)
    status = generate_status(state)
    with open(os.path.join(root, STATUS_REL), "w", encoding="utf-8") as f:
        f.write(status)
    return state


def find_item(items, item_id, what):
    for it in items:
        if it.get("id") == item_id:
            return it
    raise StateError(f"{what} '{item_id}' not found.")


def cmd_show(root, args):
    print(json.dumps(load_json(os.path.join(root, STATE_REL)), indent=2, ensure_ascii=False))


def cmd_validate(root, args):
    state = load_json(os.path.join(root, STATE_REL))
    schema = load_json(os.path.join(root, SCHEMA_REL))
    validate_state(state, schema)
    print(f"VALID: {STATE_REL} conforms to schema v{state['schema_version']}")


def cmd_status(root, args):
    state = load_json(os.path.join(root, STATE_REL))
    out = generate_status(state)
    path = os.path.join(root, STATUS_REL)
    if args.check:
        existing = open(path, encoding="utf-8").read() if os.path.isfile(path) else None
        if existing != out:
            raise StateError(f"{STATUS_REL} is OUT OF SYNC with {STATE_REL}. Run: python scripts/ai_state.py status")
        print(f"IN SYNC: {STATUS_REL} matches {STATE_REL}")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"REGENERATED: {STATUS_REL}")


def cmd_focus(root, args):
    mutate(root, args.agent, lambda s: s["state"].__setitem__("current_focus", args.text))
    print(f"FOCUS: {args.text}")


def cmd_complete(root, args):
    def fn(s):
        entry = {"id": args.id, "summary": args.summary, "date": today()}
        if args.commit:
            entry["commit"] = args.commit
        s.setdefault("last_completed", []).insert(0, entry)
        s["last_completed"] = s["last_completed"][:10]
        s["next_actions"] = [n for n in s.get("next_actions", []) if n.get("id") != args.id]
    mutate(root, args.agent, fn)
    print(f"COMPLETED: [{args.id}] {args.summary}")


def cmd_next_add(root, args):
    def fn(s):
        items = s.setdefault("next_actions", [])
        nid = args.id or f"NEXT-{len(items) + 1:03d}"
        if any(n["id"] == nid for n in items):
            raise StateError(f"next action '{nid}' already exists.")
        items.append({"id": nid, "summary": args.summary})
    mutate(root, args.agent, fn)
    print(f"NEXT ADDED: {args.summary}")


def cmd_next_remove(root, args):
    def fn(s):
        find_item(s.get("next_actions", []), args.id, "next action")
        s["next_actions"] = [n for n in s["next_actions"] if n["id"] != args.id]
    mutate(root, args.agent, fn)
    print(f"NEXT REMOVED: {args.id}")


def cmd_blocker_add(root, args):
    def fn(s):
        items = s.setdefault("blockers", [])
        if any(b["id"] == args.id for b in items):
            raise StateError(f"blocker '{args.id}' already exists.")
        items.append({"id": args.id, "summary": args.summary, "date": today()})
    mutate(root, args.agent, fn)
    print(f"BLOCKER ADDED: [{args.id}] {args.summary}")


def cmd_blocker_resolve(root, args):
    def fn(s):
        find_item(s.get("blockers", []), args.id, "blocker")
        s["blockers"] = [b for b in s["blockers"] if b["id"] != args.id]
    mutate(root, args.agent, fn)
    print(f"BLOCKER RESOLVED: {args.id}")


def cmd_park(root, args):
    def fn(s):
        items = s.setdefault("parked", [])
        if any(p["id"] == args.id for p in items):
            raise StateError(f"parked item '{args.id}' already exists.")
        entry = {"id": args.id, "summary": args.summary, "reason": args.reason}
        if args.revisit:
            entry["revisit"] = args.revisit
        items.append(entry)
    mutate(root, args.agent, fn)
    print(f"PARKED: [{args.id}] {args.summary}")


def cmd_decision_add(root, args):
    def fn(s):
        items = s.setdefault("decisions", [])
        if any(d["id"] == args.id for d in items):
            raise StateError(f"decision '{args.id}' already exists.")
        entry = {"id": args.id, "summary": args.summary}
        if args.source:
            entry["source"] = args.source
        items.append(entry)
    mutate(root, args.agent, fn)
    print(f"DECISION RECORDED: [{args.id}] {args.summary}")


def cmd_health(root, args):
    def fn(s):
        h = s.setdefault("health", {})
        if args.kind == "tests":
            h["tests"] = args.value
        else:
            h["deployment"] = args.value
    mutate(root, args.agent, fn)
    print(f"HEALTH: {args.kind} = {args.value}")


def cmd_init(root, args):
    ai_dir = os.path.join(root, ".ai")
    os.makedirs(ai_dir, exist_ok=True)
    state_path = os.path.join(root, STATE_REL)
    if os.path.isfile(state_path) and not args.force:
        raise StateError(f"{STATE_REL} already exists. Use --force to reinitialize.")
    state = {
        "schema_version": "1.0",
        "project": {"id": args.id, "name": args.name},
        "state": {"status": args.status, "phase": args.phase or "", "current_focus": ""},
        "last_updated": {"timestamp": now_iso(), "agent": args.agent},
        "last_completed": [],
        "next_actions": [],
        "blockers": [],
        "parked": [],
        "decisions": [],
        "health": {"tests": "unknown", "deployment": "unknown", "known_critical_issue": False},
        "pointers": {"status": STATUS_REL},
    }
    if args.repository:
        state["project"]["repository"] = args.repository
    schema_path = os.path.join(root, SCHEMA_REL)
    if not os.path.isfile(schema_path):
        raise StateError(f"Schema missing at {SCHEMA_REL}. Copy it from ChalBAS/ai-operating-system first (see docs/PROJECT-STATE-PROTOCOL.md).")
    validate_state(state, load_json(schema_path))
    write_json(state_path, state)
    with open(os.path.join(root, STATUS_REL), "w", encoding="utf-8") as f:
        f.write(generate_status(state))
    print(f"INITIALIZED: {STATE_REL} + {STATUS_REL} for project '{args.id}'")


def main():
    ap = argparse.ArgumentParser(prog="ai_state", description="AI OS project-state CLI (protocol v1)")
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--agent", default=os.environ.get("AI_AGENT", "unknown"), help="agent/human identity recorded in last_updated")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("show", parents=[common])
    sub.add_parser("validate", parents=[common])
    sp = sub.add_parser("status", parents=[common]); sp.add_argument("--check", action="store_true")

    sp = sub.add_parser("focus", parents=[common]); sp.add_argument("text")

    sp = sub.add_parser("complete", parents=[common]); sp.add_argument("id"); sp.add_argument("--summary", required=True); sp.add_argument("--commit")

    sp = sub.add_parser("next", parents=[common]); nss = sp.add_subparsers(dest="sub", required=True)
    na = nss.add_parser("add", parents=[common]); na.add_argument("summary"); na.add_argument("--id")
    nr = nss.add_parser("remove", parents=[common]); nr.add_argument("id")

    sp = sub.add_parser("blocker", parents=[common]); bs = sp.add_subparsers(dest="sub", required=True)
    ba = bs.add_parser("add", parents=[common]); ba.add_argument("id"); ba.add_argument("--summary", required=True)
    br = bs.add_parser("resolve", parents=[common]); br.add_argument("id")

    sp = sub.add_parser("park", parents=[common]); sp.add_argument("id"); sp.add_argument("--summary", required=True); sp.add_argument("--reason", required=True); sp.add_argument("--revisit")

    sp = sub.add_parser("decision", parents=[common]); ds = sp.add_subparsers(dest="sub", required=True)
    da = ds.add_parser("add", parents=[common]); da.add_argument("id"); da.add_argument("--summary", required=True); da.add_argument("--source")

    sp = sub.add_parser("health", parents=[common]); sp.add_argument("kind", choices=["tests", "deployment"]); sp.add_argument("value")

    sp = sub.add_parser("init", parents=[common]); sp.add_argument("--id", required=True); sp.add_argument("--name", required=True)
    sp.add_argument("--repository"); sp.add_argument("--status", default="active", choices=STATUSES)
    sp.add_argument("--phase"); sp.add_argument("--force", action="store_true")

    args = ap.parse_args()

    if args.cmd == "init":
        root = os.path.abspath(os.getcwd())
    else:
        root = find_root()

    if args.cmd == "health":
        valid = TEST_STATES if args.kind == "tests" else DEPLOY_STATES
        if args.value not in valid:
            print(f"ERROR: {args.kind} must be one of {valid}", file=sys.stderr)
            sys.exit(2)

    handlers = {
        "show": cmd_show, "validate": cmd_validate, "status": cmd_status,
        "focus": cmd_focus, "complete": cmd_complete,
        "next": {"add": cmd_next_add, "remove": cmd_next_remove},
        "blocker": {"add": cmd_blocker_add, "resolve": cmd_blocker_resolve},
        "park": cmd_park,
        "decision": {"add": cmd_decision_add},
        "health": cmd_health, "init": cmd_init,
    }
    h = handlers[args.cmd]
    if isinstance(h, dict):
        h = h[args.sub]
    try:
        h(root, args)
    except StateError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"ERROR: missing file — {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
