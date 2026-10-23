"""Redis Pub/Sub helpers for cross-instance social realtime events.

PostgreSQL remains authoritative. Events are published only after a successful
commit; clients must resync from the REST API after reconnecting because Pub/Sub
does not retain messages.
"""

import asyncio
import json
import logging
import os
from uuid import uuid4
from typing import Any

logger = logging.getLogger(__name__)

_sync_client = None
_async_client = None


def _redis_url() -> str | None:
    return os.getenv("REDIS_URL") or None


def realtime_enabled() -> bool:
    return _redis_url() is not None


def _get_sync_client():
    global _sync_client
    url = _redis_url()
    if not url:
        return None
    if _sync_client is None:
        from redis import Redis

        _sync_client = Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
            health_check_interval=30,
        )
    return _sync_client


async def get_async_client():
    global _async_client
    url = _redis_url()
    if not url:
        return None
    if _async_client is None:
        from redis.asyncio import Redis

        _async_client = Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=3,
            health_check_interval=30,
        )
    return _async_client


async def consume_websocket_ticket(ticket_id: str) -> bool:
    client = await get_async_client()
    if client is None:
        return False
    return bool(await asyncio.wait_for(
        client.set(f"social:ws-ticket:{ticket_id}", "1", ex=60, nx=True),
        timeout=3,
    ))


def publish_social_event(post_id: int, event: dict[str, Any]) -> None:
    """Best-effort publish; a Redis outage must not fail a committed API write."""
    client = _get_sync_client()
    if client is None:
        return
    try:
        event.setdefault("event_id", str(uuid4()))
        client.publish(
            f"social:post:{post_id}",
            json.dumps(event, separators=(",", ":"), default=str),
        )
    except Exception:
        logger.exception("Could not publish realtime event for social post %s", post_id)


async def close_clients() -> None:
    global _sync_client, _async_client
    if _sync_client is not None:
        _sync_client.close()
        _sync_client = None
    if _async_client is not None:
        await _async_client.aclose()
        _async_client = None
