from pydantic import BaseModel
from tdp_core import manager


class AppSettings(BaseModel):
    example_setting: str = "example"
    """Example setting which can be overriden by the .env file via bikg_app__EXAMPLE_SETTING=..."""


def get_settings() -> AppSettings:
    return manager.settings.bikg_app  # type: ignore
