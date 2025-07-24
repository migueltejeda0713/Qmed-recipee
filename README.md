# 🩺 Qmed-Recipe - Backend en Go

Este proyecto es un backend construido en Go para el manejo de datos médicos, incluyendo pacientes, aseguradoras, prescripciones médicas y relaciones entre ellos. Está diseñado para ser consumido por un frontend (como React) y facilitar la gestión clínica de manera sencilla y segura.

---

## 🚀 Tecnologías utilizadas

- **Go (Golang)** - Lenguaje principal  
- **MySQL** - Base de datos relacional  
- **Gorilla Mux** - Router para manejo de rutas  
- **SQL Driver** - `go-sql-driver/mysql` para conexión a MySQL  
- **CORS Middleware** - Control de acceso cross-origin  
- **.env** - Gestión de variables de entorno  

---

## 📁 Estructura del Proyecto

```
Qmed-Recipe/
├── db/                 # Conexión a la base de datos
├── handlers/           # Endpoints HTTP para cada funcionalidad
├── middleware/         # Middleware personalizado (CORS)
├── models/             # Modelos de datos utilizados por la app
└── main.go             # Punto de entrada principal del servidor
```

---

## 🧠 Funcionalidades principales

### 👤 Pacientes
- **GET** `/api/getpacients`  
  Listar todos los pacientes

- **POST** `/api/paciente`  
  Registrar nuevo paciente

- **PUT** `/api/editpaciente/{id}`  
  Editar información de un paciente

- **DELETE** `/api/deletepacient/{id}`  
  Eliminar paciente

### 🛡️ Aseguradoras
- **GET** `/api/aseguradoras`  
  Obtener lista de aseguradoras

### 📄 Pólizas
- **GET** `/api/edit_aseguradora/{id}`  
  Consultar póliza de un paciente (número de póliza, id y nombre de aseguradora)

### 💊 Prescripciones
- **POST** `/api/prescripcion`  
  Insertar receta médica con medicamento y componente (se crean si no existen)

---

## 🛡️ Seguridad y CORS

El middleware de CORS permite solicitudes solo desde `http://localhost:5173`. Puedes modificarlo en `middleware/cors.go`:

```go
w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
```

---

## ⚙️ Configuración del entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente formato:

```env
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=nombre_base_datos
DB_HOST=localhost
DB_PORT=3306
```

---

## 🧪 Ejecución local

```bash
go mod tidy         # Instalar dependencias
go run main.go      # Levantar el servidor en el puerto :5174
```

---

## 🛠️ Dependencias principales

- [github.com/gorilla/mux](https://github.com/gorilla/mux)  
- [github.com/joho/godotenv](https://github.com/joho/godotenv)  
- [go-sql-driver/mysql](https://github.com/go-sql-driver/mysql)  

---

## 📌 Notas adicionales

- Todos los endpoints manejan correctamente `OPTIONS` para CORS.  
- Uso de `sql.NullString` y `sql.NullInt64` para campos opcionales.  
- La estructura del proyecto es modular y permite agregar entidades como doctores, citas, facturas, etc.

---

💡 **Con Qmed-Recipe puedes integrar la salud con tecnología, mejorando la gestión clínica de manera moderna y sencilla.**
