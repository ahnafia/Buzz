#!/bin/bash

################################################################################
# Buzz Database Population Script
# Creates users, landmarks, flags, likes, and social connections
# Usage: ./populate-db.sh
################################################################################

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080}"
DELAY=0.2  # Delay between requests to avoid race conditions

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
USERS_CREATED=0
LANDMARKS_CREATED=0
FLAGS_CREATED=0
LIKES_CREATED=0
FOLLOWS_CREATED=0

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_server() {
    log_info "Checking if server is running at $BASE_URL..."
    if ! curl -s "$BASE_URL/users" > /dev/null 2>&1; then
        log_error "Cannot connect to $BASE_URL"
        log_info "Make sure your Spring Boot app is running:"
        log_info "  ./mvnw spring-boot:run"
        exit 1
    fi
    log_success "Server is running!"
}

extract_id() {
    echo "$1" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4
}

extract_field() {
    local json="$1"
    local field="$2"
    echo "$json" | grep -o "\"$field\":\"[^\"]*" | cut -d'"' -f4
}

################################################################################
# User Creation
################################################################################

create_user() {
    local username="$1"
    local email="$2"
    local display_name="$3"
    local user_type="$4"
    local business_name="${5:-null}"
    local business_category="${6:-null}"

    log_info "Creating user: $username ($user_type)"

    local business_fields=""
    if [ "$user_type" = "BUSINESS" ] && [ "$business_name" != "null" ]; then
        business_fields=", \"businessName\": \"$business_name\", \"businessCategory\": \"$business_category\""
    fi

    local response=$(curl -s -X POST "$BASE_URL/users" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$username\",
            \"email\": \"$email\",
            \"password\": \"SecurePass123\",
            \"displayName\": \"$display_name\",
            \"userType\": \"$user_type\"
            $business_fields
        }")

    local user_id=$(extract_id "$response")

    if [ -z "$user_id" ] || [ "$user_id" = "null" ]; then
        log_error "Failed to create user $username"
        log_info "Response: $response"
        return 1
    fi

    log_success "Created user: $username (ID: $user_id)"
    echo "$user_id"
    ((USERS_CREATED++))
    sleep $DELAY
}

################################################################################
# Landmark Creation
################################################################################

create_landmark() {
    local user_id="$1"
    local name="$2"
    local description="$3"
    local lat="$4"
    local lon="$5"
    local category="$6"

    log_info "Creating landmark: $name"

    local response=$(curl -s -X POST "$BASE_URL/landmarks" \
        -H "Content-Type: application/json" \
        -H "X-User-Id: $user_id" \
        -d "{
            \"name\": \"$name\",
            \"description\": \"$description\",
            \"lat\": $lat,
            \"lon\": $lon,
            \"category\": \"$category\"
        }")

    local landmark_id=$(extract_id "$response")

    if [ -z "$landmark_id" ] || [ "$landmark_id" = "null" ]; then
        log_error "Failed to create landmark $name"
        return 1
    fi

    log_success "Created landmark: $name (ID: $landmark_id)"
    echo "$landmark_id"
    ((LANDMARKS_CREATED++))
    sleep $DELAY
}

################################################################################
# Flag Creation
################################################################################

create_flag() {
    local user_id="$1"
    local title="$2"
    local description="$3"
    local lat="$4"
    local lon="$5"
    local category="$6"
    local image_url="${7:-null}"
    local is_public="${8:-true}"

    log_info "Creating flag: $title"

    local image_field=""
    if [ "$image_url" != "null" ]; then
        image_field=", \"imageUrl\": \"$image_url\""
    fi

    local response=$(curl -s -X POST "$BASE_URL/flags" \
        -H "Content-Type: application/json" \
        -H "X-User-Id: $user_id" \
        -d "{
            \"title\": \"$title\",
            \"description\": \"$description\",
            \"lat\": $lat,
            \"lon\": $lon,
            \"category\": \"$category\"
            $image_field,
            \"isPublic\": $is_public
        }")

    local flag_id=$(extract_id "$response")

    if [ -z "$flag_id" ] || [ "$flag_id" = "null" ]; then
        log_error "Failed to create flag $title"
        return 1
    fi

    log_success "Created flag: $title (ID: $flag_id)"
    echo "$flag_id"
    ((FLAGS_CREATED++))
    sleep $DELAY
}

################################################################################
# Like Flag
################################################################################

like_flag() {
    local flag_id="$1"
    local user_id="$2"

    log_info "User liking flag..."

    local response=$(curl -s -X POST "$BASE_URL/flags/$flag_id/like" \
        -H "X-User-Id: $user_id")

    # Check if response contains success message
    if echo "$response" | grep -q "liked"; then
        log_success "Flag liked"
        ((LIKES_CREATED++))
    else
        log_warning "Failed to like flag"
    fi

    sleep $DELAY
}

################################################################################
# Follow User
################################################################################

