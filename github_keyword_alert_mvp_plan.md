# GitHub Realtime Keyword Alert System – MVP Plan (8 Weeks)

## Project Goal
Build a working MVP of a web application that monitors GitHub repositories for specific keywords and notifies subscribed users in real time.

The MVP will demonstrate:
- GitHub API integration
- Event polling and filtering
- Real-time notification via WebSocket
- Basic subscription management

Advanced features such as Redis queues, scaling, and email alerts will be postponed for future iterations.

---

# System Scope for MVP

The MVP will support:

- Subscribe to a GitHub repository
- Define one keyword per subscription
- Poll GitHub Issues API periodically
- Detect keyword matches
- Store notifications
- Deliver real-time notifications via WebSocket

Out of scope for MVP:

- Email notifications
- Redis queues
- multi-server scaling
- GitHub webhooks

---

# MVP Architecture

Frontend (Next.js)

Communicates with backend through:

- REST API
- WebSocket

Backend (Node.js + Express)

Components:

- API server
- GitHub polling service
- event filtering logic
- notification dispatcher

Database:

- PostgreSQL

---

# 8 Week Development Plan

## Week 1 – Project Setup

Goals:

- Initialize GitHub repository
- Setup Next.js frontend
- Setup Node.js backend with Express
- Setup PostgreSQL database

Deliverables:

- Project structure
- Backend server running
- Frontend basic page

---

## Week 2 – GitHub API Integration

Goals:

- Fetch issues from GitHub API
- Parse issue titles and bodies
- Write small script to test keyword detection

Deliverables:

- Working GitHub API fetch
- Keyword detection prototype

---

## Week 3 – Database Schema

Goals:

Design database tables:

- users
- subscriptions
- notifications

Implement:

- create subscription API

Deliverables:

- ability to store subscriptions

---

## Week 4 – Polling Service

Goals:

Implement background polling job:

- poll GitHub every 30–60 seconds
- fetch new issues
- run keyword detection

Deliverables:

- event detection pipeline

---

## Week 5 – Notification System

Goals:

- create notifications in database
- store matched events

Deliverables:

- notifications stored in DB

---

## Week 6 – WebSocket Realtime Notifications

Goals:

- integrate Socket.io
- push notifications to browser

Deliverables:

- browser receives live alerts

---

## Week 7 – Frontend UI

Goals:

Build simple UI for:

- entering repo
- entering keyword
- viewing notifications

Deliverables:

- usable MVP interface

---

## Week 8 – Deployment and Documentation

Goals:

- deploy frontend and backend
- connect to cloud database
- write README

Deliverables:

- publicly accessible MVP
- documented architecture

---

# Post-MVP Improvements (Summer Iteration)

Possible next steps:

- Redis event queue
- email notifications
- GitHub webhook integration
- multiple keyword subscriptions
- monitoring GitHub comments
- performance improvements

---

# Final MVP Outcome

At the end of 8 weeks, the system should:

- allow users to subscribe to repo + keyword
- detect keyword mentions in GitHub issues
- create notifications
- deliver real-time alerts in browser

This MVP demonstrates a functional event-driven backend system suitable for a portfolio project.

---

# Recommended Repository Structure

A clean repository structure helps keep the project maintainable and also looks professional to recruiters.

Suggested layout:

```
github-keyword-alert/

  frontend/
    app/
    components/
    pages/
    hooks/

  backend/
    src/
      controllers/
      routes/
      services/
      polling/
      websocket/
      db/
      utils/

    server.ts

  database/
    schema.sql

  scripts/
    poll_github.ts

  README.md
```

Explanation of key folders:

frontend

```
Next.js application
subscription UI
notification UI
```

backend/src/controllers

```
handles HTTP request logic
```

backend/src/services

```
business logic
subscription management
notification creation
```

backend/src/polling

```
GitHub API polling service
keyword detection
```

backend/src/websocket

```
Socket.io connection management
realtime push notifications
```

backend/src/db

```
database connection
queries
```

---

# Database Schema (MVP)

Example PostgreSQL schema.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    repo TEXT NOT NULL,
    keyword TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    repo TEXT,
    content TEXT,
    issue_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

CREATE TABLE repo_state (
    repo TEXT PRIMARY KEY,
    last_issue_id BIGINT
);
```

Purpose of each table:

users

```
represents application users
```

subscriptions

```
stores repo + keyword monitoring rules
```

notifications

```
stores generated alerts
```

repo_state

```
tracks last processed GitHub event
prevents duplicate notifications
```

---

# Backend Skeleton (Week 1)

Basic Node.js + Express server structure.

server.ts

```ts
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.send("server running");
});

io.on("connection", (socket) => {
  console.log("client connected");
});

server.listen(3001, () => {
  console.log("backend running on port 3001");
});
```

---

# Example GitHub Polling Script

Simple polling logic for detecting keywords.

```ts
import fetch from "node-fetch";

