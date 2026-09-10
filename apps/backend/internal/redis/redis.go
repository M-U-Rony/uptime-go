package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

// QueueName is the Redis List key where ping jobs are stored
const QueueName = "website_ping_queue"

// PingJob carries the necessary payload for a worker to ping without DB lookup
type PingJob struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

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

// PushPingJob pushes a serialized PingJob to the end of the queue (Producer)
func PushPingJob(ctx context.Context, job PingJob) error {
	data, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal ping job: %w", err)
	}
	return Client.LPush(ctx, QueueName, data).Err()
}

// PopPingJob pops and deserializes a PingJob from the queue (Worker)
// BRPop blocks and waits if the queue is currently empty
func PopPingJob(ctx context.Context) (*PingJob, error) {
	// 0 means wait indefinitely until a job arrives
	result, err := Client.BRPop(ctx, 0*time.Second, QueueName).Result()
	if err != nil {
		return nil, err
	}

	var job PingJob
	if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ping job: %w", err)
	}

	return &job, nil
}
