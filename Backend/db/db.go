package db

import (
	"crypto/tls"
	"database/sql"
	"os"
	"log"
	"github.com/joho/godotenv"
	
	"github.com/go-sql-driver/mysql"
)

var DB *sql.DB

// InitDB returns the shared *sql.DB pool, initializing it once on first call.
// IMPORTANT: callers must NEVER `defer db.Close()` on the returned pool — it
// is shared process-wide (used by middleware and every handler). Closing it
// from a handler tears down the pool for the rest of the application.
func InitDB() *sql.DB {
	if DB != nil {
		return DB
	}

	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error al cargar el archivo .env: ", err)
	}

	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbSSLMode := os.Getenv("DB_SSL_MODE")

	// Configurar conexión TLS si SSL está requerido
	if dbSSLMode == "required" {
		skipVerify := os.Getenv("APP_ENV") != "production"
		err := mysql.RegisterTLSConfig("custom", &tls.Config{
			InsecureSkipVerify: skipVerify,
		})
		if err != nil {
			log.Fatal("Error registrando configuración TLS: ", err)
		}
	}

	// Construir el DSN
	dsn := dbUser + ":" + dbPassword + "@tcp(" + dbHost + ":" + dbPort + ")/" + dbName

	if dbSSLMode == "required" {
		dsn += "?tls=custom"
	}

	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error al conectar con la base de datos: ", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Error al hacer ping a la base de datos: ", err)
	}

	return DB
}