async function pollGithub() {

  const response = await fetch(
    "https://api.github.com/repos/pytorch/pytorch/issues"
  );

  const issues = await response.json();

  for (const issue of issues) {

    const text = issue.title + " " + issue.body;

    if (text.toLowerCase().includes("redis")) {

      console.log("Keyword detected:", issue.title);

    }
  }
}

setInterval(pollGithub, 30000);
```

This script will later be integrated into the event processing pipeline.

---

# Week 1 Implementation Checklist

Concrete tasks to complete in the first week.

1. Create GitHub repository

2. Initialize project

```
npm init
npm install express socket.io
npm install typescript ts-node
```

3. Setup folder structure

4. Run backend server

```
npx ts-node server.ts
```

5. Create simple Next.js frontend

```
npx create-next-app
```

6. Create health check endpoint

```
GET /health
```

7. Test WebSocket connection

When Week 1 is finished you should have:

```
running frontend
running backend
working websocket connection
```

From that point forward you can start building the real system features.

---

# System Architecture (Production‑Style Reference)

The following diagram represents a more realistic architecture that the project can evolve into after the MVP stage. It separates ingestion, processing, and delivery layers.

```
                          +---------------------+
                          |     GitHub API      |
                          |   REST / GraphQL    |
                          +----------+----------+
                                     |
                                     | Polling
                                     v
                         +-----------------------+
                         |    Ingestion Worker   |
                         |  Fetch GitHub events  |
                         +----------+------------+
                                    |
                                    | create events
                                    v
                          +----------------------+
                          |      Redis Queue     |
                          |   Event Buffering    |
                          +----------+-----------+
                                     |
                                     | process events
                                     v
                         +------------------------+
                         |   Notification Worker  |
                         | keyword + subscription |
                         | matching logic         |
                         +-----------+------------+
                                     |
                                     | store results
                                     v
                              +-------------+
                              | PostgreSQL  |
                              | subscriptions|
                              | notifications|
                              +------+------+
                                     |
                                     | realtime push
                                     v
                         +-------------------------+
                         |   WebSocket Gateway     |
                         |       (Socket.io)       |
                         +-----------+-------------+
                                     |
                                     v
                         +--------------------------+
                         |        Frontend          |
                         |        (Next.js)         |
                         +--------------------------+
```

In the MVP version the Redis queue and worker separation are optional. The backend server can directly perform polling, processing, and notification logic. These components are separated mainly to illustrate how the system could scale.

---

# Technology Stack Responsibilities

Each technology in the stack serves a specific role in the architecture.

Node.js

```
Runtime that executes the backend JavaScript / TypeScript code.
Handles asynchronous I/O such as API calls and WebSocket connections.
```

Express

```
HTTP server framework that exposes REST APIs.
Handles endpoints such as subscription creation or fetching notifications.
```

PostgreSQL

```
Primary persistent database.
Stores subscriptions, users, and generated notifications.
```

GitHub API

```
External data source providing repository activity.
Issues and comments are available through REST API.
Discussions are primarily accessed through GraphQL API.
```

Polling Worker

```
Background job that periodically queries the GitHub API
(e.g., every 30 seconds) to fetch new issues or discussions.
```

Redis Queue (future upgrade)

```
Message queue used to buffer events.
Allows ingestion and notification processing to run independently.
Prevents bursts of GitHub events from overwhelming the server.
```

Socket.io / WebSocket

```
Maintains persistent connections between server and browser.
Allows the backend to push notifications to users in real time.
```

Next.js

```
Frontend framework used to build the web interface.
Provides pages where users configure subscriptions and view alerts.
```

---

# GitHub API Strategy

The project will initially rely on the GitHub REST API.

REST endpoints used in the MVP:

```
GET /repos/{owner}/{repo}/issues
GET /repos/{owner}/{repo}/issues/{issue_number}/comments
```

These endpoints provide enough data to monitor most repository activity.

---

# GraphQL Integration (Future Enhancement)

GitHub Discussions are primarily available through the GraphQL API. Adding discussion monitoring only affects the ingestion layer and does not change the rest of the architecture.

Example GraphQL query:

```graphql
query {
  repository(owner: "owner", name: "repo") {
    discussions(first: 10) {
      nodes {
        title
        body
      }
    }
  }
}
```

When discussions support is added, the polling module may include:

```
polling/
  githubRestClient.ts
  githubGraphqlClient.ts
  pollIssues.ts
  pollDiscussions.ts
```

The remainder of the pipeline (event processing, notification creation, WebSocket delivery) remains unchanged.

---

# Event Processing Pipeline

The full event lifecycle within the system is:

```
GitHub API
  ↓
Polling Worker
  ↓
Event Processor (keyword matching)
  ↓
Notification Service
  ↓
Database storage
  ↓
Realtime push via WebSocket
  ↓
Frontend notification display
```

This structure follows a common event‑driven backend pattern used in many production systems.


