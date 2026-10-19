// Event Seat Hold mock API — three endpoints, for practice.
// See REQUIREMENTS.md for the contract and DECISIONS.md for every behavior
// the requirement itself left open. Run with `go run main.go`, listens on :8080.
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

const holdDuration = 10 * time.Minute

type Seat struct {
	ID   string `json:"seatId"`
	Zone string `json:"zone"`
}

type Hold struct {
	ID         string    `json:"holdId"`
	EventID    string    `json:"eventId"`
	SeatID     string    `json:"seatId"`
	CustomerID string    `json:"customerId"`
	Status     string    `json:"status"` // stored: "held" | "confirmed" | "released"
	ExpiresAt  time.Time `json:"expiresAt"`
}

// effectiveStatus is what's shown externally — "held" becomes "expired"
// once past expiresAt. Confirmed/released are terminal and never expire.
func (h Hold) effectiveStatus(now time.Time) string {
	if h.Status == "held" && now.After(h.ExpiresAt) {
		return "expired"
	}
	return h.Status
}

func (h Hold) asJSON(now time.Time) map[string]any {
	return map[string]any{
		"holdId":     h.ID,
		"eventId":    h.EventID,
		"seatId":     h.SeatID,
		"customerId": h.CustomerID,
		"status":     h.effectiveStatus(now),
		"expiresAt":  h.ExpiresAt.Format(time.RFC3339),
	}
}

var (
	mu sync.Mutex

	seedEvents = map[string][]Seat{
		"evt_summer_fest": {
			{ID: "A12", Zone: "floor"},
			{ID: "A13", Zone: "floor"},
			{ID: "A14", Zone: "floor"},
			{ID: "A15", Zone: "balcony"},
			{ID: "A20", Zone: "balcony"},
		},
	}

	events map[string][]Seat
	holds  map[string]Hold
)

