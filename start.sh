#!/bin/sh
# Start the server in the background
uvicorn visyn_core.server.main:app --host 0.0.0.0 --port 9000 &
# Start the client in the foreground
yarn start
