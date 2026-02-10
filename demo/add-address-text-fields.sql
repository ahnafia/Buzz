-- Add address_text field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_text TEXT;

-- Add city and address_text fields to flags table
ALTER TABLE flags ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE flags ADD COLUMN IF NOT EXISTS address_text TEXT;

-- Add city and address_text fields to landmarks table
ALTER TABLE landmarks ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE landmarks ADD COLUMN IF NOT EXISTS address_text TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.address_text IS 'Human-readable address for display purposes';
COMMENT ON COLUMN flags.city IS 'City name for the flag location';
COMMENT ON COLUMN flags.address_text IS 'Human-readable address for display purposes';
COMMENT ON COLUMN landmarks.city IS 'City name for the landmark location';
COMMENT ON COLUMN landmarks.address_text IS 'Human-readable address for display purposes';