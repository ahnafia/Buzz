#!/bin/bash

################################################################################
# Buzz Events Population Script
# Creates sample events for testing the map functionality
# Usage: ./populate-events.sh
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
EVENTS_CREATED=0

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

################################################################################
# Event Creation
################################################################################

create_event() {
    local title="$1"
    local category="$2"
    local lat="$3"
    local lon="$4"
    local start_time="$5"
    local end_time="$6"
    local description="$7"
    local owner="$8"

    log_info "Creating event: $title"

    local response=$(curl -s -X POST "$BASE_URL/events" \
        -H "Content-Type: application/json" \
        -H "X-User-Id: $owner" \
        -d "{
            \"title\": \"$title\",
            \"category\": \"$category\",
            \"lat\": $lat,
            \"lon\": $lon,
            \"startTime\": \"$start_time\",
            \"endTime\": \"$end_time\",
            \"description\": \"$description\"
        }")

    local event_id=$(extract_id "$response")

    if [ -z "$event_id" ] || [ "$event_id" = "null" ]; then
        log_error "Failed to create event $title"
        log_info "Response: $response"
        return 1
    fi

    log_success "Created event: $title (ID: $event_id)"
    echo "$event_id"
    ((EVENTS_CREATED++))
    sleep $DELAY
}

################################################################################
# Main Script
################################################################################

main() {
    clear
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Buzz Events Population Script                          ║"
    echo "║         Creates sample events for map testing                  ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    check_server
    echo ""

    # Get current time for event scheduling
    local now=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    local tomorrow=$(date -u -d "+1 day" +"%Y-%m-%dT%H:%M:%S.000Z")
    local next_week=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%S.000Z")
    local tonight_8pm=$(date -u -d "today 20:00" +"%Y-%m-%dT%H:%M:%S.000Z")
    local tonight_11pm=$(date -u -d "today 23:00" +"%Y-%m-%dT%H:%M:%S.000Z")
    local tomorrow_2pm=$(date -u -d "tomorrow 14:00" +"%Y-%m-%dT%H:%M:%S.000Z")
    local tomorrow_6pm=$(date -u -d "tomorrow 18:00" +"%Y-%m-%dT%H:%M:%S.000Z")

    # ====== CREATE EVENTS ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "CREATING EVENTS"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Events around Penn State area (since that's the map center)
    EVENT1=$(create_event "Live Jazz at Blue Note" "music" "40.7934" "-77.8616" "$tonight_8pm" "$tonight_11pm" "Amazing live jazz performance featuring local artists. Great atmosphere and drinks!" "john_doe")
    
    EVENT2=$(create_event "Food Truck Festival" "food" "40.7950" "-77.8600" "$tomorrow_2pm" "$tomorrow_6pm" "Multiple food trucks serving delicious local cuisine. Perfect for lunch!" "alice_smith")
    
    EVENT3=$(create_event "Tech Meetup: AI & Machine Learning" "technology" "40.7920" "-77.8630" "$tomorrow" "$next_week" "Join us for discussions about the latest in AI and ML. Networking and presentations." "event_pro")
    
    EVENT4=$(create_event "Coffee Cupping Session" "food" "40.7940" "-77.8610" "$tomorrow_2pm" "$tomorrow_6pm" "Learn about different coffee beans and brewing methods. Free samples!" "bobs_coffee")
    
    EVENT5=$(create_event "Art Gallery Opening" "art" "40.7960" "-77.8590" "$tonight_8pm" "$next_week" "New contemporary art exhibition opening. Wine and cheese reception." "alice_smith")

    # Events in NYC area (for variety)
    EVENT6=$(create_event "Rooftop Party" "nightlife" "40.7580" "-73.9855" "$tonight_8pm" "$tonight_11pm" "Exclusive rooftop party with amazing city views. RSVP required." "event_pro")
    
    EVENT7=$(create_event "Farmers Market" "food" "40.7829" "-73.9654" "$tomorrow_2pm" "$tomorrow_6pm" "Fresh local produce and artisanal goods in Central Park." "john_doe")

    echo ""

    # ====== SUMMARY ======
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "EVENTS POPULATION COMPLETE!"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Summary:"
    echo "  Events created: $EVENTS_CREATED"
    echo ""
    echo "Test the events API:"
    echo "  curl 'http://localhost:8080/events/pins?lat=40.7934&lon=-77.8616&radiusMiles=10'"
    echo ""
    echo "Events created:"
    echo "  Live Jazz at Blue Note:     $EVENT1"
    echo "  Food Truck Festival:        $EVENT2"
    echo "  Tech Meetup:               $EVENT3"
    echo "  Coffee Cupping Session:     $EVENT4"
    echo "  Art Gallery Opening:        $EVENT5"
    echo "  Rooftop Party:             $EVENT6"
    echo "  Farmers Market:            $EVENT7"
    echo ""
}

# Run main function
main