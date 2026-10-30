#!/bin/sh
# Ejecuta Impeccable con caché local fuera del código versionado.
set -eu
proyecto=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$proyecto"
export IMPECCABLE_HOME="${IMPECCABLE_HOME:-$proyecto/var/herramientas/impeccable}"
exec "$proyecto/.agents/skills/impeccable/scripts/impeccable" "$@"
