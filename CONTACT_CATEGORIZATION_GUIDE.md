# Contact Categorization Guide

This document explains how contacts are categorized based on their job titles in the Scalable Email Platform system.

## Categories

The system categorizes contacts into the following groups:

| Category ID | Display Name | Description |
|-------------|--------------|-------------|
| clinical | Clinical / Pharmacy | Healthcare professionals and clinical roles |
| it | IT / Technology | Technology and technical roles |
| rd | R&D / Data | Research, data science, and analytics roles |
| operations | Operations | Operational and administrative roles |
| sales | Sales / Partnerships | Sales, marketing, and business development |
| executive | Executive | Executive leadership and senior management |
| other | Other | Roles that don't fit into the above categories |

## How Categorization Works

The system uses a sophisticated pattern matching algorithm to categorize job titles:

1. First, it looks for specific functional roles (e.g., "Director of Pharmacy" matches clinical before matching executive)
2. Next, it checks for general role keywords (e.g., "Operations" or "Marketing")
3. If no specific match is found, it uses weighted keyword matching to find the best category
4. If no meaningful matches are found, it falls back to the "Other" category

## Example Categorizations

### Clinical / Pharmacy
- Pharmacist
- Clinical Director
- Director of Pharmacy
- Chief Medical Officer
- Physician
- Nurse Practitioner
- Medical Director
- Healthcare Specialist
- Clinical Operations Manager

### IT / Technology
- IT Manager
- Software Engineer
- Systems Architect
- Database Administrator
- Network Administrator
- DevOps Engineer
- IT Support Specialist
- Web Developer
- Security Analyst

### R&D / Data
- Research Scientist
- Data Scientist
- Machine Learning Engineer
- Research Analyst
- Data Analyst
- Analytics Specialist
- Innovation Lead
- R&D Specialist

### Operations
- Operations Manager
- Supply Chain Director
- Logistics Coordinator
- Process Improvement Manager
- Operations Specialist
- Admin Manager
- Facilities Manager
- Quality Assurance Manager

### Sales / Partnerships
- Sales Director
- Account Manager
- Business Development Executive
- Marketing Manager
- Strategic Advisor
- Sales Representative
- Marketing Specialist
- Partnership Manager

### Executive
- Chief Executive Officer
- Chief Financial Officer
- Chief Technology Officer
- President
- Vice President
- Founder
- Executive Director
- Board Member

### Other
- Project Manager
- Consultant
- Coordinator
- Assistant
- Specialist (without clear functional area)

## Legacy Categories

Some older data may use "management" as a category ID. The system automatically converts this to "executive" for compatibility.

## Customizing Categorization

If you need to adjust how certain job titles are categorized, you can modify the keyword mappings in `backend/app/contact_categorization.py`.