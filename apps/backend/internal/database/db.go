package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"backend/internal/models" 
)

// Global DB instance (or can be passed via dependency injection)
var DB *gorm.DB

func Connect() (*gorm.DB, error) {
	// Database connection string matching our docker-compose.yml:
	dsn := "host=localhost user=postgres password=password123 dbname=uptime_db port=5432 sslmode=disable TimeZone=UTC"

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get the underlying sql.DB to configure connection pooling
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Configure connection pool
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// Ping the database to verify the connection is active
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	err = db.AutoMigrate(
    &models.User{},
    &models.Website{},
    &models.Region{},
    &models.WebsiteTick{},
)
if err != nil {
    return nil, fmt.Errorf("failed to auto-migrate database tables: %w", err)
}
	log.Println("✅ Database tables migrated successfully!")

	log.Println("✅ Connected to PostgreSQL successfully!")
	DB = db
	return db, nil
}
