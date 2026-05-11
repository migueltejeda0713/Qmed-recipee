package models

type PrescriptionInput struct {
	IDMedicine        string `json:"id_medicine,omitempty"`
	Name              string `json:"name"`
	Quantity          string `json:"quantity"`
	Dosage            string `json:"dosage"`
	UsageInstructions string `json:"usage_instructions,omitempty"`
}

type Prescription struct {
	ID                string  `json:"id"`
	IDRecipe          string  `json:"id_recipe"`
	IDMedicine        *string `json:"id_medicine,omitempty"`
	Name              string  `json:"name"`
	Quantity          string  `json:"quantity"`
	Dosage            string  `json:"dosage"`
	UsageInstructions string  `json:"usage_instructions,omitempty"`
	CreatedAt         string  `json:"created_at"`
}

type CreateRecipeInput struct {
	IDPatient     string              `json:"id_patient"`
	GeneralNotes  string              `json:"general_notes,omitempty"`
	Prescriptions []PrescriptionInput `json:"prescriptions,omitempty"`
}

type UpdateRecipeInput struct {
	GeneralNotes *string `json:"general_notes,omitempty"`
}

type CancelRecipeInput struct {
	Reason string `json:"reason"`
}

type Recipe struct {
	ID                      string         `json:"id"`
	RecipeNumber            *string        `json:"recipe_number,omitempty"`
	IDPatient               string         `json:"id_patient"`
	IDDoctor                string         `json:"id_doctor"`
	StatusCode              string         `json:"status"`
	GeneralNotes            *string        `json:"general_notes,omitempty"`
	DoctorNameSnapshot      *string        `json:"doctor_name_snapshot,omitempty"`
	DoctorLicenseSnapshot   *string        `json:"doctor_license_snapshot,omitempty"`
	PatientNameSnapshot     *string        `json:"patient_name_snapshot,omitempty"`
	PatientDocumentSnapshot *string        `json:"patient_document_snapshot,omitempty"`
	IssuedAt                *string        `json:"issued_at,omitempty"`
	CancelledAt             *string        `json:"cancelled_at,omitempty"`
	CancellationReason      *string        `json:"cancellation_reason,omitempty"`
	ExpiresAt               *string        `json:"expires_at,omitempty"`
	PrintedAt               *string        `json:"printed_at,omitempty"`
	PrintCount              int            `json:"print_count"`
	CreatedAt               string         `json:"created_at"`
	UpdatedAt               string         `json:"updated_at"`
	Prescriptions           []Prescription `json:"prescriptions,omitempty"`
}

// RecipeDocument is the printable view: reconstructed entirely from
// snapshots and persisted line content so reprints stay historically fidel.
type RecipeDocument struct {
	RecipeNumber    string         `json:"recipe_number"`
	IssuedAt        string         `json:"issued_at"`
	DoctorName      string         `json:"doctor_name"`
	DoctorLicense   string         `json:"doctor_license"`
	PatientName     string         `json:"patient_name"`
	PatientDocument string         `json:"patient_document"`
	GeneralNotes    string         `json:"general_notes,omitempty"`
	Prescriptions   []Prescription `json:"prescriptions"`
	PrintCount      int            `json:"print_count"`
	PrintedAt       *string        `json:"printed_at,omitempty"`
}
