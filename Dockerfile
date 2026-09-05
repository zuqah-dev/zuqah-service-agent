# Zuqah Technologies Service Agent — production image.
#
# Multi-stage: dependencies and build artefacts are assembled in the first stage
# and only the runtime output is copied forward, so the shipped image carries no
# devDependencies, no source, and no build cache.
#
# Build and push. The image is built remotely by ACR Tasks — the Azure-native
# answer. Get the ACR name after deploying with:
#
#   az deployment sub show -n main --query properties.outputs.acrName.value -o tsv
#
# Then build:
#
#   az acr build --registry <acr-name> --resource-group rg-zuqah-cs-dev \
#     --image zuqah-cs/app:dev --file Dockerfile . --no-logs
#
# USE --no-logs ON WINDOWS. The Azure CLI streams the remote build log to the
# console, Vite prints a U+2713 check mark, and the cp1252 codepage cannot encode
# it — so the CLI dies with a UnicodeEncodeError partway through. Setting
# PYTHONIOENCODING=utf-8 does not reliably help, because colorama writes through
# the console handle rather than the Python stream.
#
# The build itself is unaffected and completes server-side, which makes the
# failure especially misleading: the command appears to fail while the image is
# built and pushed successfully. Watch it instead with:
#
#   az acr task list-runs --registry <acr-name> --top 1 -o table

# --- build -------------------------------------------------------------------
FROM oven/bun:1 AS build

WORKDIR /app

# Copied first so a source-only change does not invalidate the dependency layer.
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY . .
RUN bun run build

# --- runtime -----------------------------------------------------------------
FROM oven/bun:1-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Production dependencies only.
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile || bun install --production

COPY --from=build /app/build ./build

# The custom Express server. Without this the image starts the default
# react-router-serve, which does not trust the proxy — see the note in server.js.
COPY --from=build /app/server.js ./server.js

# The policy PDFs, served behind /documents/:file so citation links resolve.
COPY --from=build /app/data/generated/pdf ./data/generated/pdf

# Fail the build rather than the demo. An earlier .dockerignore silently excluded
# these, producing an image that started cleanly and 404'd on every citation --
# the kind of fault that is only discovered in front of an audience.
RUN test "$(ls -1 ./data/generated/pdf/*.pdf 2>/dev/null | wc -l)" -ge 15     || (echo "ERROR: expected at least 15 policy PDFs in the image" && exit 1)

# App Service probes this. The container is unhealthy until it answers.
EXPOSE 3000

# Run as the unprivileged user the base image provides.
USER bun

CMD ["bun", "run", "start"]
