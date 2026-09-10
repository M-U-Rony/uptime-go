package worker

import (
	"context"
	"log"
	"net/http"
	"time"

	"backend/internal/database"
	"backend/internal/models"
	"backend/internal/redis"
)

// StartPool spawns `numWorkers` concurrent worker goroutines
func StartPool(numWorkers int) {
	// Ensure a default region exists for ticks (e.g. "us-east-1")
	var defaultRegion models.Region
	database.DB.FirstOrCreate(&defaultRegion, models.Region{Name: "us-east-1"})

	log.Printf("👷 Starting %d ping workers in background pool...", numWorkers)

	for i := 1; i <= numWorkers; i++ {
		workerID := i
		go runWorker(workerID, defaultRegion.ID)
	}
}

func runWorker(id int, regionID string) {
	ctx := context.Background()
	client := http.Client{
		Timeout: 10 * time.Second,
	}

	for {
		// 1. Wait for and pop next PingJob from Redis (contains both ID & URL)
		job, err := redis.PopPingJob(ctx)
		if err != nil {
			log.Printf("⚠️ Worker %d: Error popping from queue: %v", id, err)
			time.Sleep(1 * time.Second)
			continue
		}

		// 2. Ping the URL directly and measure latency (ZERO database read queries!)
		start := time.Now()
		resp, err := client.Get(job.URL)
		duration := time.Since(start).Milliseconds()

		status := "up"
		if err != nil || resp.StatusCode >= 400 {
			status = "down"
		}

		if resp != nil {
			resp.Body.Close() // Close connection to prevent socket leak
		}

		// 3. Save tick result directly to PostgreSQL
		tick := models.WebsiteTick{
			WebsiteID:    job.ID,
			RegionID:     regionID,
			ResponseTime: int(duration),
			Status:       status,
		}

		if err := database.DB.Create(&tick).Error; err != nil {
			log.Printf("❌ Worker %d: Failed to save tick for %s: %v", id, job.URL, err)
			continue
		}

		log.Printf("⚡ Worker %d: Pinged %s [%s] in %dms", id, job.URL, status, duration)
	}
}
