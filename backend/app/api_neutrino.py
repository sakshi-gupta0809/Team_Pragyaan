"""
API routes for the Neutrino workflow functionality.
These endpoints match what the frontend neutrino components are expecting.
"""
import logging
import os
import csv
import pandas as pd
import re
import json
from json import JSONDecodeError
from pathlib import Path as PathLib
from json import JSONDecodeError
from typing import Dict, Any, List
from .email_generator import EmailGenerator
from .template_generation import TemplateGenerator
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Path, File, UploadFile, Form, Body
from fastapi.responses import Response, JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from .models import Campaign, Contact, EmailLog, Schedule, EmailTemplate
from .schemas import CampaignCreate
from .contact_categorization import categorize_designation

from .database import get_db

# Initialize template generator
template_generator = TemplateGenerator()

# Define paths for data and output
DATA_DIR = PathLib(__file__).parent.parent / "data"
os.makedirs(DATA_DIR, exist_ok=True)

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["neutrino"],
    responses={404: {"description": "Not found"}},
)

# -------------------- Campaign Creation API --------------------
@router.post("/campaigns/")
async def create_campaign(
    name: str = Form(...),
    description: str = Form(""),
    start_date: str = Form(...),
    leads_file: UploadFile = File(...),
    scenario: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Create a new campaign with uploaded leads file.
    This endpoint is designed to handle FormData from the frontend.
    """
    try:
        logger.info(f"Creating campaign: {name}")
        
        # Normalize scenario; prefer explicit form value if provided
        scenario_normalized = (scenario or "").strip().lower() if scenario else None
        if scenario_normalized and ("conference" in scenario_normalized or "in person" in scenario_normalized or "in-person" in scenario_normalized):
            scenario_normalized = "conference"
        
        # Create campaign in database first to get the ID
        campaign = Campaign(
            name=name,
            description=description,
            start_date=start_date,
            status="draft",
            recipient_count=0,
            open_count=0,
            click_count=0,
            unsubscribe_count=0,
            created_at=datetime.now(),
            scenario=scenario_normalized or "cold_outreach"
        )
        
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        
        # Now save the file with campaign ID in the name for better organization
        file_extension = os.path.splitext(leads_file.filename)[1].lower()
        campaign_file_name = f"campaign_{campaign.id}_leads{file_extension}"
        # Use DATA_DIR for consistent path reference
        file_location = os.path.join(DATA_DIR, campaign_file_name)
        
        os.makedirs(os.path.dirname(file_location), exist_ok=True)
        
        # Read and save the file content
        file_content = await leads_file.read()
        with open(file_location, "wb") as file_object:
            file_object.write(file_content)
        
        logger.info(f"Saved leads file to {file_location}")
        
        # Parse the file to extract contacts
        contacts = []
        categories = {
            "clinical": {"id": "clinical", "name": "Clinical / Pharmacy", "description": "Clinical and pharmacy professionals", "count": 0},
            "it": {"id": "it", "name": "IT / Technology", "description": "Technical team members", "count": 0},
            "rd": {"id": "rd", "name": "R&D / Data", "description": "Research and data professionals", "count": 0},
            "operations": {"id": "operations", "name": "Operations", "description": "Operations and logistics", "count": 0},
            "sales": {"id": "sales", "name": "Sales / Partnerships", "description": "Sales and account management", "count": 0},
            "executive": {"id": "executive", "name": "Executive", "description": "Executives and managers", "count": 0},
            "other": {"id": "other", "name": "Other", "description": "Other departments", "count": 0}
        }
        
        try:
            # Process based on file type
            logger.info(f"Processing file with extension: {file_extension}")
            if file_extension == '.csv':
                df = pd.read_csv(file_location)
                logger.info(f"CSV file read with {len(df)} rows")
            elif file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(file_location)
                logger.info(f"Excel file read with {len(df)} rows")
            else:
                # Fallback to basic CSV parsing if pandas fails
                logger.info(f"Using fallback CSV parsing for file: {file_location}")
                with open(file_location, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    contacts_list = list(reader)
                    df = pd.DataFrame(contacts_list)
                    logger.info(f"Fallback parsing found {len(df)} rows")
            
            # Make column names lowercase for easier access
            df.columns = [col.lower() for col in df.columns]
            
            # Extract and process contacts
            logger.info(f"Starting to extract contacts from {len(df)} rows with columns: {list(df.columns)}")
            contact_id = 1
            contacts_extracted = 0
            contacts_skipped = 0
            for _, row in df.iterrows():
                # Try to extract name, email, and job title from various possible column names
                name = None
                # Check if first and name columns exist separately (common in exported data)
                if 'first' in df.columns and 'name' in df.columns and pd.notna(row['first']) and pd.notna(row['name']):
                    name = f"{row['first']} {row['name']}".strip()
                else:
                    for col in ['name', 'full name', 'contact name', 'person name']:
                        if col in df.columns and pd.notna(row[col]):
                            name = row[col]
                            break
                
                email = None
                for col in ['email', 'email address', 'contact email']:
                    if col in df.columns and pd.notna(row[col]):
                        email = row[col]
                        break
                
                job_title = None
                for col in ['job title', 'title', 'designation', 'position', 'role']:
                    if col in df.columns and pd.notna(row[col]):
                        job_title = row[col]
                        break
                
                company = None
                for col in ['company', 'organization', 'company name', 'company name']:
                    if col in df.columns and pd.notna(row[col]):
                        company = row[col]
                        break
                
                # If no email but we have a name, generate a realistic business email
                if not email and name:
                    # Try using OpenAI first (with fallback)
                    try:
                        # Create a single static instance of EmailGenerator at the module level
                        # to avoid recreating it for each contact
                        openai_api_key = os.environ.get("OPENAI_API_KEY")
                        logger.info(f"OpenAI API key found in environment: {bool(openai_api_key)}")
                        
                        # Initialize the email generator (will use fallback if no API key)
                        email_generator = EmailGenerator(openai_api_key)
                        
                        # Generate a business email based on name, job title, and company
                        email = email_generator.generate_business_email(name, job_title, company)
                        logger.info(f"Generated email for {name}: {email}")
                    except Exception as e:
                        # Log detailed error and use fallback
                        logger.error(f"Error generating email with AI: {str(e)}")
                        # Fallback to simple pattern
                        name_parts = name.split()
                        if len(name_parts) > 1:
                            first_name = name_parts[0].lower()
                            last_name = name_parts[-1].lower()
                            clean_name = f"{first_name}.{last_name}"
                        else:
                            clean_name = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
                        
                        if company:
                            clean_company = re.sub(r'[^a-zA-Z0-9]', '', company.lower().replace(' ', ''))
                            email = f"{clean_name}@{clean_company}.com"
                        else:
                            email = f"{clean_name}@example.com"
                        logger.warning(f"Created fallback email for {name}: {email}")
                # Skip if still no valid email
                if not email or not isinstance(email, str) or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                    logger.warning(f"Skipping contact with invalid or missing email: {name}")
                    contacts_skipped += 1
                    continue
                
                contacts_extracted += 1
                
                # Use the job title to categorize the contact
                category = "other"
                if job_title:
                    # Use the contact_categorization module to categorize based on job title
                    # The module now returns category ID directly
                    category = categorize_designation(job_title)
                    
                    # Log the categorization for debugging
                    logger.info(f"Categorized job title '{job_title}' as '{category}'")
                
                # Track category counts
                if category in categories:
                    categories[category]["count"] += 1
                else:
                    categories["other"]["count"] += 1
                    category = "other"
                
                # Collect all extra data from the Excel columns
                extra_data = {}
                for col_name in df.columns:
                    # Skip the standard fields we already handle
                    if col_name not in ['name', 'email', 'job title', 'title', 'designation', 'position', 'role',
                                        'company', 'organization', 'company name', 'full name', 'contact name',
                                        'person name', 'email address', 'contact email', 'first', 'last']:
                        if pd.notna(row[col_name]):
                            # Store the value with the original column name
                            extra_data[col_name] = str(row[col_name])
                
                # Add to contacts list
                contacts.append({
                    "id": contact_id,
                    "name": name or "Unknown",
                    "email": email,
                    "job_title": job_title or "Unknown",
                    "company": company or "Unknown",
                    "category": category,
                    "extra_data": extra_data
                })
                contact_id += 1
                
            # Update campaign with recipient count
            campaign.recipient_count = len(contacts)
            db.commit()
            
            logger.info(f"Processed {len(df)} rows: extracted {contacts_extracted} contacts, skipped {contacts_skipped} invalid entries")
            
            # Check if no contacts were extracted
            if len(contacts) == 0:
                logger.warning(f"No valid contacts were extracted from the file. Please check the file format and contents.")
            
        except Exception as e:
            logger.error(f"Error parsing file: {str(e)}")
            # Fallback to mock data if file parsing fails
            contacts = [
                {"id": 1, "name": "John Doe", "email": "john@example.com", "job_title": "Sales Manager", "company": "Acme Inc", "category": "sales"},
                {"id": 2, "name": "Jane Smith", "email": "jane@example.com", "job_title": "Operations Director", "company": "Acme Inc", "category": "operations"},
                {"id": 3, "name": "Alex Brown", "email": "alex@example.com", "job_title": "IT Specialist", "company": "Acme Inc", "category": "it"}
            ]
            
            # Add a note about the error
            logger.warning("Using mock data due to file parsing error")
            
            # Save mock contacts to database as well
            try:
                # Clear existing contacts for this campaign if any
                db.query(Contact).filter(Contact.campaign_id == campaign.id).delete()
                db.commit()
                
                # Create database records for each mock contact individually
                contacts_saved = 0
                contacts_failed = 0
                
                # Track emails we've already processed in this batch to avoid duplicates
                processed_emails = set()
                
                for contact_data in contacts:
                    try:
                        email = contact_data["email"]
                        
                        # Skip if we've already processed this email in the current batch
                        if email in processed_emails:
                            logger.warning(f"Skipping duplicate mock email within batch: {email}")
                            continue
                        
                        # Add to processed emails set
                        processed_emails.add(email)
                        
                        # Start a new transaction for each contact
                        try:
                            # Check if contact with this email already exists
                            existing_contact = db.query(Contact).filter(Contact.email == email).first()
                            
                            if existing_contact and existing_contact.campaign_id != campaign.id:
                                # Update existing contact with new campaign_id if it belongs to a different campaign
                                existing_contact.campaign_id = campaign.id
                                existing_contact.name = contact_data["name"]
                                existing_contact.designation = contact_data.get("job_title", "Unknown")
                                existing_contact.company = contact_data.get("company", "Unknown")
                                existing_contact.category = contact_data.get("category", "other")
                                existing_contact.status = "active"
                                existing_contact.last_contacted = datetime.now()
                                contacts_saved += 1
                                logger.info(f"Updated existing contact with email {email} for mock data in campaign {campaign.id}")
                            elif not existing_contact:
                                # Create new contact if email doesn't exist
                                db_contact = Contact(
                                    name=contact_data["name"],
                                    email=email,
                                    designation=contact_data.get("job_title", "Unknown"),
                                    company=contact_data.get("company", "Unknown"),
                                    category=contact_data.get("category", "other"),
                                    campaign_id=campaign.id,
                                    unsubscribed=False,
                                    status="active",
                                    last_contacted=datetime.now()
                                )
                                db.add(db_contact)
                                contacts_saved += 1
                                
                            # Commit each contact individually
                            db.commit()
                            logger.debug(f"Successfully saved mock contact with email {email}")
                            
                        except Exception as tx_error:
                            # Rollback the transaction for this contact
                            db.rollback()
                            logger.error(f"Error saving mock contact {contact_data.get('name')} ({email}): {str(tx_error)}")
                            contacts_failed += 1
                            continue
                            
                    except Exception as contact_error:
                        logger.error(f"Error processing mock contact {contact_data.get('name')} ({contact_data.get('email')}): {str(contact_error)}")
                        contacts_failed += 1
                        continue
                
                logger.info(f"Saved {contacts_saved} mock contacts to database for campaign {campaign.id}, failed to save {contacts_failed}")
            except Exception as e:
                logger.error(f"Error saving mock contacts to database: {str(e)}")
                # Roll back in case of error
                db.rollback()
        
        # Filter out categories with zero contacts
        active_categories = [cat for cat in categories.values() if cat["count"] > 0]
        if not active_categories:
            active_categories = [
                {"id": "sales", "name": "Sales Team", "description": "Sales and account management", "count": 1},
                {"id": "operations", "name": "Operations", "description": "Operations and logistics", "count": 1},
                {"id": "it", "name": "IT Department", "description": "Technical team members", "count": 1}
            ]
        
        # Save the processed contacts to a JSON file for later use in the approval process
        contacts_file = os.path.join(DATA_DIR, f"campaign_{campaign.id}_contacts.json")
        try:
            with open(contacts_file, 'w') as f:
                json.dump({"contacts": contacts, "categories": active_categories}, f)
            logger.info(f"Saved {len(contacts)} contacts to {contacts_file}")
            
            # Save contacts to database
            try:
                # Clear existing contacts for this campaign if any
                db.query(Contact).filter(Contact.campaign_id == campaign.id).delete()
                db.commit()
                
                # Create database records for each contact individually
                contacts_saved = 0
                contacts_failed = 0
                
                # Track emails we've already processed in this batch to avoid duplicates
                processed_emails = set()
                
                for contact_data in contacts:
                    try:
                        email = contact_data["email"]
                        
                        # Skip if we've already processed this email in the current batch
                        if email in processed_emails:
                            logger.warning(f"Skipping duplicate email within batch: {email}")
                            continue
                        
                        # Add to processed emails set
                        processed_emails.add(email)
                        
                        # Start a new transaction for each contact
                        try:
                            # Check if contact with this email already exists
                            existing_contact = db.query(Contact).filter(Contact.email == email).first()
                            
                            if existing_contact and existing_contact.campaign_id != campaign.id:
                                # Update existing contact with new campaign_id if it belongs to a different campaign
                                existing_contact.campaign_id = campaign.id
                                existing_contact.name = contact_data["name"]
                                existing_contact.designation = contact_data.get("job_title", "Unknown")
                                existing_contact.company = contact_data.get("company", "Unknown")
                                existing_contact.category = contact_data.get("category", "other")
                                existing_contact.status = "active"
                                existing_contact.last_contacted = datetime.now()
                                
                                # Update extra_data field for existing contacts
                                if "extra_data" in contact_data and contact_data["extra_data"]:
                                    existing_contact.extra_data = contact_data["extra_data"]
                                    logger.info(f"Updated extra_data for contact {email} with {len(contact_data['extra_data'])} fields")
                                
                                contacts_saved += 1
                                logger.info(f"Updated existing contact with email {email} for campaign {campaign.id}")
                            elif not existing_contact:
                                # Create new contact if email doesn't exist
                                db_contact = Contact(
                                    name=contact_data["name"],
                                    email=email,
                                    designation=contact_data.get("job_title", "Unknown"),
                                    company=contact_data.get("company", "Unknown"),
                                    category=contact_data.get("category", "other"),
                                    campaign_id=campaign.id,
                                    unsubscribed=False,
                                    status="active",
                                    last_contacted=datetime.now(),
                                    extra_data=contact_data.get("extra_data", {})
                                )
                                db.add(db_contact)
                                contacts_saved += 1
                            
                            # Commit each contact individually
                            db.commit()
                            logger.debug(f"Successfully saved contact with email {email}")
                            
                        except Exception as tx_error:
                            # Rollback the transaction for this contact
                            db.rollback()
                            logger.error(f"Error saving contact {contact_data.get('name')} ({email}): {str(tx_error)}")
                            contacts_failed += 1
                            continue
                            
                    except Exception as contact_error:
                        logger.error(f"Error processing contact {contact_data.get('name')} ({contact_data.get('email')}): {str(contact_error)}")
                        contacts_failed += 1
                        continue
                
                logger.info(f"Saved {contacts_saved} contacts to database for campaign {campaign.id}, failed to save {contacts_failed}")
            except Exception as e:
                logger.error(f"Error saving contacts to database: {str(e)}")
                # Roll back in case of error
                db.rollback()
                
        except Exception as e:
            logger.error(f"Error saving contacts to file: {str(e)}")
        
        return {
            "id": campaign.id,
            "name": campaign.name,
            "description": campaign.description,
            "start_date": campaign.start_date,
            "file_path": file_location,
            "contacts": contacts,
            "categories": active_categories
        }
        
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating campaign: {str(e)}")

# -------------------- Campaign Categories API --------------------

# Ensure DATA_DIR exists
os.makedirs(DATA_DIR, exist_ok=True)

@router.post("/campaigns/{campaign_id}/categories/approve")
async def approve_categories(
    campaign_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """
    Approve categories for a campaign.
    This endpoint is called from the Neutrino workflow after contacts have been categorized.
    """
    try:
        # Retrieve campaign from database
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign with ID {campaign_id} not found")
        
        logger.info(f"Processing campaign {campaign_id} contacts before template view")
        
        # Try to load the saved contacts
        contacts_file = os.path.join(DATA_DIR, f"campaign_{campaign_id}_contacts.json")
        try:
            if os.path.exists(contacts_file):
                with open(contacts_file, 'r') as f:
                    try:
                        contacts_data = json.load(f)
                        contacts = contacts_data.get("contacts", [])
                        categories = contacts_data.get("categories", [])
                        logger.info(f"Loaded {len(contacts)} contacts from {contacts_file}")
                    except JSONDecodeError as je:
                        logger.error(f"Error parsing JSON from contacts file: {str(je)}")
                        raise
            else:
                # File not found, try to get contacts from database
                logger.warning(f"Contacts file not found: {contacts_file}. Trying to load from database.")
                
                # Query contacts from database for this campaign
                db_contacts = db.query(Contact).filter(Contact.campaign_id == campaign_id).all()
                
                if db_contacts:
                    # Contacts found in database, use them
                    contacts = []
                    category_counts = {"clinical": 0, "it": 0, "rd": 0, "operations": 0, "sales": 0, "executive": 0, "other": 0}
                    
                    for idx, db_contact in enumerate(db_contacts, 1):
                        # Handle conversion of legacy "management" category to "executive"
                        category = db_contact.category or "other"
                        if category == "management":
                            category = "executive"
                            # Update the contact record in the database
                            db_contact.category = "executive"
                            db.commit()
                            logger.info(f"Converted legacy 'management' category to 'executive' for contact: {db_contact.name}")
                        contacts.append({
                            "id": idx,
                            "name": db_contact.name,
                            "email": db_contact.email,
                            "job_title": db_contact.designation,
                            "company": db_contact.company,
                            "category": category
                        })
                        
                        if category in category_counts:
                            category_counts[category] += 1
                        else:
                            category_counts["other"] += 1
                    
                    # Create categories based on contact data
                    categories = []
                    for cat_id, count in category_counts.items():
                        if count > 0:
                            cat_name = {
                                "clinical": "Clinical / Pharmacy",
                                "it": "IT / Technology",
                                "rd": "R&D / Data",
                                "operations": "Operations",
                                "sales": "Sales / Partnerships",
                                "executive": "Executive",
                                "other": "Other"
                            }.get(cat_id, cat_id.capitalize())
                            
                            categories.append({
                                "id": cat_id,
                                "name": cat_name,
                                "description": f"{cat_name} contacts",
                                "count": count
                            })
                    
                    logger.info(f"Loaded {len(contacts)} contacts from database for campaign {campaign_id}")
                    
                    # Save to file for future use
                    try:
                        with open(contacts_file, 'w') as f:
                            json.dump({"contacts": contacts, "categories": categories}, f)
                        logger.info(f"Created contacts file from database data at {contacts_file}")
                    except Exception as e:
                        logger.error(f"Error saving contacts to file from database data: {str(e)}")
                
                else:
                    # No contacts in database either
                    logger.warning(f"No contacts found in database for campaign {campaign_id}")
                    return JSONResponse({
                        "success": False,
                        "campaign_id": campaign_id,
                        "message": "No contacts found. Please import contacts for this campaign first."
                    })
            
            # Check if file exists but has no contacts
            if contacts == []:
                logger.warning(f"No contacts found in file: {contacts_file}. Trying to load from database.")
                
                # Query contacts from database for this campaign
                db_contacts = db.query(Contact).filter(Contact.campaign_id == campaign_id).all()
                
                if db_contacts:
                    # Contacts found in database, use them
                    contacts = []
                    category_counts = {"clinical": 0, "it": 0, "rd": 0, "operations": 0, "sales": 0, "executive": 0, "other": 0}
                    
                    for idx, db_contact in enumerate(db_contacts, 1):
                        # Handle conversion of legacy "management" category to "executive"
                        category = db_contact.category or "other"
                        if category == "management":
                            category = "executive"
                            # Update the contact record in the database
                            db_contact.category = "executive"
                            db.commit()
                            logger.info(f"Converted legacy 'management' category to 'executive' for contact: {db_contact.name}")
                        contacts.append({
                            "id": idx,
                            "name": db_contact.name,
                            "email": db_contact.email,
                            "job_title": db_contact.designation,
                            "company": db_contact.company,
                            "category": category
                        })
                        
                        if category in category_counts:
                            category_counts[category] += 1
                        else:
                            category_counts["other"] += 1
                    
                    # Create categories based on contact data
                    categories = []
                    for cat_id, count in category_counts.items():
                        if count > 0:
                            cat_name = {
                                "clinical": "Clinical / Pharmacy",
                                "it": "IT / Technology",
                                "rd": "R&D / Data",
                                "operations": "Operations",
                                "sales": "Sales / Partnerships",
                                "executive": "Executive",
                                "other": "Other"
                            }.get(cat_id, cat_id.capitalize())
                            
                            categories.append({
                                "id": cat_id,
                                "name": cat_name,
                                "description": f"{cat_name} contacts",
                                "count": count
                            })
                    
                    logger.info(f"Loaded {len(contacts)} contacts from database for campaign {campaign_id}")
                    
                    # Update the file with data from database
                    try:
                        with open(contacts_file, 'w') as f:
                            json.dump({"contacts": contacts, "categories": categories}, f)
                        logger.info(f"Updated contacts file with database data at {contacts_file}")
                    except Exception as e:
                        logger.error(f"Error updating contacts file with database data: {str(e)}")
                    
                else:
                    # No contacts in database either
                    logger.warning(f"No contacts found in database for campaign {campaign_id}")
                    return JSONResponse({
                        "success": False,
                        "campaign_id": campaign_id,
                        "message": "No contacts found. Please import contacts for this campaign first."
                    })
        except Exception as e:
            logger.error(f"Error loading contacts file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error loading contacts for campaign {campaign_id}: {str(e)}")
        
        # Ensure all contacts have valid emails before template generation
        updated_contacts = []
        email_generator = EmailGenerator(os.environ.get("OPENAI_API_KEY", ""))
        
        for contact in contacts:
            # Check if email is missing or invalid
            email = contact.get("email", "")
            if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                name = contact.get("name", "")
                job_title = contact.get("job_title", "")
                company = contact.get("company", "")
                
                # Generate email if missing
                if name:
                    try:
                        email = email_generator.generate_business_email(name, job_title, company)
                        logger.info(f"Generated email for {name} before template view: {email}")
                        contact["email"] = email
                    except Exception as e:
                        logger.error(f"Error generating email: {str(e)}")
            
            updated_contacts.append(contact)
        # Save updated contacts back to file
        try:
            with open(contacts_file, 'w') as f:
                json.dump({"contacts": updated_contacts, "categories": categories}, f)
            logger.info(f"Saved {len(updated_contacts)} updated contacts to {contacts_file}")
        except Exception as e:
            logger.error(f"Error saving contacts file: {str(e)}")
        
        
        # Generate templates for each category using the LLM
        templates = []
        # Check if we have categories
        if not categories:
            logger.error("No categories found for campaign")
            raise HTTPException(status_code=400, detail=f"No categories found for campaign {campaign_id}")
        
        category_ids = [cat["id"] for cat in categories]
        
        # Create a template generator with the OpenAI API key
        template_generator = TemplateGenerator(os.environ.get("OPENAI_API_KEY"))
        
        # Map the UI category IDs to our internal category system
        category_mapping = {
            "clinical": "Clinical / Pharmacy",
            "it": "IT / Technology",
            "research": "R&D / Data",
            "rd": "R&D / Data",
            "operations": "Operations",
            "sales": "Sales / Partnerships",
            "executive": "Executive",
            "management": "Executive",  # Legacy mapping support
            "other": "Other"
        }
        
        # Default scenario if not specified
        scenario = campaign.scenario if hasattr(campaign, 'scenario') and campaign.scenario else "cold_outreach"
        
        logger.info(f"Generating LLM templates for each category using scenario: {scenario}")
        
        # Dictionary to store generated templates
        template_data = {}
        
        # Group contacts by category
        contacts_by_category = {}
        for contact in updated_contacts:
            cat = contact.get("category", "other")
            # Handle legacy "management" category
            if cat == "management":
                cat = "executive"
                # Update the contact data for template generation
                contact["category"] = "executive"
                logger.info(f"Converted legacy 'management' category to 'executive' for contact: {contact.get('name')}")
            
            if cat not in contacts_by_category:
                contacts_by_category[cat] = []
            contacts_by_category[cat].append(contact)
            
        # Generate templates for each active category using the LLM
        # Generate a unique campaign signature with detailed entropy
        campaign_timestamp = datetime.now()
        campaign_signature = f"{campaign_id}-{campaign_timestamp.strftime('%Y%m%d%H%M%S%f')}"
        
        # Define distinct writing styles for each category to force differentiation
        category_writing_styles = {
            "clinical": "empathetic, healthcare-focused, uses medical terminology and patient-outcome language",
            "it": "technical, precise, references specific technologies and integration benefits",
            "rd": "analytical, data-driven, emphasizes research findings and innovation",
            "operations": "practical, process-oriented, focuses on efficiency and workflow improvements",
            "sales": "enthusiastic, results-focused, uses concrete metrics and ROI language",
            "executive": "strategic, big-picture, emphasizes organizational impact and long-term vision",
            "other": "consultative, solution-oriented, addresses specific pain points"
        }
        
        # Define completely different email structures for each category
        category_email_structures = {
            "clinical": "Begin with healthcare insight, connect to patient outcomes, end with clinical application question",
            "it": "Lead with technical insight, explain integration benefits, conclude with detailed next-step proposal",
            "rd": "Start with research finding, discuss data implications, close with innovation opportunity",
            "operations": "Begin with specific operational challenge, present solution approach, end with implementation question",
            "sales": "Start with bold market trend, connect to specific opportunity, end with value-driven CTA",
            "executive": "Open with strategic observation, discuss competitive advantage, close with executive-level meeting request",
            "other": "Start with industry-specific question, provide tailored insights, end with personalized follow-up offer"
        }
        
        # Completely different communication tones for each category
        category_tones = {
            "clinical": "empathetic, evidence-based, patient-centered",
            "it": "precise, technical, solutions-focused",
            "rd": "analytical, data-driven, innovative",
            "operations": "structured, practical, efficiency-oriented",
            "sales": "confident, direct, enthusiastic",
            "executive": "strategic, authoritative, visionary",
            "other": "consultative, inquisitive, helpful"
        }
        
        # Use a different forced introduction pattern for each category
        category_intro_patterns = {
            "clinical": "Healthcare providers in the {{industry}} are increasingly focused on improving...",
            "it": "Technical teams in the {{industry}} sector are looking for innovative ways to...",
            "rd": "Recent research in {{industry}} suggests that organizations leveraging data analytics are...",
            "operations": "Many operational leaders at {{industry}} organizations are discovering new approaches to...",
            "sales": "Forward-thinking sales teams in the {{industry}} market are adopting strategies that...",
            "executive": "As leadership teams across {{industry}} evaluate strategic priorities, many are finding that...",
            "other": "Professionals like you in the {{industry}} field are addressing challenges related to..."
        }
        
        # Create completely different unique selling propositions for each category
        category_value_props = {
            "clinical": "improve patient outcomes and streamline clinical workflows with evidence-based solutions",
            "it": "eliminate integration gaps between critical systems while maintaining strict compliance standards",
            "rd": "accelerate research and data analysis with advanced analytics and machine learning capabilities",
            "operations": "streamline complex healthcare workflows and reduce operational overhead by up to 35%",
            "sales": "accelerate sales cycles and increase conversion rates through integrated healthcare solutions",
            "executive": "transform strategic initiatives into measurable outcomes with enterprise-wide visibility",
            "other": "address specific departmental challenges with customized healthcare technology solutions"
        }
        
        for cat_id in category_ids:
            # Map the UI category ID to our internal category system
            internal_category = category_mapping.get(cat_id, "Other")
            
            try:
                # Generate template using the LLM with increased differentiation
                logger.info(f"Generating completely unique template for category: {cat_id} (internal: {internal_category})")
                
                # Enhanced category-specific terms with much more variation
                category_specific_terms = {
                    "clinical": ["patient outcomes", "clinical workflows", "evidence-based practice", "medical protocols", "healthcare delivery"],
                    "it": ["system architecture", "technology integration", "data security protocol", "infrastructure modernization", "interoperability framework"],
                    "rd": ["research insights", "data analytics", "innovation pipeline", "scientific methodology", "discovery process"],
                    "operations": ["workflow optimization", "resource allocation", "operational excellence", "process standardization", "efficiency metrics"],
                    "sales": ["revenue acceleration", "client acquisition strategy", "partnership ecosystem", "sales enablement", "market penetration"],
                    "executive": ["strategic leadership", "organizational transformation", "executive decision framework", "change management", "business growth initiatives"],
                    "other": ["specialized expertise", "domain-specific solutions", "tailored implementation", "customized approach", "focused methodology"]
                }
                
                # Create a highly distinct seed for each category
                now = datetime.now()
                microsecond_salt = now.microsecond * (cat_id == "clinical" and 1.1 or cat_id == "it" and 2.2 or cat_id == "rd" and 3.3 or
                                                     cat_id == "operations" and 4.4 or cat_id == "sales" and 5.5 or cat_id == "executive" and 6.6 or 7.7)
                category_seed = f"{cat_id}-{campaign_id}-{now.strftime('%Y%m%d%H%M%S%f')}-{microsecond_salt}"
                
                # Get contacts for this category to personalize the template
                category_contacts = contacts_by_category.get(cat_id, [])
                
                # Extract detailed industry and company information for better personalization
                industries = list(set(c.get("company", "") for c in category_contacts if c.get("company")))
                job_titles = list(set(c.get("job_title", "") for c in category_contacts if c.get("job_title")))
                
                # Create a distinct template identifier
                template_identifier = f"{campaign_signature}-{cat_id}-{now.microsecond}"
                
                # Use the template generator with highly differentiated context
                # Prepare additional context
                additional_context = {
                    # Identification and entropy
                    "campaign_id": campaign_id,
                    "category_seed": category_seed,
                    "template_identifier": template_identifier,
                    "timestamp": now.isoformat(),
                    
                    # Category-specific style guides
                    "writing_style": category_writing_styles.get(cat_id, "balanced, professional"),
                    "email_structure": category_email_structures.get(cat_id, "problem-solution-action"),
                    "communication_tone": category_tones.get(cat_id, "professional, friendly"),
                    "intro_pattern": category_intro_patterns.get(cat_id, ""),
                    "value_proposition": category_value_props.get(cat_id, ""),
                    
                    # Content guidance
                    "focus_terms": category_specific_terms.get(cat_id, ["business improvement"]),
                    "contact_data": category_contacts[:5],  # Representative contacts
                    "common_industries": industries[:3],    # Top industries
                    "common_job_titles": job_titles[:5],    # Top job titles
                    "contact_count": len(category_contacts),
                    
                    # Force uniqueness by explicitly avoiding common patterns
                    "avoid_phrases": [
                        "optimize healthcare IT operations while maintaining compliance",
                        "I hope this email finds you well",
                        "streamline operations, improve compliance, and enhance patient engagement",
                        "Would you be open to a quick call this week",
                        "As a [title] at [company]",
                        "I understand that as the [title] at [company]",
                        "I noticed that [company] is in the [industry] space",
                        "Our team has extensive experience working with"
                    ]
                }
                
                # For conference/in-person scenario, add the campaign description as the venue
                if scenario == "conference":
                    # Use campaign description as the venue/place/city to meet
                    venue = campaign.description if campaign.description else "the conference"
                    additional_context["venue"] = venue
                    additional_context["meeting_location"] = venue
                    logger.info(f"Using campaign description as venue for in-person meeting: {venue}")
                
                generated_template = template_generator.generate_template_for_category(
                    internal_category,
                    scenario,
                    step=1,  # Initial email
                    additional_context=additional_context
                )
                
                # Store the template
                template_data[cat_id] = generated_template
                
                # Add to templates list
                templates.append({
                    "categoryId": cat_id,
                    "subject": generated_template["subject"],
                    "body": generated_template["body"]
                })
                
                logger.info(f"Successfully generated template for {cat_id}")
            except Exception as e:
                error_message = f"Error generating template for {cat_id}: {str(e)}"
                logger.error(error_message)
                raise HTTPException(status_code=500, detail=error_message)
        
        logger.info(f"Generated {len(templates)} templates for campaign {campaign_id}")

        # Persist generated templates to DB (upsert by campaign + category)
        try:
            saved_count = 0
            for t in templates:
                category_id = t.get("categoryId") or "other"
                subject = t.get("subject") or ""
                body = t.get("body") or ""

                existing_tpl = db.query(EmailTemplate).filter(
                    EmailTemplate.campaign_id == campaign_id,
                    EmailTemplate.category == category_id
                ).first()
                if existing_tpl:
                    existing_tpl.subject = subject
                    existing_tpl.body = body
                else:
                    db.add(EmailTemplate(
                        subject=subject,
                        body=body,
                        category=category_id,
                        campaign_id=campaign_id
                    ))
                saved_count += 1
            db.commit()
            logger.info(f"Saved/updated {saved_count} templates to DB for campaign {campaign_id}")
        except Exception as save_err:
            db.rollback()
            logger.error(f"Failed saving generated templates to DB for campaign {campaign_id}: {save_err}")

        return JSONResponse({
            "success": True,
            "campaign_id": campaign_id,
            "categories": categories,
            "templates": templates
        })
    except Exception as e:
        logger.error(f"Error approving categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error approving categories: {str(e)}")
# -------------------- Template Management API --------------------

@router.post("/campaigns/{campaign_id}/categories/{category_id}/regenerate")
async def regenerate_template(
    campaign_id: int = Path(..., gt=0),
    category_id: str = Path(...),
    db: Session = Depends(get_db)
):
    """
    Regenerate an email template for a specific category in a campaign.
    This allows creating a completely new template that replaces the previous one.
    """
    try:
        logger.info(f"Regenerating template for campaign {campaign_id}, category {category_id}")
        
        # Retrieve campaign from database
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign with ID {campaign_id} not found")
        
        # Try to load the saved contacts
        contacts_file = os.path.join(DATA_DIR, f"campaign_{campaign_id}_contacts.json")
        if not os.path.exists(contacts_file):
            raise HTTPException(status_code=404, detail=f"Contacts file for campaign {campaign_id} not found")
        
        with open(contacts_file, 'r') as f:
            try:
                contacts_data = json.load(f)
                contacts = contacts_data.get("contacts", [])
                categories = contacts_data.get("categories", [])
            except JSONDecodeError as je:
                logger.error(f"Error parsing JSON from contacts file: {str(je)}")
                raise HTTPException(status_code=500, detail=f"Error parsing contacts file: {str(je)}")
        
        # Verify that the category exists
        category_exists = False
        for cat in categories:
            if cat["id"] == category_id:
                category_exists = True
                break
                
        if not category_exists:
            raise HTTPException(status_code=404, detail=f"Category {category_id} not found for campaign {campaign_id}")
        
        # Group contacts by category
        contacts_by_category = {}
        for contact in contacts:
            cat = contact.get("category", "other")
            # Handle legacy "management" category
            if cat == "management":
                cat = "executive"
                contact["category"] = "executive"
                
            if cat not in contacts_by_category:
                contacts_by_category[cat] = []
            contacts_by_category[cat].append(contact)
            
        # Map the UI category ID to our internal category system
        category_mapping = {
            "clinical": "Clinical / Pharmacy",
            "it": "IT / Technology",
            "rd": "R&D / Data",
            "operations": "Operations",
            "sales": "Sales / Partnerships",
            "executive": "Executive",
            "management": "Executive",  # Legacy mapping support
            "other": "Other"
        }
        
        internal_category = category_mapping.get(category_id, "Other")
        
        # Define distinct writing styles for each category to force differentiation
        category_writing_styles = {
            "clinical": "empathetic, healthcare-focused, uses medical terminology and patient-outcome language",
            "it": "technical, precise, references specific technologies and integration benefits",
            "rd": "analytical, data-driven, emphasizes research findings and innovation",
            "operations": "practical, process-oriented, focuses on efficiency and workflow improvements",
            "sales": "enthusiastic, results-focused, uses concrete metrics and ROI language",
            "executive": "strategic, big-picture, emphasizes organizational impact and long-term vision",
            "other": "consultative, solution-oriented, addresses specific pain points"
        }
        
        # Define completely different email structures for each category
        category_email_structures = {
            "clinical": "Begin with healthcare insight, connect to patient outcomes, end with clinical application question",
            "it": "Lead with technical insight, explain integration benefits, conclude with detailed next-step proposal",
            "rd": "Start with research finding, discuss data implications, close with innovation opportunity",
            "operations": "Begin with specific operational challenge, present solution approach, end with implementation question",
            "sales": "Start with bold market trend, connect to specific opportunity, end with value-driven CTA",
            "executive": "Open with strategic observation, discuss competitive advantage, close with executive-level meeting request",
            "other": "Start with industry-specific question, provide tailored insights, end with personalized follow-up offer"
        }
        
        # Completely different communication tones for each category
        category_tones = {
            "clinical": "empathetic, evidence-based, patient-centered",
            "it": "precise, technical, solutions-focused",
            "rd": "analytical, data-driven, innovative",
            "operations": "structured, practical, efficiency-oriented",
            "sales": "confident, direct, enthusiastic",
            "executive": "strategic, authoritative, visionary",
            "other": "consultative, inquisitive, helpful"
        }
        
        # Use a different forced introduction pattern for each category
        category_intro_patterns = {
            "clinical": "Healthcare providers in the {{industry}} are increasingly focused on improving...",
            "it": "Technical teams in the {{industry}} sector are looking for innovative ways to...",
            "rd": "Recent research in {{industry}} suggests that organizations leveraging data analytics are...",
            "operations": "Many operational leaders at {{industry}} organizations are discovering new approaches to...",
            "sales": "Forward-thinking sales teams in the {{industry}} market are adopting strategies that...",
            "executive": "As leadership teams across {{industry}} evaluate strategic priorities, many are finding that...",
            "other": "Professionals like you in the {{industry}} field are addressing challenges related to..."
        }
        
        # Create completely different unique selling propositions for each category
        category_value_props = {
            "clinical": "improve patient outcomes and streamline clinical workflows with evidence-based solutions",
            "it": "eliminate integration gaps between critical systems while maintaining strict compliance standards",
            "rd": "accelerate research and data analysis with advanced analytics and machine learning capabilities",
            "operations": "streamline complex healthcare workflows and reduce operational overhead by up to 35%",
            "sales": "accelerate sales cycles and increase conversion rates through integrated healthcare solutions",
            "executive": "transform strategic initiatives into measurable outcomes with enterprise-wide visibility",
            "other": "address specific departmental challenges with customized healthcare technology solutions"
        }
        
        # Default scenario if not specified
        scenario = campaign.scenario if hasattr(campaign, 'scenario') and campaign.scenario else "cold_outreach"
        
        # Create a template generator with the OpenAI API key
        template_generator = TemplateGenerator(os.environ.get("OPENAI_API_KEY"))
        
        try:
            # Generate template using the LLM with increased differentiation
            logger.info(f"Regenerating completely unique template for category: {category_id} (internal: {internal_category})")
            
            # Enhanced category-specific terms with much more variation
            category_specific_terms = {
                "clinical": ["patient outcomes", "clinical workflows", "evidence-based practice", "medical protocols", "healthcare delivery"],
                "it": ["system architecture", "technology integration", "data security protocol", "infrastructure modernization", "interoperability framework"],
                "rd": ["research insights", "data analytics", "innovation pipeline", "scientific methodology", "discovery process"],
                "operations": ["workflow optimization", "resource allocation", "operational excellence", "process standardization", "efficiency metrics"],
                "sales": ["revenue acceleration", "client acquisition strategy", "partnership ecosystem", "sales enablement", "market penetration"],
                "executive": ["strategic leadership", "organizational transformation", "executive decision framework", "change management", "business growth initiatives"],
                "other": ["specialized expertise", "domain-specific solutions", "tailored implementation", "customized approach", "focused methodology"]
            }
            
            # Create a highly distinct seed for each regeneration attempt
            now = datetime.now()
            microsecond_salt = now.microsecond * (category_id == "clinical" and 1.1 or
                                                 category_id == "it" and 2.2 or
                                                 category_id == "rd" and 3.3 or
                                                 category_id == "operations" and 4.4 or
                                                 category_id == "sales" and 5.5 or
                                                 category_id == "executive" and 6.6 or 7.7)
            
            category_seed = f"{category_id}-{campaign_id}-{now.strftime('%Y%m%d%H%M%S%f')}-{microsecond_salt}-regenerated"
            
            # Get contacts for this category to personalize the template
            category_contacts = contacts_by_category.get(category_id, [])
            
            # Extract detailed industry and company information for better personalization
            industries = list(set(c.get("company", "") for c in category_contacts if c.get("company")))
            job_titles = list(set(c.get("job_title", "") for c in category_contacts if c.get("job_title")))
            
            # Create a distinct template identifier
            template_identifier = f"{campaign_id}-{category_id}-{now.strftime('%Y%m%d%H%M%S%f')}-regenerated"
            
            # Use the template generator with highly differentiated context
            # Prepare additional context
            additional_context = {
                # Identification and entropy
                "campaign_id": campaign_id,
                "category_seed": category_seed,
                "template_identifier": template_identifier,
                "timestamp": now.isoformat(),
                
                # Category-specific style guides
                "writing_style": category_writing_styles.get(category_id, "balanced, professional"),
                "email_structure": category_email_structures.get(category_id, "problem-solution-action"),
                "communication_tone": category_tones.get(category_id, "professional, friendly"),
                "intro_pattern": category_intro_patterns.get(category_id, ""),
                "value_proposition": category_value_props.get(category_id, ""),
                
                # Content guidance
                "focus_terms": category_specific_terms.get(category_id, ["business improvement"]),
                "contact_data": category_contacts[:5],  # Representative contacts
                "common_industries": industries[:3],    # Top industries
                "common_job_titles": job_titles[:5],    # Top job titles
                "contact_count": len(category_contacts),
                
                # Force uniqueness by explicitly avoiding common patterns
                "avoid_phrases": [
                    "optimize healthcare IT operations while maintaining compliance",
                    "I hope this email finds you well",
                    "streamline operations, improve compliance, and enhance patient engagement",
                    "Would you be open to a quick call this week",
                    "As a [title] at [company]",
                    "I understand that as the [title] at [company]",
                    "I noticed that [company] is in the [industry] space",
                    "Our team has extensive experience working with"
                ],
                
                # Flag to indicate this is a regenerated template
                "is_regenerated": True
            }
            
            # For conference/in-person scenario, add the campaign description as the venue
            if scenario == "conference":
                # Use campaign description as the venue/place/city to meet
                venue = campaign.description if campaign.description else "the conference"
                additional_context["venue"] = venue
                additional_context["meeting_location"] = venue
                logger.info(f"Using campaign description as venue for in-person meeting: {venue}")
            
            generated_template = template_generator.generate_template_for_category(
                internal_category,
                scenario,
                step=1,  # Initial email
                additional_context=additional_context
            )
            
            # Return the regenerated template
            return JSONResponse({
                "success": True,
                "campaign_id": campaign_id,
                "category_id": category_id,
                "template": {
                    "categoryId": category_id,
                    "subject": generated_template["subject"],
                    "body": generated_template["body"],
                    "regenerated": True,
                    "timestamp": now.isoformat()
                }
            })
            
        except Exception as e:
            error_message = f"Error regenerating template for {category_id}: {str(e)}"
            logger.error(error_message)
            raise HTTPException(status_code=500, detail=error_message)
            
    except Exception as e:
        logger.error(f"Error in template regeneration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error regenerating template: {str(e)}")


@router.post("/campaigns/{campaign_id}/templates")
async def save_templates(
    campaign_id: int = Path(..., gt=0),
    templates: Dict[str, Any] = None,
    db: Session = Depends(get_db)
):
    """
    Save email templates for a campaign to the database.
    Accepts payload: { templates: [{ categoryId, subject, body }, ...] }
    """
    try:
        if not templates or 'templates' not in templates:
            raise HTTPException(status_code=400, detail="Missing templates in payload")

        saved = []
        for t in templates['templates']:
            category_id = t.get('categoryId') or t.get('category') or 'other'
            subject = t.get('subject') or ''
            body = t.get('body') or ''

            # Upsert by campaign_id + category
            existing = db.query(EmailTemplate).filter(
                EmailTemplate.campaign_id == campaign_id,
                EmailTemplate.category == category_id
            ).first()
            if existing:
                existing.subject = subject
                existing.body = body
            else:
                db.add(EmailTemplate(
                    subject=subject,
                    body=body,
                    category=category_id,
                    campaign_id=campaign_id
                ))
            saved.append({"categoryId": category_id, "subject": subject, "body": body})

        db.commit()

        return JSONResponse({
            "success": True,
            "campaign_id": campaign_id,
            "templates": saved
        })
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving templates: {str(e)}")

# -------------------- Scheduling API --------------------

@router.post("/campaigns/{campaign_id}/schedule/approve")
async def approve_schedule(
    campaign_id: int = Path(..., gt=0),
    data: Dict[str, Any] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Approve the schedule for a campaign.
    This creates EmailLog and Schedule rows so emails can actually send.
    """
    logger.info(f"Approve schedule called for campaign {campaign_id} with data: {data}")
    try:
        # Validate campaign exists
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail=f"Campaign with ID {campaign_id} not found")

        # Load contacts strictly from request payload or file (no implicit DB fallback)
        contacts: List[Dict[str, Any]] = []
        # Prefer explicit contacts provided in the request body
        if data and isinstance(data, dict) and isinstance(data.get("contacts"), list):
            contacts = data.get("contacts") or []
        else:
            contacts_file = os.path.join(DATA_DIR, f"campaign_{campaign_id}_contacts.json")
            if os.path.exists(contacts_file):
                with open(contacts_file, 'r') as f:
                    payload = json.load(f)
                    contacts = payload.get("contacts", [])
            else:
                # If neither request nor file provides contacts, require explicit input
                raise HTTPException(status_code=400, detail="No contacts provided to schedule. Upload a leads file or include contacts in the request.")

        # Decide start date
        start_iso = None
        if data and isinstance(data, dict):
            start_iso = data.get("startDate") or data.get("start_date")
        try:
            start_dt = datetime.fromisoformat(start_iso) if start_iso else datetime.now()
        except Exception:
            start_dt = datetime.now()

        # Load saved templates for this campaign
        templates = db.query(EmailTemplate).filter(EmailTemplate.campaign_id == campaign_id).all()
        templates_by_category = { (tpl.category or 'other'): tpl for tpl in templates }

        # Create EmailLogs and Schedules (skip duplicates)
        created_emails: List[Dict[str, Any]] = []
        for idx, contact in enumerate(contacts):
            email_addr = contact.get("email")
            if not email_addr or not isinstance(email_addr, str) or "@" not in email_addr:
                continue

            # Skip if a pending schedule already exists for this recipient in this campaign
            existing = (
                db.query(Schedule)
                .join(EmailLog, Schedule.email_log_id == EmailLog.id)
                .filter(
                    EmailLog.campaign_id == campaign_id,
                    EmailLog.recipient_email == email_addr,
                    EmailLog.status == "pending",
                    Schedule.is_sent == False
                )
                .first()
            )
            if existing:
                continue

            # Choose template by contact category or fallback
            cat = (contact.get("category") or "other").lower()
            tpl = templates_by_category.get(cat) or next(iter(templates_by_category.values()), None)

            if tpl:
                subject = tpl.subject or ""
                body = tpl.body or ""
            else:
                subject = f"{campaign.name} - Introduction"
                body = (
                    f"Hi {{name}},\n\n"
                    f"We'd love to connect with {{company}}.\n\nBest regards,"
                )

            # Personalize subject and body
            name = contact.get('name') or ''
            company = contact.get('company') or ''
            subject = (subject
                .replace('{{name}}', name)
                .replace('{{company}}', company)
                .replace('{name}', name)
                .replace('{company}', company)
            )
            body = (body
                .replace('{{name}}', name)
                .replace('{{company}}', company)
                .replace('{name}', name)
                .replace('{company}', company)
            )

            # Ensure greeting and signed-off closing
            tb = body.strip()
            if not tb.lower().startswith(("hi ", "hello ", "dear ")):
                body = (f"Hi {name},\n\n" if name else "Hello,\n\n") + body
            if ("thank you" not in body.lower()) and ("regards" not in body.lower()) and ("sincerely" not in body.lower()):
                body = body.rstrip() + "\n\nThank you,\nNeutrino Tech Systems"

            # Find DB contact row for contact_id mapping
            db_contact = db.query(Contact).filter(Contact.email == email_addr, Contact.campaign_id == campaign_id).first()

            email_log = EmailLog(
                recipient_email=email_addr,
                recipient_name=name,
                recipient_company=company,
                recipient_category=cat,
                subject=subject,
                body=body,
                status="pending",
                campaign_id=campaign_id,
                contact_id=db_contact.id if db_contact else None,
            )
            db.add(email_log)
            db.flush()

            schedule = Schedule(
                send_time=start_dt,
                is_holiday=False,
                is_sent=False,
                email_log_id=email_log.id,
            )
            db.add(schedule)

            created_emails.append({
                "id": email_log.id,
                "recipient": email_addr,
                "category": cat,
                "subject": subject,
                "body": body,
                "scheduledDate": start_dt.isoformat(),
                "status": "scheduled"
            })

        # If we created schedules, mark campaign as scheduled
        if created_emails:
            try:
                campaign.status = "scheduled"
            except Exception:
                pass

        db.commit()

        return JSONResponse({
            "success": True,
            "campaign_id": campaign_id,
            "emails": created_emails,
            "status": campaign.status
        })
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error approving schedule: {str(e)}")