follow_user() {
    local target_username="$1"
    local follower_id="$2"

    log_info "User following $target_username..."

    local response=$(curl -s -X POST "$BASE_URL/users/$target_username/follow" \
        -H "X-User-Id: $follower_id")

    # Check if response contains success message
    if echo "$response" | grep -q "following"; then
        log_success "Now following $target_username"
        ((FOLLOWS_CREATED++))
    else
        log_warning "Failed to follow $target_username"
    fi

    sleep $DELAY
}

################################################################################
# Update User Profile
################################################################################

update_user_profile() {
    local user_id="$1"
    local display_name="$2"
    local bio="$3"
    local city="$4"
    local lat="$5"
    local lon="$6"
    local profile_image_url="${7:-null}"

    log_info "Updating user profile..."

    local profile_image_field=""
    if [ "$profile_image_url" != "null" ]; then
        profile_image_field=", \"profileImageUrl\": \"$profile_image_url\""
    fi

    curl -s -X PATCH "$BASE_URL/users/me" \
        -H "Content-Type: application/json" \
        -H "X-User-Id: $user_id" \
        -d "{
            \"displayName\": \"$display_name\",
            \"bio\": \"$bio\",
            \"city\": \"$city\",
            \"lat\": $lat,
            \"lon\": $lon,
            \"locationVisible\": true,
            \"profilePublic\": true
            $profile_image_field
        }" > /dev/null

    log_success "Updated user profile"
    sleep $DELAY
}

################################################################################
# Main Script
################################################################################

