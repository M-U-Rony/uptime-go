package main

import (
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/producer"
	"backend/internal/redis"
	"fmt"
	"log"
	"net/http"
	"time"
)

func main() {

	_, err := database.Connect()
	if err != nil {
		log.Fatalf("❌ Database connection error: %v", err)
	}

	_, err = redis.Connect()
	if err != nil {
		log.Fatalf("❌ Redis connection error: %v", err)
	}

	go producer.Start(5* 60 * time.Second)

	mux := http.NewServeMux()

	// Add this line with your other routes:
	mux.HandleFunc("POST /api/auth/signup", handlers.SignupHandler)
	mux.HandleFunc("POST /api/auth/signin", handlers.SigninHandler)

	mux.Handle("POST /api/websites", middleware.RequireAuth(http.HandlerFunc(handlers.CreateWebsiteHandler)))

	mux.Handle("GET /api/websites", middleware.RequireAuth(http.HandlerFunc(handlers.ListWebsiteHandler)))

	mux.Handle("GET /api/websites/{id}", middleware.RequireAuth(http.HandlerFunc(handlers.GetWebsiteHandler)))

	mux.Handle("DELETE /api/websites/{id}", middleware.RequireAuth(http.HandlerFunc(handlers.DeleteWebsiteHandler)))

	fmt.Println("🚀 Go server running on http://localhost:8080")

	http.ListenAndServe(":8080", mux)
}
