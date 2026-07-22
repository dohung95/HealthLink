from __future__ import annotations

from urllib.error import HTTPError

import pytest

from services.qdrant_guideline_store import QdrantGuidelineStore


def test_staging_collection_name_is_explicit_and_rejects_unsafe_corpus_versions():
    store = QdrantGuidelineStore("http://qdrant.test", "student-demo-guidelines")

    assert store.staging_collection_name("student-demo-2026.2") == (
        "student-demo-guidelines__staging__student-demo-2026.2"
    )
    with pytest.raises(ValueError, match="corpus version"):
        store.staging_collection_name("../../active")


def test_promotion_validates_staging_before_atomically_switching_active_alias(monkeypatch):
    store = QdrantGuidelineStore("http://qdrant.test", "student-demo-guidelines")
    staging = store.staging_collection_name("student-demo-2026.2")
    calls = []

    def record_request(method, path, body=None):
        calls.append((method, path, body))
        if method == "GET":
            return {"result": {"config": {"params": {"vectors": {"size": 384}}}, "points_count": 2}}
        return {"result": {"status": "ok"}}

    monkeypatch.setattr(store, "_request", record_request)

    store.promote(staging, "guidelines-active", expected_vector_dimension=384)

    assert calls == [
        ("GET", f"/collections/{staging}", None),
        ("POST", "/collections/aliases?wait=true", {
            "actions": [
                {"delete_alias": {"alias_name": "guidelines-active"}},
                {"create_alias": {"collection_name": staging, "alias_name": "guidelines-active"}},
            ],
        }),
    ]
    assert ("DELETE", "/collections/student-demo-guidelines", None) not in calls


def test_promotion_fails_closed_when_alias_switch_is_rejected(monkeypatch):
    store = QdrantGuidelineStore("http://qdrant.test", "student-demo-guidelines")
    staging = store.staging_collection_name("student-demo-2026.2")
    calls = []

    def reject_alias_switch(method, path, body=None):
        calls.append((method, path, body))
        if method == "GET":
            return {"result": {"config": {"params": {"vectors": {"size": 384}}}, "points_count": 1}}
        raise HTTPError("http://qdrant.test/collections/aliases", 500, "rejected", {}, None)

    monkeypatch.setattr(store, "_request", reject_alias_switch)

    with pytest.raises(HTTPError, match="rejected"):
        store.promote(staging, "guidelines-active", expected_vector_dimension=384)

    assert [path for _, path, _ in calls] == [f"/collections/{staging}", "/collections/aliases?wait=true"]


def test_stage_rejects_an_empty_collection_before_returning_it(monkeypatch):
    store = QdrantGuidelineStore("http://qdrant.test", "student-demo-guidelines")
    monkeypatch.setattr(QdrantGuidelineStore, "upsert", lambda *_args: None)
    calls = []

    def request(method, path, body=None):
        calls.append((method, path, body))
        if len(calls) == 1:
            raise HTTPError("http://qdrant.test/collections/staging", 404, "missing", {}, None)
        return {"result": {"config": {"params": {"vectors": {"size": 384}}}, "points_count": 0}}

    monkeypatch.setattr(QdrantGuidelineStore, "_request", request)

    with pytest.raises(ValueError, match="no staged guideline points"):
        store.stage([object()], [[0.0] * 384], "student-demo-2026.2")


def test_stage_refuses_to_reuse_an_existing_versioned_collection(monkeypatch):
    store = QdrantGuidelineStore("http://qdrant.test", "student-demo-guidelines")
    monkeypatch.setattr(QdrantGuidelineStore, "upsert", lambda *_args: None)
    monkeypatch.setattr(QdrantGuidelineStore, "_request", lambda *_args: {
        "result": {"config": {"params": {"vectors": {"size": 384}}}, "points_count": 1}
    })

    with pytest.raises(ValueError, match="already exists"):
        store.stage([object()], [[0.0] * 384], "student-demo-2026.2")
