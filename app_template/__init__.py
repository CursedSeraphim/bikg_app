from fastapi import FastAPI
from visyn_core.plugin.model import AVisynPlugin, RegHelper

from .settings import AppSettings


class VisynPlugin(AVisynPlugin):
    def init_app(self, app: FastAPI):
        # Register anything related the the FastAPI here, i.e. routers, middlewares, events, etc.
        from .example_router import example_router

        app.include_router(example_router, prefix="/api/app")

    def register(self, registry: RegHelper):
        pass

    @property
    def setting_class(self) -> type[AppSettings]:
        return AppSettings
