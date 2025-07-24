// main.go
package main

import (
	"log"
	"net/http"

	"Qmed-Recipe/db"
	"Qmed-Recipe/middleware"
	"Qmed-Recipe/routes"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Cargar configuración
	if err := godotenv.Load(); err != nil {
		log.Println("Advertencia: no se cargó .env")
	}

	// Inicializar DB
	db.InitDB()

	// Crear router y registrar rutas
	r := mux.NewRouter()
	routes.RegisterRoutes(r)

	// Aplicar CORS
	handlerWithCORS := middleware.CORS(r)

	log.Println("Servidor corriendo en el puerto 5174")
	if err := http.ListenAndServe(":5174", handlerWithCORS); err != nil {
		log.Fatal("Error al iniciar el servidor:", err)
	}
}