func resetState() {
	events = map[string][]Seat{}
	for k, v := range seedEvents {
		seats := make([]Seat, len(v))
		copy(seats, v)
		events[k] = seats
	}

	now := time.Now()
	holds = map[string]Hold{
		// A13 — active hold, owned by cust_bob, not expired
		"hold_open_001": {
			ID: "hold_open_001", EventID: "evt_summer_fest", SeatID: "A13",
			CustomerID: "cust_bob", Status: "held", ExpiresAt: now.Add(holdDuration),
		},
		// A14 — confirmed (seat reads as "sold")
		"hold_confirmed_001": {
			ID: "hold_confirmed_001", EventID: "evt_summer_fest", SeatID: "A14",
			CustomerID: "cust_alice", Status: "confirmed", ExpiresAt: now.Add(-time.Hour),
		},
		// A20 — expired (seat reads as "available" again)
		"hold_expired_001": {
			ID: "hold_expired_001", EventID: "evt_summer_fest", SeatID: "A20",
			CustomerID: "cust_carol", Status: "held", ExpiresAt: now.Add(-time.Minute),
		},
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func errJSON(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// seatStatus computes a seat's current status from its holds (decision #12).
func seatStatus(eventID, seatID string, now time.Time) string {
	for _, h := range holds {
		if h.EventID != eventID || h.SeatID != seatID {
			continue
		}
		switch h.effectiveStatus(now) {
		case "confirmed":
			return "sold" // a confirmed hold takes priority if present at all
		}
	}
	for _, h := range holds {
		if h.EventID != eventID || h.SeatID != seatID {
			continue
		}
		if h.effectiveStatus(now) == "held" {
			return "held"
		}
	}
	return "available"
}

var seatsPathRe = regexp.MustCompile(`^/api/events/([^/]+)/seats$`)
var holdsCreatePathRe = regexp.MustCompile(`^/api/events/([^/]+)/holds$`)
var holdPatchPathRe = regexp.MustCompile(`^/api/holds/([^/]+)$`)

func seatsHandler(w http.ResponseWriter, r *http.Request) {
	m := seatsPathRe.FindStringSubmatch(r.URL.Path)
	if m == nil {
		errJSON(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodGet {
		errJSON(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	eventID := m[1]

	status := r.URL.Query().Get("status")
	if status != "" && status != "available" && status != "held" && status != "sold" {
		errJSON(w, http.StatusBadRequest, "invalid status value")
		return
	}

	mu.Lock()
	defer mu.Unlock()

	seats, found := events[eventID]
	if !found {
		errJSON(w, http.StatusNotFound, "Event not found")
		return
	}

	now := time.Now()
	out := []map[string]any{}
	for _, s := range seats {
		st := seatStatus(eventID, s.ID, now)
		if status != "" && st != status {
			continue
		}
		out = append(out, map[string]any{"seatId": s.ID, "zone": s.Zone, "status": st})
	}
	writeJSON(w, http.StatusOK, out)
}

func createHoldHandler(w http.ResponseWriter, r *http.Request) {
	m := holdsCreatePathRe.FindStringSubmatch(r.URL.Path)
	if m == nil {
		errJSON(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPost {
		errJSON(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	eventID := m[1]

	actorID := r.Header.Get("x-customer-id")
	if strings.TrimSpace(actorID) == "" {
		errJSON(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	mu.Lock()
	defer mu.Unlock()

	seats, found := events[eventID]
	if !found {
		errJSON(w, http.StatusNotFound, "Seat not found")
		return
	}

	var body struct {
		SeatID json.RawMessage `json:"seatId"`
	}
	decodeErr := json.NewDecoder(r.Body).Decode(&body)
	var seatID string
	validField := false
	if decodeErr == nil && body.SeatID != nil {
		if err := json.Unmarshal(body.SeatID, &seatID); err == nil {
			validField = true
		}
	}
	if decodeErr != nil || !validField || strings.TrimSpace(seatID) == "" {
		errJSON(w, http.StatusBadRequest, "seatId is required")
		return
	}

	seatExists := false
	for _, s := range seats {
		if s.ID == seatID {
			seatExists = true
			break
		}
	}
	if !seatExists {
		errJSON(w, http.StatusNotFound, "Seat not found")
		return
	}

	now := time.Now()
	if seatStatus(eventID, seatID, now) != "available" {
		errJSON(w, http.StatusConflict, "Seat not available")
		return
	}

	newID := "hold_" + randSuffix()
	h := Hold{
		ID: newID, EventID: eventID, SeatID: seatID,
		CustomerID: actorID, Status: "held", ExpiresAt: now.Add(holdDuration),
	}
	holds[newID] = h
	writeJSON(w, http.StatusOK, h.asJSON(now))
}

func patchHoldHandler(w http.ResponseWriter, r *http.Request) {
	m := holdPatchPathRe.FindStringSubmatch(r.URL.Path)
	if m == nil {
		errJSON(w, http.StatusNotFound, "not found")
		return
	}
	if r.Method != http.MethodPatch {
		errJSON(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	holdID := m[1]

	actorID := r.Header.Get("x-customer-id")
	if strings.TrimSpace(actorID) == "" {
		errJSON(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	mu.Lock()
	defer mu.Unlock()

	h, found := holds[holdID]
	if !found || h.CustomerID != actorID {
		errJSON(w, http.StatusNotFound, "Hold not found")
		return
	}

	now := time.Now()
	if h.effectiveStatus(now) != "held" {
		// expired, confirmed, or released — all terminal, same conflict
		errJSON(w, http.StatusConflict, "Hold is no longer active")
		return
	}

	var body struct {
		Status json.RawMessage `json:"status"`
	}
	decodeErr := json.NewDecoder(r.Body).Decode(&body)
	var target string
	validField := false
	if decodeErr == nil && body.Status != nil {
		if err := json.Unmarshal(body.Status, &target); err == nil {
			validField = true
		}
	}
	if decodeErr != nil || !validField || (target != "confirmed" && target != "released") {
		errJSON(w, http.StatusBadRequest, "invalid status")
		return
	}

	h.Status = target
	holds[holdID] = h
	writeJSON(w, http.StatusOK, h.asJSON(now))
}

func debugSeatsHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	now := time.Now()
	out := map[string]any{}
	for eventID, seats := range events {
		list := []map[string]any{}
		for _, s := range seats {
			list = append(list, map[string]any{"seatId": s.ID, "zone": s.Zone, "status": seatStatus(eventID, s.ID, now)})
		}
		out[eventID] = list
	}
	writeJSON(w, http.StatusOK, out)
}

func debugHoldsHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	now := time.Now()
	out := map[string]any{}
	for id, h := range holds {
		out[id] = h.asJSON(now)
	}
	writeJSON(w, http.StatusOK, out)
}

func debugResetHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	resetState()
	writeJSON(w, http.StatusOK, map[string]string{"status": "reset"})
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"routes": []string{
			"GET   /api/events/{eventId}/seats?status={available|held|sold}",
			"POST  /api/events/{eventId}/holds",
			"PATCH /api/holds/{holdId}",
			"GET   /debug/seats",
			"GET   /debug/holds",
			"POST  /debug/reset",
		},
	})
}

var seedCounter int

func randSuffix() string {
	seedCounter++
	return time.Now().Format("150405") + "_" + itoa(seedCounter)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := []byte{}
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}

func main() {
	mu.Lock()
	resetState()
	mu.Unlock()

	http.HandleFunc("/api/events/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/seats") {
			seatsHandler(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/holds") {
			createHoldHandler(w, r)
			return
		}
		errJSON(w, http.StatusNotFound, "not found")
	})
	http.HandleFunc("/api/holds/", patchHoldHandler)
	http.HandleFunc("/debug/seats", debugSeatsHandler)
	http.HandleFunc("/debug/holds", debugHoldsHandler)
	http.HandleFunc("/debug/reset", debugResetHandler)
	http.HandleFunc("/", rootHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Println("seat-hold-mock-api listening on", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
