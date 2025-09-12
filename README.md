# Neutrino Sales Email Automation Dashboard

A modern, clean, and intuitive dashboard for Neutrino's sales email automation workflow.

## Features

The UI includes the following screens & components:

### 1. Campaign Creation Form
- Campaign Name (text input)
- Campaign Description (multi-line text area)
- Campaign Start Date (date picker)
- Upload Leads File (Excel/CSV upload)
- Submit button (triggers backend workflow)

### 2. Contact Categorization Preview
- Table of uploaded contacts
- Columns: Name, Email, Designation, Category (auto-detected)
- Highlights the auto-categorization by designation → role-based groups (Operations, Clinical, IT, R&D, Sales, Executive, Other)

### 3. Template Mapping View
- Shows one generated email template per category (from LLM)
- Allows salespeople to:
  - Preview category email templates
  - Edit subject & body if needed
  - Save templates

### 4. Scheduling & Calendar View
- Displays when emails will be sent based on start date
- Respects US business days & holidays
- Shows follow-up sequence (e.g., Day 0, Day 2, Day 5…)
- Calendar view or timeline component for clarity

### 5. Output & Download
- Shows summary of campaign (name, categories, # contacts, # emails scheduled)
- Provides a Download CSV button

## Tech Stack

- React
- Tailwind CSS
- Lucide React for icons

## Project Structure

```
frontend/
  ├── src/
  │   ├── components/
  │   │   └── neutrino/
  │   │       ├── CampaignCreationForm.jsx
  │   │       ├── ContactCategorization.jsx
  │   │       ├── TemplateMapping.jsx
  │   │       ├── SchedulingCalendar.jsx
  │   │       ├── CampaignOutput.jsx
  │   │       └── NeutrinoDashboard.jsx
  │   ├── App.jsx
  │   ├── main.jsx
  │   └── index.css
  └── tailwind.config.js
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser to the URL displayed in the terminal (typically http://localhost:5173)

## Style Guide

- Clean, enterprise SaaS look
- Sidebar navigation: Campaigns, Contacts, Templates, Scheduler, Reports
- Cards & tables with rounded corners, soft shadows
- Green/blue primary accents (trust & growth)
- Mobile-responsive design