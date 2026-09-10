package producer

import (
	"context"
	"log"
	"time"

	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/redis"
)

// Start launches the periodic ping job producer
func Start(interval time.Duration) {
	log.Printf("⏰ Producer started! Enqueuing ping jobs every %v", interval)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Run once immediately on startup, then on every tick
	produceJobs()

	for range ticker.C {
		produceJobs()
	}
}

func produceJobs() {
	ctx := context.Background()

	// 1. Fetch all website IDs from PostgreSQL
	var websites []models.Website
	if err := database.DB.Select("id", "url").Find(&websites).Error; err != nil {
		log.Printf("❌ Producer: Failed to fetch websites: %v", err)
		return
	}

	if len(websites) == 0 {
		return
	}

	for _, website := range websites {
		job := redis.PingJob{
			ID:  website.ID,
			URL: website.URL,
		}
		if err := redis.PushPingJob(ctx, job); err != nil {
			log.Printf("❌ Producer: Failed to push job for website %s: %v", website.ID, err)
			continue
		}
	}

}