# -------------------- Export API --------------------

@router.get("/campaigns/{campaign_id}/export")
async def export_campaign_data(
    campaign_id: int = Path(..., gt=0),
    db: Session = Depends(get_db)
):
    """
    Export campaign data to CSV.
    This endpoint is called from the Neutrino workflow to download campaign data.
    """
    try:
        # Create simple CSV content for demo purposes
        csv_content = "recipient,subject,body,scheduled_date,status\n"
        csv_content += "john@example.com,\"Partnership opportunity\",\"Dear John...\",\"2023-09-15T10:00:00\",\"scheduled\"\n"
        csv_content += "jane@example.com,\"Improving efficiency\",\"Hello Jane...\",\"2023-09-16T11:00:00\",\"scheduled\"\n"
        csv_content += "alex@example.com,\"Technical solutions\",\"Hi Alex...\",\"2023-09-17T14:00:00\",\"scheduled\"\n"
        
        # Prepare response
        response = Response(content=csv_content)
        response.headers["Content-Disposition"] = f"attachment; filename=campaign_{campaign_id}_emails.csv"
        response.headers["Content-Type"] = "text/csv"
        
        return response
    except Exception as e:
        logger.error(f"Error exporting campaign data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error exporting campaign data: {str(e)}")

# -------------------- Database Test API --------------------

