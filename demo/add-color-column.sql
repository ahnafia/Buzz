-- Add color column to flags table
ALTER TABLE flags ADD COLUMN IF NOT EXISTS color VARCHAR(7);

-- Update existing flags with a default color
UPDATE flags SET color = '#64B9D3' WHERE color IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'flags' AND column_name = 'color';