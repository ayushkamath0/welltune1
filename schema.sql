-- WellTune Database Schema
-- Run this file to initialize the MySQL database

CREATE DATABASE IF NOT EXISTS welltune CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE welltune;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  avatar_url  VARCHAR(255) DEFAULT NULL,
  bio         TEXT         DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding survey answers (one row per user)
CREATE TABLE IF NOT EXISTS surveys (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE,
  goal            ENUM('stress_relief','strength','flexibility','mindfulness','energy','sleep') NOT NULL,
  experience      ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  days_per_week   TINYINT UNSIGNED NOT NULL DEFAULT 3,
  completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Playlists / Routines
CREATE TABLE IF NOT EXISTS playlists (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  title       VARCHAR(120) NOT NULL,
  description TEXT         DEFAULT NULL,
  category    ENUM('stress_relief','strength','flexibility','mindfulness','energy','sleep') NOT NULL,
  is_public   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Steps / exercises inside a playlist
CREATE TABLE IF NOT EXISTS steps (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id  INT          NOT NULL,
  position     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  title        VARCHAR(120) NOT NULL,
  duration_sec SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  instruction  TEXT         DEFAULT NULL,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Mood log produced after completing a routine
CREATE TABLE IF NOT EXISTS mood_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT  NOT NULL,
  playlist_id INT  NOT NULL,
  mood        ENUM('amazing','good','okay','tired','stressed') NOT NULL,
  note        TEXT DEFAULT NULL,
  logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Social: follows
CREATE TABLE IF NOT EXISTS follows (
  follower_id INT NOT NULL,
  followee_id INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments on playlists
CREATE TABLE IF NOT EXISTS comments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id INT  NOT NULL,
  user_id     INT  NOT NULL,
  body        TEXT NOT NULL,
  flagged     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlist_likes (
  playlist_id INT NOT NULL,
  user_id     INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (playlist_id, user_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Seed a demo user (password: demo1234)
INSERT IGNORE INTO users (username, email, password) VALUES
  ('demo', 'demo@welltune.app', '$2b$10$X5oWMBfjf2f3LN3bCsjW2.7ywkVxLTXMU.h3jXkLjzR/kV1WIcZuG');
