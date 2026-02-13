#!/bin/bash

# Run the event image_path migration
# This adds the image_path column to the events table and populates it with sample data

echo "Running event image_path migration..."

# Database connection details (update these if needed)
DB_HOST="aws-1-us-east-1.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.hiugxnxlgwbucwlmzcit"
DB_PASSWORD="ucBP8KPEOxD1QCKv"

# Run the migration
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f ../add-event-image-path.sql

if [ $? -eq 0 ]; then
    echo "✅ Event image_path migration completed successfully!"
    echo "Events now have image_path column and sample images have been added."
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi