package redis

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// QueueName is the Redis List key where ping jobs are stored
const QueueName = "website_ping_queue"

// Global Redis client
var Client *redis.Client

// Connect initializes the connection to Redis
func Connect() (*redis.Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Matches docker-compose port
		Password: "",               // No password set in docker-compose
		DB:       0,                // Default DB
	})

	// Ping Redis to verify connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("✅ Connected to Redis successfully!")
	Client = rdb
	return rdb, nil
}

// PushPingJob pushes a website ID to the end of the queue (Producer)
func PushPingJob(ctx context.Context, websiteID string) error {
	return Client.LPush(ctx, QueueName, websiteID).Err()
}

// PopPingJob pops a website ID from the queue (Worker)
// BRPop blocks and waits if the queue is currently empty
func PopPingJob(ctx context.Context) (string, error) {
	// 0 means wait indefinitely until a job arrives
	result, err := Client.BRPop(ctx, 0*time.Second, QueueName).Result()
	if err != nil {
		return "", err
	}
	// result[0] is the queue name, result[1] is the popped value (websiteID)
	return result[1], nil
}