main() {
    clear
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Buzz Database Population Script                        ║"
    echo "║         Creates users, landmarks, flags, likes & follows      ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    check_server
    echo ""

    # ====== CREATE USERS ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING USERS"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    USER1=$(create_user "john_doe" "john@example.com" "John Doe" "PERSONAL")
    USER2=$(create_user "alice_smith" "alice@example.com" "Alice Smith" "PERSONAL")
    USER3=$(create_user "bobs_coffee" "info@bobscoffee.com" "Bobs Coffee Shop" "BUSINESS" "Bobs Coffee Shop" "Cafe")
    USER4=$(create_user "event_pro" "events@promoter.com" "Event Promoter" "PROMOTER")

    echo ""

    # ====== UPDATE USER PROFILES ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "UPDATING USER PROFILES"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    update_user_profile "$USER1" "John Doe" "Travel enthusiast | Coffee lover | NYC explorer" "New York" "40.7128" "-74.0060" "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    update_user_profile "$USER2" "Alice Smith" "Art collector | Museum enthusiast | Brunch lover" "New York" "40.7489" "-73.9680" "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    update_user_profile "$USER3" "Bobs Coffee Shop" "Premium coffee | Specialty drinks | Est. 2015" "New York" "40.7489" "-73.9680" "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&h=150&fit=crop&crop=center"
    update_user_profile "$USER4" "Event Promoter" "Bringing amazing events to NYC" "New York" "40.7580" "-73.9855" "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"

    echo ""

    # ====== CREATE LANDMARKS FOR USER 1 ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING LANDMARKS FOR JOHN DOE"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    LM1=$(create_landmark "$USER1" "Central Park" "Beautiful park in Manhattan. Great for walking and relaxing. One of my favorite spots!" "40.7829" "-73.9654" "park")
    LM2=$(create_landmark "$USER1" "Times Square" "Iconic tourist spot with amazing lights at night. Must see at least once!" "40.7580" "-73.9855" "tourist_spot")
    LM3=$(create_landmark "$USER1" "Brooklyn Bridge" "Historic bridge with amazing views of Manhattan. Great for photos and evening walks." "40.7061" "-73.9969" "landmark")
    LM4=$(create_landmark "$USER1" "Joes Coffee" "Best espresso in the city. Always crowded but absolutely worth the wait. My daily spot!" "40.7489" "-73.9680" "cafe")
    LM5=$(create_landmark "$USER1" "Madison Square Garden" "Iconic venue for concerts and sporting events. Amazing energy!" "40.7505" "-73.9972" "venue")

    echo ""

    # ====== CREATE LANDMARKS FOR USER 2 ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING LANDMARKS FOR ALICE SMITH"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    LM6=$(create_landmark "$USER2" "Metropolitan Museum of Art" "World class art museum. Incredible collections spanning thousands of years. I could spend days here!" "40.7813" "-73.9740" "museum")
    LM7=$(create_landmark "$USER2" "The Highline" "Converted elevated railway. Great for evening walks. Amazing urban design!" "40.7480" "-74.0048" "park")

    echo ""

    # ====== CREATE FLAGS FOR USER 1 ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING FLAGS FOR JOHN DOE"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    FLAG1=$(create_flag "$USER1" "Amazing Jazz Concert Tonight!" "Live jazz performance at Blue Note. Doors open at 8pm. $50 tickets. Not to be missed!" "40.7295" "-73.9965" "event" "https://example.com/jazz-concert.jpg" "true")
    FLAG2=$(create_flag "$USER1" "Best Pizza in NYC!" "Just tried this place - amazing thin crust pizza. Wait time about 30 mins but totally worth it!" "40.7282" "-73.7949" "dining" "https://example.com/pizza.jpg" "true")
    FLAG3=$(create_flag "$USER1" "Secret rooftop bar" "Only locals know about this place. Amazing cocktails and views of the city. Super chill vibe." "40.7505" "-73.9972" "nightlife" "" "false")
    FLAG4=$(create_flag "$USER1" "Incredible street art mural" "Check out this new mural by famous artist. Absolutely stunning work. Must see in person!" "40.7120" "-73.9565" "art" "https://example.com/mural.jpg" "true")

    echo ""

    # ====== CREATE FLAGS FOR USER 2 ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING FLAGS FOR ALICE SMITH"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    FLAG5=$(create_flag "$USER2" "Perfect day at Central Park" "Brought my friends here today. The weather was perfect. Everyone loved it! Already planning to go back." "40.7829" "-73.9654" "event" "https://example.com/central-park-day.jpg" "true")
    FLAG6=$(create_flag "$USER2" "New exhibition at Met Museum" "Incredible new Van Gogh exhibition. Get tickets online to skip the line. Highly recommend!" "40.7813" "-73.9740" "event" "https://example.com/met-exhibit.jpg" "true")
    FLAG7=$(create_flag "$USER2" "Best brunch spot in the neighborhood" "Their avocado toast is incredible! Brunched here today. Highly recommend! Be prepared to wait." "40.7480" "-74.0048" "dining" "https://example.com/brunch.jpg" "true")

    echo ""

    # ====== CREATE FLAGS FOR USER 3 (BUSINESS) ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING FLAGS FOR BOB'S COFFEE SHOP"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    FLAG8=$(create_flag "$USER3" "New espresso machine celebration! 50% off all coffee" "We just got a new state-of-the-art espresso machine! Come celebrate with us! All drinks 50% off from 2pm-5pm today!" "40.7489" "-73.9680" "event" "https://example.com/coffee-promo.jpg" "true")

    echo ""

    # ====== CREATE FLAGS FOR USER 4 (PROMOTER) ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING FLAGS FOR EVENT PROMOTER"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    FLAG9=$(create_flag "$USER4" "Tech Conference - Register Now!" "Biggest tech conference of the year! Featuring talks from industry leaders. Early bird pricing ends Friday!" "40.7127" "-73.9654" "event" "https://example.com/tech-conf.jpg" "true")

    echo ""

    # ====== ADD LIKES ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "ADDING LIKES"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Alice likes John's flags
    like_flag "$FLAG1" "$USER2"
    like_flag "$FLAG2" "$USER2"
    like_flag "$FLAG4" "$USER2"

    # Bob likes John's flags
    like_flag "$FLAG1" "$USER3"
    like_flag "$FLAG2" "$USER3"

    # Event Promoter likes Alice's flags
    like_flag "$FLAG5" "$USER4"
    like_flag "$FLAG6" "$USER4"

    # John likes Alice's flags
    like_flag "$FLAG5" "$USER1"
    like_flag "$FLAG7" "$USER1"

    # John likes Bob's flag
    like_flag "$FLAG8" "$USER1"

    echo ""

    # ====== ADD FOLLOWS ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "BUILDING SOCIAL CONNECTIONS"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Alice follows John
    follow_user "john_doe" "$USER2"

    # John follows Alice
    follow_user "alice_smith" "$USER1"

    # John follows Bob's Coffee
    follow_user "bobs_coffee" "$USER1"

    # Alice follows Bob's Coffee
    follow_user "bobs_coffee" "$USER2"

    # John follows Event Promoter
    follow_user "event_pro" "$USER1"

    # Alice follows Event Promoter
    follow_user "event_pro" "$USER2"

    echo ""

    # ====== SUMMARY ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "DATABASE POPULATION COMPLETE!"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Summary:"
    echo "  Users created:      $USERS_CREATED"
    echo "  Landmarks created:  $LANDMARKS_CREATED"
    echo "  Flags created:      $FLAGS_CREATED"
    echo "  Likes created:      $LIKES_CREATED"
    echo "  Social follows:     $FOLLOWS_CREATED"
    echo ""
    echo "User Accounts:"
    echo "  John Doe:        $USER1"
    echo "  Alice Smith:     $USER2"
    echo "  Bobs Coffee:     $USER3"
    echo "  Event Promoter:  $USER4"
    echo ""
    echo "Next steps:"
    echo "  1. Open http://localhost:8080"
    echo "  2. View profiles with:"
    echo "     curl http://localhost:8080/users/john_doe/profile"
    echo "     curl http://localhost:8080/users/alice_smith/profile"
    echo "     curl http://localhost:8080/users/bobs_coffee/profile"
    echo "  3. Find nearby flags:"
    echo "     curl 'http://localhost:8080/flags/nearby?lat=40.7128&lon=-74.0060&radiusMiles=5.0'"
    echo ""
}

# Run main function
main
