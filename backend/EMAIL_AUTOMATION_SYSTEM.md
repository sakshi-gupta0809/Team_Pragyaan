# Neutrino Sales Email Automation System

## Overview

The Neutrino Sales Email Automation System is an intelligent, LLM-powered solution designed to automate personalized, multi-step email outreach campaigns. The system supports various campaign types, categorizes contacts by role, generates category-based templates, and ensures business-day & holiday-aware scheduling.

## Core Components

### 1. Campaign Workflow

The `CampaignWorkflow` class in `campaign_workflow.py` orchestrates the end-to-end process:

1. Campaign Creation
2. Contact Processing and Categorization
3. Template Generation
4. Email Personalization
5. Scheduling
6. CSV Export

### 2. Contact Categorization

The `contact_categorization.py` module:

- Automatically categorizes contacts based on their designation
- Supports categories: Clinical/Pharmacy, IT/Technology, R&D/Data, Operations, Sales/Partnerships, Executive, Other
- Uses rule-based pattern matching with keyword dictionaries
- Can be extended with LLM-based categorization for complex cases

### 3. Template Generation

The `template_generation.py` module:

- Infers campaign scenarios from descriptions using LLM
- Generates category-specific email templates
- Supports multiple campaign types: cold outreach, conference follow-up, etc.
- Uses reference samples and company information for context
- Creates multiple templates for initial emails and follow-ups

### 4. Business-Day Aware Scheduling

The `scheduler.py` module:

- Handles weekend and holiday awareness
- Supports configurable follow-up gaps in business days
- Includes US federal holiday detection
- Provides API endpoints for scheduling operations

### 5. Database Schema

Enhanced database models in `models.py`:

- Campaign: Stores campaign information, scenario, and metrics
- Contact: Includes designation, company, industry, and category
- EmailTemplate: Category-specific templates for each campaign
- EmailLog: Tracks emails with personalization and analytics
- Schedule: Manages send times with holiday awareness
- FollowUp: Configures follow-up parameters

## API Endpoints

### Campaign Workflow API

- `POST /api/workflow/campaigns/create`: Create a new campaign
- `POST /api/workflow/campaigns/{campaign_id}/upload-contacts`: Upload contacts file
- `POST /api/workflow/campaigns/{campaign_id}/generate-templates`: Generate email templates
- `POST /api/workflow/campaigns/{campaign_id}/personalize`: Personalize emails
- `POST /api/workflow/campaigns/{campaign_id}/schedule`: Schedule campaign
- `GET /api/workflow/campaigns/{campaign_id}/export`: Export to CSV
- `POST /api/workflow/campaigns/run-workflow`: Run full workflow

### Category Management API

- `GET /api/workflow/categories`: Get all categories
- `POST /api/workflow/categorize-designation`: Categorize a designation

### Template Management API

- `GET /api/workflow/scenarios`: Get all scenarios
- `POST /api/workflow/infer-scenario`: Infer scenario from description
- `GET /api/workflow/templates/preview`: Preview email template

## Configuration

Settings in `config.py`:

- API keys for LLM integration
- Email sender settings
- Follow-up configuration
- Business hours definition
- US holidays handling
- Directory paths for resources

## File Structure

```
backend/
├── app/
│   ├── api_campaigns.py      # Campaign CRUD operations
│   ├── api_contacts.py       # Contact management
│   ├── api_workflow.py       # Workflow API endpoints
│   ├── campaign_workflow.py  # End-to-end workflow
│   ├── config.py             # Configuration settings
│   ├── contact_categorization.py  # Contact categorization
│   ├── database.py           # Database connection
│   ├── email_service.py      # Email handling
│   ├── logging_utils.py      # Logging configuration
│   ├── models.py             # Database models
│   ├── routes.py             # Basic routes
│   ├── scheduler.py          # Business-day scheduling
│   ├── schemas.py            # Pydantic schemas
│   ├── template_generation.py  # LLM template generation
│   └── tracking.py           # Email tracking
├── data/                     # Uploaded contact files
├── output/                   # Generated CSV exports
├── prompts/
│   └── email_prompt.md       # LLM email template
├── resources/
│   └── neutrino_summary.txt  # Company description
└── samples/
    ├── cold_outreach/        # Sample cold emails
    └── conference/           # Sample conference emails
```

## Workflow Example

1. Create a campaign with name, description, and start date
2. Upload contacts Excel file
3. System categorizes contacts by designation
4. System infers campaign scenario from description
5. Templates are generated for each contact category
6. Emails are personalized for each contact
7. Sending is scheduled with business-day awareness
8. Export personalized emails to CSV or send directly

## LLM Integration

The system uses OpenAI's GPT models for:

1. Scenario inference from campaign descriptions
2. Category-specific template generation
3. Email personalization based on contact information

Templates include placeholder variables that are replaced with contact-specific information during personalization.

## Business Day Handling

The scheduling system:

- Skips weekends automatically
- Detects US federal holidays
- Schedules follow-ups with configurable gaps in business days
- Supports time zone configuration

## Future Enhancements

1. A/B testing of email templates
2. ML-based optimal send time prediction
3. Email sentiment analysis for responses
4. Custom scenario and category creation
5. Integrated email sending with tracking
6. Performance analytics dashboard