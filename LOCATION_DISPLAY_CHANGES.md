# Location Display Changes Summary

## Overview
Updated the application to display human-readable addresses (`addressText`) instead of lat/long coordinates in the profile, while still storing lat/long coordinates in the backend for functionality.

## Backend Changes

### Models Updated
1. **User.java** - Added `addressText` field
2. **UserProfile.java** - Added `addressText` field and updated factory method
3. **EnhancedUserProfile.java** - Added `addressText` field and updated factory method
4. **UpdateUserRequest.java** - Added `addressText` field
5. **Flag.java** - Added `city` and `addressText` fields
6. **CreateFlagRequest.java** - Added `city` and `addressText` fields
7. **UpdateFlagRequest.java** - Added `city` and `addressText` fields

### Repository Updates
1. **UserRepository.java** - Updated all SQL queries and mapUser method to include `address_text`
2. **FlagRepository.java** - Updated all SQL queries, createFlag, updateFlag, and mapFlag methods to include `city` and `address_text`

### Service Updates
1. **UserService.java** - Updated updateUser method to handle `addressText`
2. **FlagService.java** - Updated createFlag and updateFlag methods to handle new fields

## Frontend Changes

### Type Definitions
1. **api.ts** - Added `addressText` field to UserProfile, Flag, and Landmark interfaces

### UI Updates
1. **ProfileScreen.tsx** - Updated location display logic:
   - Business location: `profile.addressText || profile.city || 'Location not set'`
   - User location: `profile.addressText || profile.city || 'Location not set'`
   - Flag locations: `flag.addressText || flag.city || 'Location not set'`
   - Settings form: Shows `addressText` or `city` as default value

## Database Changes

### Required Migration
Run the SQL script `demo/add-address-text-fields.sql` to add the new columns:
```sql
-- Add address_text field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_text TEXT;

-- Add city and address_text fields to flags table
ALTER TABLE flags ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE flags ADD COLUMN IF NOT EXISTS address_text TEXT;
```

## Behavior Changes

### Before
- Profile displayed coordinates like "40.7128, -74.0060" when no city was set
- Flag locations showed lat/long coordinates as fallback

### After
- Profile displays human-readable addresses when available
- Falls back to city name if no addressText
- Falls back to "Location not set" if neither addressText nor city available
- Backend still stores and uses lat/long for all location-based functionality (nearby searches, etc.)

## Usage
When creating or updating users/flags, clients can now provide:
- `lat` and `lon` (required for location functionality)
- `city` (optional, for basic location display)
- `addressText` (optional, for detailed human-readable address display)

The display priority is: `addressText` > `city` > "Location not set"