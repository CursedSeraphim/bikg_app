import logging

from fastapi import APIRouter

_log = logging.getLogger(__name__)
example_router = APIRouter(tags=["Example"])


@example_router.get("/example")
def get_example():
    _log.info("Example endpoint called")
    return {"message": "example"}
