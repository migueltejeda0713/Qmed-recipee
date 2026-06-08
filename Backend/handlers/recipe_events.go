package handlers

import (
	"database/sql"
	"log"
)

const (
	EventCreated      = "CREATED"
	EventDraftUpdated = "DRAFT_UPDATED"
	EventIssued       = "ISSUED"
	EventPrinted      = "PRINTED"
	EventCancelled    = "CANCELLED"
)

// execer is satisfied by both *sql.DB and *sql.Tx, letting logRecipeEvent
// be called inside or outside a transaction without branching.
type execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

// logRecipeEvent inserts a recipe lifecycle event. Failures are logged but
// never propagate — auditing must not block the main operation.
func logRecipeEvent(ex execer, recipeID, doctorID, eventType string) {
	if _, err := ex.Exec(
		`INSERT INTO recipe_event (id_recipe, id_doctor, event_type)
		 VALUES (UUID_TO_BIN(?, TRUE), UUID_TO_BIN(?, TRUE), ?)`,
		recipeID, doctorID, eventType,
	); err != nil {
		log.Printf("[recipe_event] failed to log %s for recipe %s: %v", eventType, recipeID, err)
	}
}
