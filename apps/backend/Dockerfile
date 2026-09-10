# Stage 1: Build the Go binary
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install ca-certificates (needed for https pings) and git
RUN apk add --no-cache ca-certificates git

# Cache Go modules layer
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary without debug symbols for minimum size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# Stage 2: Minimal production image
FROM alpine:3.21

WORKDIR /app

# Install root CA certificates for HTTPS pinging and timezone data
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /app/server /app/server

# Run as unprivileged user
USER appuser

EXPOSE 8080

CMD ["/app/server"]
