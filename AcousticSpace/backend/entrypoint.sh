#!/bin/sh
# entrypoint.sh: Fix volume permissions at startup and drop privileges

# Ensure all volume mount directories are owned by appuser
chown -R appuser:appuser /app/backend/database \
                         /app/backend/uploads \
                         /app/backend/logs \
                         /app/backend/extracted_features \
                         /app/backend/saved_models

# Execute the application command as appuser
exec runuser -u appuser -- "$@"
