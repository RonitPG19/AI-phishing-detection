from datetime import datetime, timedelta, timezone
from flask import jsonify, request
from google.cloud import firestore

from app.extensions.firebase import db

ROLE_TO_UI = {
    "admin": "Admin",
    "analyst": "Analyst",
    "viewer": "Viewer",
    "user": "Viewer",
}
UI_TO_ROLE = {
    "Admin": "admin",
    "Analyst": "analyst",
    "Viewer": "user",
}
VALID_ROLES = set(UI_TO_ROLE.keys())
VALID_STATUSES = {"Active", "Suspended"}
RISK_BUCKETS = [
    ("Safe", 0, 9, "safe"),
    ("Low", 10, 29, "low"),
    ("Medium", 30, 54, "medium"),
    ("High", 55, 74, "high"),
    ("Critical", 75, 100, "critical"),
]


def _iso_now():
    return datetime.now(timezone.utc).isoformat()


def _to_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def _clean_text(value, fallback=""):
    if value is None:
        return fallback
    return str(value).strip() or fallback


def _display_name(user):
    for key in ("displayName", "display_name", "name", "full_name"):
        value = _clean_text(user.get(key))
        if value:
            return value
    email = _clean_text(user.get("email"))
    if email and "@" in email:
        return email.split("@", 1)[0]
    return "Tribunal User"


def _display_role(role):
    return ROLE_TO_UI.get(str(role or "user").lower(), "Viewer")


def _display_status(user):
    raw_status = str(user.get("status") or "").strip().lower()
    if raw_status == "suspended" or user.get("disabled") is True or user.get("suspended") is True:
        return "Suspended"
    return "Active"


def _photo_url(user):
    for key in ("photoURL", "photoUrl", "picture", "avatarUrl", "avatar_url"):
        value = _clean_text(user.get(key))
        if value:
            return value
    return ""


def _serialize_user(snapshot):
    user = snapshot.to_dict() or {}
    uid = _clean_text(user.get("uid"), snapshot.id)
    created_at = user.get("created_at") or user.get("created_by") or user.get("createdAt")
    updated_at = user.get("updated_at") or user.get("updatedAt")
    return {
        "id": uid,
        "uid": uid,
        "name": _display_name(user),
        "email": _clean_text(user.get("email")),
        "role": _display_role(user.get("role")),
        "status": _display_status(user),
        "provider": _clean_text(user.get("provider"), "local"),
        "photoURL": _photo_url(user),
        "createdAt": _to_datetime(created_at).isoformat() if _to_datetime(created_at) else None,
        "updatedAt": _to_datetime(updated_at).isoformat() if _to_datetime(updated_at) else None,
    }


def _history_timestamp(item):
    return _to_datetime(item.get("requestedAt") or item.get("savedAt") or item.get("createdAt"))


def _risk_score(item):
    try:
        return int(item.get("overallRiskScore") or item.get("riskScore") or 0)
    except (TypeError, ValueError):
        return 0


def _risk_bucket(score):
    for label, lower, upper, variant in RISK_BUCKETS:
        if lower <= score <= upper:
            return label, variant
    return "Critical", "critical"


def _empty_daily_counts(days=90):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    return {
        (start + timedelta(days=offset)).isoformat(): 0
        for offset in range(days)
    }


def _read_history_documents(limit=1000):
    docs = []
    try:
        query = db.collection("user_scan_history").order_by("requestedAt", direction=firestore.Query.DESCENDING).limit(limit)
        docs = list(query.stream())
    except Exception:
        docs = list(db.collection("user_scan_history").limit(limit).stream())
    return [doc.to_dict() or {} for doc in docs]


def list_users(current_user):
    users = []
    for snapshot in db.collection("users").stream():
        data = snapshot.to_dict() or {}
        if data.get("deleted_at") or data.get("deletedAt"):
            continue
        users.append(_serialize_user(snapshot))

    users.sort(key=lambda user: (user["role"] != "Admin", user["name"].lower(), user["email"].lower()))
    return jsonify({"users": users})


def update_user(current_user, user_id):
    data = request.get_json(silent=True) or {}
    updates = {"updated_at": _iso_now()}

    if "role" in data:
        role = data.get("role")
        if role not in VALID_ROLES:
            return jsonify({"error": "Invalid role"}), 400
        updates["role"] = UI_TO_ROLE[role]

    if "status" in data:
        status = data.get("status")
        if status not in VALID_STATUSES:
            return jsonify({"error": "Invalid status"}), 400
        updates["status"] = status
        updates["suspended"] = status == "Suspended"
        updates["disabled"] = status == "Suspended"

    if "email" in data:
        email = _clean_text(data.get("email"))
        if not email or "@" not in email:
            return jsonify({"error": "Invalid email"}), 400
        updates["email"] = email

    if len(updates) == 1:
        return jsonify({"error": "No supported fields to update"}), 400

    user_ref = db.collection("users").document(user_id)
    snapshot = user_ref.get()
    if not snapshot.exists:
        return jsonify({"error": "User not found"}), 404

    user_ref.update(updates)
    return jsonify({"user": _serialize_user(user_ref.get())})


def delete_user(current_user, user_id):
    user_ref = db.collection("users").document(user_id)
    snapshot = user_ref.get()
    if not snapshot.exists:
        return jsonify({"error": "User not found"}), 404

    user_ref.update({
        "deleted_at": _iso_now(),
        "status": "Suspended",
        "suspended": True,
        "disabled": True,
    })
    return jsonify({"message": "User removed"})


def dashboard_summary(current_user):
    history = [item for item in _read_history_documents() if not item.get("deletedAt") and not item.get("deleted_at")]
    now = datetime.now(timezone.utc)
    last_30_start = now - timedelta(days=30)
    last_90_start = now - timedelta(days=90)

    total_scans = len(history)
    blocked_threats = sum(1 for item in history if _risk_score(item) >= 10)

    recent_items = [item for item in history if (_history_timestamp(item) or datetime.min.replace(tzinfo=timezone.utc)) >= last_30_start]
    distribution_counts = {label: 0 for label, *_rest in RISK_BUCKETS}
    for item in recent_items:
        label, _variant = _risk_bucket(_risk_score(item))
        distribution_counts[label] += 1

    recent_total = max(1, len(recent_items))
    threat_distribution = []
    for label, _lower, _upper, variant in RISK_BUCKETS:
        percent = round((distribution_counts[label] / recent_total) * 100)
        threat_distribution.append({"label": label, "value": percent, "variant": variant})

    daily_counts = _empty_daily_counts(90)
    for item in history:
        timestamp = _history_timestamp(item)
        if not timestamp or timestamp < last_90_start:
            continue
        key = timestamp.date().isoformat()
        if key in daily_counts:
            daily_counts[key] += 1

    chart_data = [{"date": date, "scans": scans} for date, scans in daily_counts.items()]

    return jsonify({
        "kpis": [
            {
                "label": "Total Scans",
                "value": f"{total_scans:,}",
                "delta": "Live",
                "icon": "Radar",
            },
            {
                "label": "Blocked Threats",
                "value": f"{blocked_threats:,}",
                "delta": "Risk >= low",
                "icon": "ShieldCheck",
            },
        ],
        "chartData": chart_data,
        "threatDistribution": threat_distribution,
    })