@router.get("/database-test")
async def test_database_connection(
    db: Session = Depends(get_db)
):
    """
    Test the database connection for Neutrino components.
    """
    try:
        # Execute a simple query to verify database connection
        result = db.execute(text("SELECT 1 as test")).fetchone()
        
        return JSONResponse({
            "success": True,
            "database_connected": True,
            "test_result": result[0]
        })
    except Exception as e:
        logger.error(f"Database connection test failed: {str(e)}")
        return JSONResponse({
            "success": False,
            "database_connected": False,
            "error": str(e)
        }, status_code=500)


@router.post("/campaigns/{campaign_id}/generate-followups/")
async def generate_followup_templates(
    campaign_id: int = Path(..., gt=0),
    data: Dict[str, Any] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Generate follow-up email templates for a campaign.
    """
    try:
        # Get campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        step = data.get("step", 2)  # Default to follow-up 1
        categories = data.get("categories", [])
        
        if not categories:
            # Get categories from campaign contacts
            categories = list(set([c.category for c in campaign.contacts if c.category]))
        
        templates = {}
        
        for category in categories:
            try:
                # Generate follow-up template for this category and step
                template_data = template_generator.generate_template_for_category(
                    category=category,
                    scenario=campaign.scenario or "cold_outreach",
                    step=step,
                    additional_context={
                        "campaign_name": campaign.name,
                        "campaign_description": campaign.description,
                        "follow_up_step": step
                    }
                )
                
                templates[category] = {
                    step: template_data
                }
                
                # Save template to database
                email_template = EmailTemplate(
                    subject=template_data["subject"],
                    body=template_data["body"],
                    category=category,
                    step=step,
                    campaign_id=campaign_id
                )
                db.add(email_template)
                
            except Exception as e:
                logger.error(f"Failed to generate template for category {category}: {str(e)}")
                # Continue with other categories
                continue
        
        db.commit()
        
        return JSONResponse({
            "success": True,
            "templates": templates,
            "categories": categories,
            "step": step
        })
        
    except Exception as e:
        logger.error(f"Failed to generate follow-up templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate follow-up templates: {str(e)}")


@router.post("/campaigns/{campaign_id}/regenerate-template/")
async def regenerate_template(
    campaign_id: int = Path(..., gt=0),
    data: Dict[str, Any] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Regenerate a specific email template.
    """
    try:
        # Get campaign
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        logger.info(f"Regenerate template request data: {data}")
        category = data.get("category")
        step = data.get("step", 1)
        template_type = data.get("template_type", "initial")  # initial or followup
        
        logger.info(f"Extracted category: {category}, step: {step}, template_type: {template_type}")
        
        if not category:
            raise HTTPException(status_code=400, detail="Category is required")
        
        # Generate new template
        template_data = template_generator.generate_template_for_category(
            category=category,
            scenario=campaign.scenario or "cold_outreach",
            step=step,
            additional_context={
                "campaign_name": campaign.name,
                "campaign_description": campaign.description,
                "template_type": template_type
            }
        )
        
        # Update or create template in database
        existing_template = db.query(EmailTemplate).filter(
            EmailTemplate.campaign_id == campaign_id,
            EmailTemplate.category == category,
            EmailTemplate.step == step
        ).first()
        
        if existing_template:
            existing_template.subject = template_data["subject"]
            existing_template.body = template_data["body"]
        else:
            new_template = EmailTemplate(
                subject=template_data["subject"],
                body=template_data["body"],
                category=category,
                step=step,
                campaign_id=campaign_id
            )
            db.add(new_template)
        
        db.commit()
        
        return JSONResponse({
            "success": True,
            "template": template_data,
            "category": category,
            "step": step
        })
        
    except Exception as e:
        logger.error(f"Failed to regenerate template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate template: {str(e)}")