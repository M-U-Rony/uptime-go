package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

// Define an unexported type for context keys to prevent collisions
type contextKey string

const UserIDKey contextKey = "userID"

// RequireAuth is a middleware that enforces valid JWT authentication
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// 1. Extract token from HttpOnly Cookie or Authorization header
		var tokenString string

		if cookie, err := r.Cookie("token"); err == nil && cookie.Value != "" {
			tokenString = cookie.Value
		} else {
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if tokenString == "" {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error": "Unauthorized: Missing authentication token or cookie"}`))
			return
		}

		// 2. Parse & validate token
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return config.JwtSecret, nil
		})

		if err != nil || !token.Valid {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error": "Invalid or expired token"}`))
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error": "Invalid token claims"}`))
			return
		}

		userID, ok := claims["user_id"].(string)
		if !ok || userID == "" {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error": "Invalid user ID in token"}`))
			return
		}

		// 3. Inject userID into context and continue
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Helper to easily extract the userID inside any downstream handler
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}
