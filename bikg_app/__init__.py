from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from visyn_core.plugin.model import AVisynPlugin, RegHelper

from .routers.routes import router as rdf_router
from .settings import AppSettings, get_settings


class VisynPlugin(AVisynPlugin):
    def init_app(self, app: FastAPI):
        # Register anything related the the FastAPI here, i.e. routers, middlewares, events, etc.
        from .example_router import example_router

        app.include_router(example_router, prefix="/api/app")

        @app.middleware("http")
        async def log_all_requests(request: Request, call_next):
            print(f"Incoming request: {request.method} {request.url.path}")
            response = await call_next(request)
            return response

        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # print(f"Adding router for reading RDF files from folder: {folder_path}")
        app.include_router(rdf_router)

        @app.on_event("startup")
        async def startup():
            # Add the / path at the very end to match all other routes before
            bundles_dir = get_settings().bundles_dir
            if bundles_dir:
                # Mount the bundles directory as static file to enable the frontend (required in single Dockerfile mode)
                app.mount("/", StaticFiles(directory=bundles_dir, html=True), name="bundle")

    def register(self, registry: RegHelper):
        pass

    @property
    def setting_class(self) -> type[AppSettings]:
        return AppSettings
