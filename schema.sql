CREATE TABLE IF NOT EXISTS ashram_settings (
    id INT PRIMARY KEY DEFAULT 1,
    ashram_name VARCHAR(255) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम',
    ashram_latitude DECIMAL(11, 8) NOT NULL DEFAULT 28.3972915,
    ashram_longitude DECIMAL(11, 8) NOT NULL DEFAULT 78.1460410,
    allowed_radius_meters DECIMAL(8, 2) NOT NULL DEFAULT 200.0,
    is_geofence_enforced TINYINT(1) NOT NULL DEFAULT 1,
    is_outstation_advance_allowed TINYINT(1) NOT NULL DEFAULT 1,
    outstation_min_distance_km DECIMAL(6, 2) NOT NULL DEFAULT 30.0,
    current_serving_token INT NOT NULL DEFAULT 0,
    daily_token_limit INT NOT NULL DEFAULT 1000,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ashram_settings (id, ashram_name, ashram_latitude, ashram_longitude, allowed_radius_meters, is_geofence_enforced, is_outstation_advance_allowed, outstation_min_distance_km)
VALUES (1, 'श्री बालाजी कृपा धाम', 28.3972915, 78.1460410, 200.0, 1, 1, 30.0);

CREATE TABLE IF NOT EXISTS tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    darbar_date DATE NOT NULL,
    token_number INT NOT NULL,
    patient_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT '',
    device_id VARCHAR(100) DEFAULT '',
    latitude DECIMAL(11, 8) DEFAULT 0.0,
    longitude DECIMAL(11, 8) DEFAULT 0.0,
    distance_km DECIMAL(8, 2) DEFAULT 0.0,
    origin_address TEXT,
    destination_address TEXT,
    photo_url VARCHAR(500) DEFAULT '',
    status ENUM('WAITING', 'SERVING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    registered_by VARCHAR(50) NOT NULL DEFAULT 'ONLINE_DEVOTEE',
    is_darshan_completed TINYINT(1) NOT NULL DEFAULT 0,
    darshan_completed_at BIGINT DEFAULT NULL,
    created_at BIGINT NOT NULL,
    server_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_date_token (darbar_date, token_number),
    INDEX idx_date_status (darbar_date, status),
    INDEX idx_phone (phone_number),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devotee_profiles (
    phone_number VARCHAR(20) PRIMARY KEY,
    patient_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT '',
    photo_url VARCHAR(500) DEFAULT '',
    face_vector_b64 MEDIUMTEXT,
    total_darshans INT NOT NULL DEFAULT 1,
    last_darbar_date DATE,
    registered_by VARCHAR(50) DEFAULT 'APP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ashram_tracks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    track_key VARCHAR(100) NOT NULL UNIQUE,
    title_hindi VARCHAR(255) NOT NULL,
    title_english VARCHAR(255) DEFAULT '',
    subtitle_hindi VARCHAR(255) DEFAULT '',
    duration_text VARCHAR(50) DEFAULT '',
    audio_url VARCHAR(500) NOT NULL,
    lyrics_hindi TEXT,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 0,
    youtube_search_query VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_track_published (is_published),
    INDEX idx_track_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;