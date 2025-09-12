"""
Campaign workflow module for the Neutrino Email Automation System.
Orchestrates the end-to-end process from campaign creation to email scheduling.
"""
import logging
import os
import csv
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException

from . import models
from . import schemas
from .scheduler import get_next_business_day, add_business_days, is_business_day
from .contact_categorization import categorize_designation, categorize_contacts_from_dataframe
from .template_generation import TemplateGenerator, infer_campaign_scenario

logger = logging.getLogger(__name__)

# Define paths for data and output
DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR = Path(__file__).parent.parent / "output"

# Create directories if they don't exist
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

class CampaignWorkflow:
    """
    Manages the campaign workflow from creation to scheduling.
    """
    def __init__(self, db: Session):
        self.db = db
        self.template_generator = TemplateGenerator()
        logger.info("Campaign workflow initialized")
    
    async def create_campaign(self, campaign_data: schemas.CampaignCreate, owner_id: Optional[int] = None) -> models.Campaign:
        """
        Create a new campaign.
        
        Args:
            campaign_data: Campaign data from API
            owner_id: Optional owner ID
            
        Returns:
            Created campaign model
        """
        logger.info(f"Creating campaign: {campaign_data.name}")
        
        # Infer the campaign scenario if not provided
        if not campaign_data.scenario and campaign_data.description:
            campaign_data.scenario = self.template_generator.infer_campaign_scenario(
                campaign_data.description
            )
            logger.info(f"Inferred campaign scenario: {campaign_data.scenario}")
        
        # Create the campaign
        # Enforce a minimum follow-up gap of 2 business days
        safe_followup_gap = campaign_data.followup_gap_days if (campaign_data.followup_gap_days and campaign_data.followup_gap_days > 1) else 2

        db_campaign = models.Campaign(
            name=campaign_data.name,
            description=campaign_data.description,
            scenario=campaign_data.scenario or "cold_outreach",
            start_date=campaign_data.start_date,
            followup_gap_days=safe_followup_gap,
            status="draft",
            owner_id=owner_id
        )
        
        self.db.add(db_campaign)
        self.db.commit()
        self.db.refresh(db_campaign)
        
        logger.info(f"Campaign created with ID: {db_campaign.id}")
        return db_campaign
    
    async def process_contacts_file(
        self, 
        campaign_id: int, 
        file: UploadFile
    ) -> Dict[str, Any]:
        """
        Process an uploaded contacts file (Excel/CSV) and add contacts to the campaign.
        
        Args:
            campaign_id: Campaign ID
            file: Uploaded file
            
        Returns:
            Dictionary with import statistics
        """
        # Check if campaign exists
        campaign = self.db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Save file to data directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path = DATA_DIR / f"campaign_{campaign_id}_{timestamp}{Path(file.filename).suffix}"
        
        try:
            # Save uploaded file
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
            
            logger.info(f"Saved uploaded file to {file_path}")
            
            # Read file with pandas
            if file_path.suffix.lower() in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            else:  # Assume CSV
                df = pd.read_csv(file_path)
            
            # Process the dataframe
            return await self._process_contacts_dataframe(campaign_id, df)
            
        except Exception as e:
            logger.error(f"Error processing contacts file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing contacts file: {str(e)}")
    
    async def _process_contacts_dataframe(
        self, 
        campaign_id: int, 
        df: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Process a dataframe of contacts and add them to the campaign.
        
        Args:
            campaign_id: Campaign ID
            df: Pandas DataFrame with contact data
            
        Returns:
            Dictionary with import statistics
        """
        # Validate required columns
        required_columns = ['name', 'email']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Standardize column names
        column_mapping = {
            'first_name': 'first_name',
            'last_name': 'last_name',
            'name': 'name',
            'email': 'email',
            'designation': 'designation',
            'job_title': 'designation',
            'title': 'designation',
            'company': 'company',
            'company_name': 'company',
            'organization': 'company',
            'industry': 'industry',
            'linkedin': 'linkedin_url',
            'linkedin_url': 'linkedin_url'
        }
        
        # Rename columns based on mapping
        for old_name, new_name in column_mapping.items():
            if old_name in df.columns and old_name != new_name:
                df[new_name] = df[old_name]
        
        # Ensure name column exists
        if 'name' not in df.columns and 'first_name' in df.columns:
            if 'last_name' in df.columns:
                df['name'] = df['first_name'] + ' ' + df['last_name']
            else:
                df['name'] = df['first_name']
        
        # Categorize contacts if designation column exists
        if 'designation' in df.columns:
            df = categorize_contacts_from_dataframe(df, 'designation')
        else:
            df['category'] = "Other"
        
        # Add contacts to database
        imported_count = 0
        category_counts = {}
        
        for _, row in df.iterrows():
            try:
                # Extract extra data
                extra_data = {}
                for col in df.columns:
                    if col not in column_mapping.values() and pd.notna(row[col]):
                        extra_data[col] = str(row[col])
                
                # Create contact object
                contact = models.Contact(
                    name=row['name'],
                    email=row['email'],
                    designation=row.get('designation'),
                    company=row.get('company'),
                    industry=row.get('industry'),
                    category=row.get('category', "Other"),
                    linkedin_url=row.get('linkedin_url'),
                    campaign_id=campaign_id,
                    extra_data=extra_data if extra_data else None
                )
                
                self.db.add(contact)
                imported_count += 1
                
                # Track category counts
                category = row.get('category', "Other")
                category_counts[category] = category_counts.get(category, 0) + 1
                
            except Exception as e:
                logger.error(f"Error importing contact {row.get('email')}: {str(e)}")
                continue
        
        # Commit transaction
        self.db.commit()
        
        # Update campaign recipient count
        campaign = self.db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        campaign.recipient_count = imported_count
        self.db.commit()
        
        return {
            "success": True,
            "imported_count": imported_count,
            "category_distribution": category_counts
        }
    
    async def generate_templates(self, campaign_id: int) -> Dict[str, Any]:
        """
        Generate email templates for each contact category in the campaign.
        
        Args:
            campaign_id: Campaign ID
            
        Returns:
            Dictionary with template generation results
        """
        # Check if campaign exists
        campaign = self.db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get unique categories from contacts
        categories = [cat[0] for cat in self.db.query(models.Contact.category)
            .filter(models.Contact.campaign_id == campaign_id)
            .distinct()
            .all()]
        
        if not categories:
            raise HTTPException(status_code=400, detail="No contacts found in campaign")
        
        # Generate templates for each category
        templates_created = 0
        for category in categories:
            if not category:  # Skip null categories
                continue
                
            # Create initial email template (step 1)
            template_data = self.template_generator.generate_template_for_category(
                category, campaign.scenario, 1
            )
            
            template = models.EmailTemplate(
                subject=template_data["subject"],
                body=template_data["body"],
                category=category,
                step=1,
                campaign_id=campaign_id
            )
            
            self.db.add(template)
            templates_created += 1
            
            # Create follow-up templates if needed (up to 5 follow-ups)
            max_followups = 5
            for step in range(2, max_followups + 1):
                followup_data = self.template_generator.generate_template_for_category(
                    category, campaign.scenario, step
                )
                
                followup_template = models.EmailTemplate(
                    subject=followup_data["subject"],
                    body=followup_data["body"],
                    category=category,
                    step=step,
                    campaign_id=campaign_id
                )
                
                self.db.add(followup_template)
                templates_created += 1
        
        # Commit transaction
        self.db.commit()
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "templates_created": templates_created,
            "categories": categories
        }
    
    async def personalize_emails(self, campaign_id: int) -> Dict[str, Any]:
        """
        Personalize emails for each contact in the campaign.
        
        Args:
            campaign_id: Campaign ID
            
        Returns:
            Dictionary with personalization results
        """
        # Check if campaign exists
        campaign = self.db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get all contacts for the campaign
        contacts = self.db.query(models.Contact).filter(models.Contact.campaign_id == campaign_id).all()
        if not contacts:
            raise HTTPException(status_code=400, detail="No contacts found in campaign")
        
        # Get templates for the campaign
        templates = self.db.query(models.EmailTemplate).filter(models.EmailTemplate.campaign_id == campaign_id).all()
        if not templates:
            raise HTTPException(status_code=400, detail="No templates found in campaign")
        
        # Group templates by category and step
        template_map = {}
        for template in templates:
            category = template.category or "Other"
            step = template.step or 1
            
            if category not in template_map:
                template_map[category] = {}
            
            template_map[category][step] = template
        
        # Create personalized emails for each contact
        personalized_count = 0
        for contact in contacts:
            try:
                category = contact.category or "Other"
                
                # Find templates for this category (or use "Other" as fallback)
                category_templates = template_map.get(category) or template_map.get("Other")
                if not category_templates:
                    logger.warning(f"No templates found for category {category}")
                    continue
                
                # Personalize initial email (step 1)
                initial_template = category_templates.get(1)
                if not initial_template:
                    logger.warning(f"No initial template found for category {category}")
                    continue
                
                # Create contact data for personalization
                contact_data = {
                    "first_name": contact.name.split()[0] if contact.name else "",
                    "name": contact.name,
                    "email": contact.email,
                    "company": contact.company or "",
                    "designation": contact.designation or "",
                    "industry": contact.industry or ""
                }
                
                # Add extra data if available
                if contact.extra_data:
                    contact_data.update(contact.extra_data)
                
                # Personalize template
                personalized = self.template_generator.personalize_template(
                    {"subject": initial_template.subject, "body": initial_template.body},
                    contact_data
                )
                
                # Create email log
                email_log = models.EmailLog(
                    recipient_email=contact.email,
                    recipient_name=contact.name,
                    recipient_company=contact.company,
                    recipient_category=contact.category,
                    subject=personalized["subject"],
                    body=personalized["body"],
                    status="pending",
                    step=1,
                    campaign_id=campaign_id,
                    contact_id=contact.id
                )
                
                self.db.add(email_log)
                personalized_count += 1
                
                # Create follow-up emails if templates exist
                for step in range(2, 6):  # Up to 5 follow-ups
                    if step not in category_templates:
                        continue
                    
                    followup_template = category_templates[step]
                    
                    # Personalize follow-up
                    personalized_followup = self.template_generator.personalize_template(
                        {"subject": followup_template.subject, "body": followup_template.body},
                        contact_data
                    )
                    
                    # Create follow-up email log
                    followup_log = models.EmailLog(
                        recipient_email=contact.email,
                        recipient_name=contact.name,
                        recipient_company=contact.company,
                        recipient_category=contact.category,
                        subject=personalized_followup["subject"],
                        body=personalized_followup["body"],
                        status="pending",
                        step=step,
                        campaign_id=campaign_id,
                        contact_id=contact.id
                    )
                    
                    self.db.add(followup_log)
                    personalized_count += 1
                
            except Exception as e:
                logger.error(f"Error personalizing email for contact {contact.email}: {str(e)}")
                continue
        
        # Commit transaction
        self.db.commit()
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "personalized_count": personalized_count
        }
    
    async def schedule_campaign(
        self, 
        campaign_id: int, 
        start_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Schedule a campaign for sending.
        
        Args:
            campaign_id: Campaign ID
            start_date: Optional start date (defaults to next business day)
            
        Returns:
            Dictionary with scheduling results
        """
        # Check if campaign exists
        campaign = self.db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Use provided start date or next business day
        if start_date is None:
            if campaign.start_date:
                start_date = campaign.start_date
            else:
                start_date = get_next_business_day(datetime.now())
        else:
            start_date = get_next_business_day(start_date)
        
        # Update campaign start date
        campaign.start_date = start_date
        campaign.status = "scheduled"
        
        # Get all pending emails for the campaign
        emails = self.db.query(models.EmailLog).filter(
            models.EmailLog.campaign_id == campaign_id,
            models.EmailLog.status == "pending"
        ).all()
        
        if not emails:
            raise HTTPException(status_code=400, detail="No pending emails found in campaign")
        
        # Group emails by contact and step
        emails_by_contact = {}
        for email in emails:
            contact_id = email.contact_id
            step = email.step
            
            if contact_id not in emails_by_contact:
                emails_by_contact[contact_id] = {}
            
            emails_by_contact[contact_id][step] = email
        
        # Schedule emails with appropriate gaps
        scheduled_count = 0
        
        for contact_id, contact_emails in emails_by_contact.items():
            # Sort by step
            sorted_steps = sorted(contact_emails.keys())
            
            # Schedule initial email (step 1)
            if 1 in contact_emails:
                initial_email = contact_emails[1]
                initial_schedule = models.Schedule(
                    send_time=start_date,
                    is_holiday=False,
                    is_sent=False,
                    email_log_id=initial_email.id
                )
                
                self.db.add(initial_schedule)
                scheduled_count += 1
                
                # Schedule follow-ups with appropriate gaps
                last_date = start_date
                
                for step in sorted_steps[1:]:  # Skip step 1 (initial email)
                    followup_email = contact_emails[step]
                    
                    # Calculate send date based on follow-up gap (minimum 2)
                    gap_days = campaign.followup_gap_days or 2
                    if gap_days < 2:
                        gap_days = 2
                    followup_date = add_business_days(last_date, gap_days)
                    
                    # Create schedule
                    followup_schedule = models.Schedule(
                        send_time=followup_date,
                        is_holiday=False,
                        is_sent=False,
                        email_log_id=followup_email.id
                    )
                    
                    self.db.add(followup_schedule)
                    scheduled_count += 1
                    
                    # Update last date for next follow-up
                    last_date = followup_date
        
        # Commit transaction
        self.db.commit()
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "start_date": start_date.isoformat(),
            "scheduled_count": scheduled_count
        }
    
    async def export_campaign_to_csv(self, campaign_id: int) -> str:
        """
        Export a campaign's personalized emails to CSV.
        
        Args:
            campaign_id: Campaign ID
            
        Returns:
            Path to the exported CSV file
        """
        # Check if campaign exists
        campaign = self.db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get all scheduled emails for the campaign
        email_data = self.db.query(
            models.EmailLog,
            models.Schedule.send_time
        ).join(
            models.Schedule,
            models.EmailLog.id == models.Schedule.email_log_id
        ).filter(
            models.EmailLog.campaign_id == campaign_id
        ).all()
        
        if not email_data:
            raise HTTPException(status_code=400, detail="No scheduled emails found in campaign")
        
        # Prepare CSV file
        csv_path = OUTPUT_DIR / f"{campaign.name.replace(' ', '_')}_emails.csv"
        
        try:
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'campaign', 'first_name', 'last_name', 'email', 'category',
                    'subject', 'body', 'send_date', 'step'
                ]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for email, send_date in email_data:
                    # Split name into first and last
                    name_parts = (email.recipient_name or "").split(' ', 1)
                    first_name = name_parts[0] if name_parts else ""
                    last_name = name_parts[1] if len(name_parts) > 1 else ""
                    
                    writer.writerow({
                        'campaign': campaign.name,
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': email.recipient_email,
                        'category': email.recipient_category or "Other",
                        'subject': email.subject,
                        'body': email.body,
                        'send_date': send_date.isoformat() if send_date else "",
                        'step': email.step
                    })
            
            logger.info(f"Exported campaign {campaign_id} to {csv_path}")
            return str(csv_path)
            
        except Exception as e:
            logger.error(f"Error exporting campaign to CSV: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error exporting campaign: {str(e)}")
    
    async def run_full_workflow(
        self,
        campaign_data: schemas.CampaignCreate,
        file: UploadFile,
        owner_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Run the full campaign workflow from creation to scheduling.
        
        Args:
            campaign_data: Campaign data
            file: Uploaded contacts file
            owner_id: Optional owner ID
            
        Returns:
            Dictionary with workflow results
        """
        try:
            # Step 1: Create campaign
            campaign = await self.create_campaign(campaign_data, owner_id)
            
            # Step 2: Process contacts file
            contacts_result = await self.process_contacts_file(campaign.id, file)
            
            # Step 3: Generate templates
            templates_result = await self.generate_templates(campaign.id)
            
            # Step 4: Personalize emails
            personalize_result = await self.personalize_emails(campaign.id)
            
            # Step 5: Schedule campaign
            schedule_result = await self.schedule_campaign(campaign.id, campaign_data.start_date)
            
            # Step 6: Export to CSV
            csv_path = await self.export_campaign_to_csv(campaign.id)
            
            # Return combined results
            return {
                "success": True,
                "campaign_id": campaign.id,
                "campaign_name": campaign.name,
                "contacts_imported": contacts_result["imported_count"],
                "templates_created": templates_result["templates_created"],
                "emails_personalized": personalize_result["personalized_count"],
                "emails_scheduled": schedule_result["scheduled_count"],
                "start_date": schedule_result["start_date"],
                "export_path": csv_path
            }
            
        except Exception as e:
            logger.error(f"Error in campaign workflow: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error in campaign workflow: {str(e)}")