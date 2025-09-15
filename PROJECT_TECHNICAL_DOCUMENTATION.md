# Neutrino Sales Email Automation Platform - Technical Documentation

## 1. Project Overview

The Neutrino Sales Email Automation Platform is a comprehensive solution designed to streamline and enhance email marketing campaigns through AI-powered personalization. This platform enables sales teams to create targeted campaigns, automatically categorize contacts, generate personalized email templates, schedule communications, and track engagement metrics.

## 2. System Architecture

```
Frontend (React + Tailwind + Lucide)
    |
    v
Backend (FastAPI + SQLAlchemy)
    - REST APIs (campaigns, contacts, templates, emails, schedules)
    - AI integration services
    - Logging + CORS + Health Checks
    |
    v
Database (PostgreSQL/MySQL/SQLite via SQLAlchemy)
    - Users
    - Campaigns
    - Contacts
    - Templates
    - EmailLogs
    - Schedules
    - FollowUps
    |
    v
Email Service (SMTP: Gmail/Server)
    - Sends emails
    - Tracking pixels
    - Unsubscribe links
    |
    v
Recipients
    - Opens → tracked
    - Unsubscribe → tracked
```

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.1.1 | Core UI framework |
| Tailwind CSS | ^4.1.13 | Utility-first CSS framework for styling |
| Vite | ^7.1.2 | Build tool and development server |
| Lucide React | ^0.543.0 | Icon library for clean, consistent UI elements |
| Framer Motion | ^11.3.30 | Animation library for smooth UI transitions |
| date-fns | ^4.1.0 | Date utility library for date/time manipulation |
| react-day-picker | ^9.9.0 | Date picker component for scheduling |

### 3.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | >=0.108.0 | High-performance API framework with automatic docs |
| SQLAlchemy | >=2.0.0 | SQL toolkit and ORM for database interactions |
| Pydantic | >=2.5.0 | Data validation and settings management |
| Alembic | >=1.12.0 | Database migration tool |
| APScheduler | >=3.9.1 | Advanced Python scheduler for email timing |
| OpenAI | >=1.0.0 | AI integration for personalization features |
| Pandas | >=2.0.0 | Data manipulation library for contacts processing |
| openpyxl | >=3.1.0 | Excel file handling for contact imports |
| Holidays | >=0.31.0 | Library to handle business days & holidays |
| Python-JOSE | >=3.3.0 | JSON Web Token handling for authentication |
| Passlib | >=1.7.4 | Password hashing library for security |
| Authlib | >=1.3.1 | Authentication library |

### 3.3 Database

The system is designed with SQLAlchemy to be database-agnostic, supporting:
- PostgreSQL (primary choice with psycopg2-binary & asyncpg)
- MySQL
- SQLite (for development/testing)

### 3.4 Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization for consistent deployment |
| Docker Compose | Multi-container orchestration |

## 4. Core Features

### 4.1 Campaign Management
- Campaign creation with name, description, and start date
- Campaign overview dashboard with analytics
- Campaign export functionality

### 4.2 Contact Management
- Contact import from Excel/CSV files
- Automatic contact categorization based on job role
- Contact organization within campaigns
- Unsubscribe handling

### 4.3 Email Personalization
- AI-powered template generation based on campaign scenario
- Role-based template variations (Operations, Clinical, IT, etc.)
- Personalized snippets for each contact
- LinkedIn data integration

### 4.4 Scheduling & Delivery
- Intelligent email scheduling respecting business hours
- Follow-up sequence automation
- Calendar view for scheduling visualization
- US business days & holidays recognition

### 4.5 Tracking & Analytics
- Open tracking via pixel
- Click tracking for links
- Unsubscribe tracking
- Campaign performance metrics
- Visual analytics dashboard

## 5. Key Components

### 5.1 Frontend Components

The frontend is organized into modular components including:
- Dashboard.jsx: Main application interface
- CampaignsInterface.jsx: Campaign management
- ContactsPage.jsx: Contact management
- NeutrinoCampaignWorkflow.jsx: Campaign creation workflow
- Various UI components for calendars, modals, and statistics

