from pydantic import BaseModel
from visyn_core import manager


class AppSettings(BaseModel):
    example_setting: str = "example"
    """Example setting which can be overriden by the .env file via APP_TEMPLATE__EXAMPLE_SETTING=..."""


def get_settings() -> AppSettings:
    return manager.settings.app_template  # type: ignore
