package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/config"

	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5" 
)


// The incoming request body shape
type SignupRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// The outgoing response body shape
type AuthResponse struct {
	Message string       `json:"message"`
	User    *models.User `json:"user,omitempty"`
}

type SigninRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type SigninResponse struct {
    Message string `json:"message"`
    Token   string `json:"token"`
}


func SignupHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Decode JSON body from request
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON body"})
		return
	}

	// 2. Validate input
	req.Username = strings.TrimSpace(req.Username)
	if len(req.Username) < 3 || len(req.Password) < 6 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Username must be at least 3 chars and password at least 6 chars",
		})
		return
	}

	// 3. Hash the password with bcrypt
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to hash password"})
		return
	}

	// 4. Save to PostgreSQL via GORM
	user := models.User{
		Username: req.Username,
		Password: string(hashedBytes),
	}

	result := database.DB.Create(&user)
	if result.Error != nil {
		// If username already exists, PostgreSQL throws a unique constraint error
		w.WriteHeader(http.StatusConflict) // 409 Conflict
		json.NewEncoder(w).Encode(map[string]string{"error": "Username already taken"})
		return
	}

	// 5. Send 201 Created response
	// Remember: User.Password has `json:"-"` so it will NEVER be sent in this response!
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(AuthResponse{
		Message: "User created successfully",
		User:    &user,
	})
}

func SigninHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    // 1. Parse JSON body
    var req SigninRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
        return
    }

    // 2. Find user in PostgreSQL
    var user models.User
    result := database.DB.Where("username = ?", req.Username).First(&user)
    if result.Error != nil {
        // User does not exist
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid username or password"})
        return
    }

    // 3. Compare password hash
    err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
    if err != nil {
        // Password mismatch
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid username or password"})
        return
    }

    // 4. Create JWT Token (Valid for 7 days)
    claims := jwt.MapClaims{
        "user_id": user.ID,
        "exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    tokenString, err := token.SignedString(config.JwtSecret)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create token"})
        return
    }

    // 5. Send Token to client
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(SigninResponse{
        Message: "Signed in successfully",
        Token:   tokenString,
    })
}
