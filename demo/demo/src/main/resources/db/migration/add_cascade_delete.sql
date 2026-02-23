-- Add CASCADE delete to flag_likes foreign key constraint
-- This will automatically delete all likes when a flag is deleted

-- Drop the existing foreign key constraint
ALTER TABLE flag_likes 
DROP CONSTRAINT IF EXISTS flag_likes_flag_id_fkey;

-- Add the new constraint with CASCADE delete
ALTER TABLE flag_likes 
ADD CONSTRAINT flag_likes_flag_id_fkey 
    FOREIGN KEY (flag_id) REFERENCES flags(id) ON DELETE CASCADE;

-- Verify the constraint was added
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'flag_likes'
  AND kcu.column_name = 'flag_id';