#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR" || { echo "Failed to cd to ${SCRIPT_DIR}"; exit 1; }

DENO_PATH="${DENO_PATH:-$(which deno)}"

ENV="$(grep 'ENV' .env | grep -v '^#' | cut -d '=' -f2)"
ENV="${ENV:-prod}"

extra_args=()
if [[ "$ENV" == "dev" ]]; then
    echo "Running in development mode..."
    extra_args+=("--watch")
else
    echo "Running in production mode..."
fi

"$DENO_PATH" run \
    --allow-net \
    --allow-env \
    --allow-read \
    "${extra_args[@]}" \
    main.ts
