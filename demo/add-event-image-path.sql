-- Add image_path column to events table
-- This allows events to have profile pictures/images that will be displayed on the map

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Add some sample image paths to existing events for testing
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=150&h=150&fit=crop&crop=center' WHERE category = 'music' AND image_path IS NULL;
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=150&h=150&fit=crop&crop=center' WHERE category = 'food' AND image_path IS NULL;
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150&h=150&fit=crop&crop=center' WHERE category = 'sports' AND image_path IS NULL;
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&h=150&fit=crop&crop=center' WHERE category = 'art' AND image_path IS NULL;
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=150&h=150&fit=crop&crop=center' WHERE category = 'tech' AND image_path IS NULL;
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=150&h=150&fit=crop&crop=center' WHERE category = 'business' AND image_path IS NULL;
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=150&h=150&fit=crop&crop=center' WHERE category = 'education' AND image_path IS NULL;
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop&crop=center' WHERE category = 'health' AND image_path IS NULL;

-- Set a default image for any remaining events without images
UPDATE events SET image_path = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=150&h=150&fit=crop&crop=center' WHERE image_path IS NULL;