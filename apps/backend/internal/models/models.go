package models

import (
	"time"
)

type User struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Username  string    `gorm:"uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"` // Never exposed in JSON
	Websites  []Website `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"websites,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Website struct {
	ID        string        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	URL       string        `gorm:"not null" json:"url"`
	UserID    string        `gorm:"not null;type:uuid" json:"user_id"`
	User      User          `gorm:"foreignKey:UserID" json:"-"`
	Ticks     []WebsiteTick `gorm:"foreignKey:WebsiteID;constraint:OnDelete:CASCADE" json:"ticks,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
}

type Region struct {
	ID        string        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name      string        `gorm:"uniqueIndex;not null" json:"name"`
	Ticks     []WebsiteTick `gorm:"foreignKey:RegionID" json:"-"`
	CreatedAt time.Time     `json:"created_at"`
}

type WebsiteTick struct {
	ID           string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	WebsiteID    string    `gorm:"not null;type:uuid;index" json:"website_id"`
	RegionID     string    `gorm:"not null;type:uuid" json:"region_id"`
	ResponseTime int       `gorm:"not null" json:"response_time_ms"`
	Status       string    `gorm:"type:varchar(10);not null" json:"status"` // "up" or "down"
	CreatedAt    time.Time `json:"created_at"`
}
