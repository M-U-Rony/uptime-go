package handlers

import (
	"backend/internal/database"
	"backend/internal/middleware"
	"backend/internal/models"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"gorm.io/gorm"
)

type CreateWebsiteRequest struct {
	URL string `json:"url"`
}

func CreateWebsiteHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	userID, ok := middleware.GetUserID(r.Context())

	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req CreateWebsiteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON body"})
		return
	}

	req.URL = strings.TrimSpace(req.URL)

	parsedURL, err := url.ParseRequestURI(req.URL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") || parsedURL.Host == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Must provide a valid http or https URL"})
		return
	}

		website := models.Website{
		URL:    req.URL,
		UserID: userID,
	}
	if err := database.DB.Create(&website).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create website monitor"})
		return
	}
	// 5. Return 201 Created with the saved website
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(website)

}

func ListWebsiteHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	userID, ok := middleware.GetUserID(r.Context())

	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	websites := []models.Website{}

	if err := database.DB.Where("user_id = ?", userID).Find(&websites).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch websites"})
		return
	}
	// 3. Return 200 OK with the list
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(websites)

}

func GetWebsiteHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	userID, ok := middleware.GetUserID(r.Context())

	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	id := r.PathValue("id")

	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Website ID is required"})
		return
	}
	
	var website models.Website
	
	err := database.DB.Preload("Ticks").
		Where("id = ? AND user_id = ?", id, userID).
		First(&website).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Website not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch website"})
		return
	}

	if err := database.DB.Find(&website).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch website"})
		return
	}
	// 3. Return 200 OK with the list
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(website)

}

func DeleteWebsiteHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	userID, ok := middleware.GetUserID(r.Context())

	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	id := r.PathValue("id")

	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Website ID is required"})
		return
	}
	
	var website models.Website
	
	err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&website).Error
		
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Website not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete website"})
		return
	}

	if err := database.DB.Delete(&website).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete website"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Website deleted successfully"})

}