### 5.2 Backend Modules

#### API Endpoints
- `/campaigns/`: Campaign CRUD operations
- `/contacts/`: Contact management
- `/workflow/`: Campaign workflow execution
- `/templates/`: Email template management
- `/emails/`: Email generation and sending
- `/track/`: Tracking for opens and clicks
- `/analytics/`: Performance metrics

#### Core Services
- EmailGenerator: Generates personalized emails using OpenAI
- CampaignWorkflow: Orchestrates the campaign creation process
- ContactCategorization: Classifies contacts based on role
- TemplateGenerator: Creates email templates for different scenarios
- EmailScheduler: Handles timing and delivery
- TrackingService: Manages open/click tracking

### 5.3 Database Models

- User: Stores user information
- Campaign: Campaign metadata and configuration
- Contact: Lead information including categorization
- EmailTemplate: Templates for different categories
- EmailLog: Tracking of sent emails and engagement
- Schedule: Email timing information
- FollowUp: Automated follow-up configuration

## 6. Implementation Status

### 6.1 Fully Implemented Features
- Campaign creation and management
- Contact management
- Email tracking for opens
- Unsubscribe handling
- Backend API structure
- Database schema

### 6.2 Partially Implemented Features
- Contact import (UI exists, backend needs real implementation)
- Analytics dashboard (shows mock data)
- Email scheduling (framework ready, needs integration)
- AI service placeholders (stubs exist but no real AI integration)

### 6.3 Missing Components
- Full AI personalization flow
- Template editor UI
- Snippet approval workflow
- Background email tasks
- Click tracking implementation
- Bounce handling logic

## 7. AI Integration

The platform uses OpenAI to enhance email marketing through:

### 7.1 Current Implementation
- EmailGenerator class with OpenAI integration
- Fallback mechanisms when AI is unavailable
- Structure for storing AI-generated content

### 7.2 Planned AI Features
- Personalized snippet generation based on LinkedIn profiles
- Optimal send time prediction
- Engagement scoring and prediction
- Compliance checking for email content
- A/B testing optimization

## 8. Development Workflow

### 8.1 Local Development
```
# Frontend
npm run dev  # Starts Vite development server

# Backend
uvicorn app.main:app --reload  # Starts FastAPI server with hot reload
```

### 8.2 Database Migrations
```
# Create migration
python create_migration.py "migration message"

# Apply migrations
alembic upgrade head
```

### 8.3 Docker Deployment
```
docker-compose up -d
```

## 9. Next Steps

According to the project documentation, these are the prioritized next steps:

1. **Complete the Backend**
   - Implement background tasks for email sending
   - Build real AI integration with OpenAI
   - Develop analytics API endpoints
   - Finish scheduler integration

2. **Enhance the Frontend**
   - Develop template editor
   - Create personalization approval UI
   - Implement email preview functionality

3. **Optimize Email Delivery**
   - Add bounce detection and handling
   - Complete click tracking with redirects
   - Build bulk sending capabilities

4. **Finalize AI Integration**
   - Implement snippet generation workflow
   - Create storage for AI-generated content
   - Build approval/editing interface

## 10. Technical Design Decisions

### 10.1 Hybrid AI Approach
The system uses a hybrid approach for AI personalization:
- Generate base templates (1-2 per campaign)
- Use AI to create personalized snippets for each contact
- Combine templates with personalization in final emails
- This approach minimizes API costs while maximizing personalization

### 10.2 Backend Error Handling
The backend implements comprehensive error handling:
- Try/except blocks with detailed logging
- Fallback mechanisms for when services are unavailable
- Frontend gracefully handles backend failures with mock data

### 10.3 Scalability Considerations
- Database-agnostic design allows for scaling up as needed
- Containerized deployment simplifies horizontal scaling
- Background processing for email sending (planned)
- Rate limiting for email delivery

## 11. Security Considerations

- JWT-based authentication
- Password hashing with bcrypt
- Environment variable management for secrets
- Database connection pooling
- Input validation with Pydantic
- CORS protection