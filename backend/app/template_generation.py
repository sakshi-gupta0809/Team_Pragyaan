"""
Email template generation module for the Neutrino Email Automation System.
"""
import logging
import os
import json
from typing import Dict, List, Optional, Union, Any
from pathlib import Path
import datetime
import re

# Try to import OpenAI, but make it optional
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logging.warning("OpenAI package not installed. LLM-based template generation will be disabled.")

from .contact_categorization import CONTACT_CATEGORIES

logger = logging.getLogger(__name__)

# Define campaign scenarios
CAMPAIGN_SCENARIOS = {
    "COLD_OUTREACH": "cold_outreach",
    "CONFERENCE": "conference",
    "FOLLOW_UP": "follow_up",
    "PRODUCT_UPDATE": "product_update",
    "WEBINAR_INVITATION": "webinar_invitation",
    "CASE_STUDY": "case_study"
}

# Resource paths
RESOURCES_DIR = Path(__file__).parent.parent / "resources"
SAMPLES_DIR = Path(__file__).parent.parent / "samples"
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Default company summary path
DEFAULT_COMPANY_SUMMARY = RESOURCES_DIR / "neutrino_summary.txt"

# Default email prompt template
DEFAULT_EMAIL_PROMPT = PROMPTS_DIR / "email_prompt.md"

class TemplateGenerator:
    """Handles generation of email templates using LLM and reference samples."""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """Initialize the template generator."""
        self.openai_api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI package not installed. Using fallback template generation.")
            self.use_llm = False
        elif not self.openai_api_key:
            logger.warning("No OpenAI API key provided. Using fallback template generation.")
            self.use_llm = False
        else:
            openai.api_key = self.openai_api_key
            self.use_llm = True
            logger.info("LLM-based template generation enabled.")
        
        # Load company summary
        self.company_summary = self._load_company_summary()
        
        # Load email prompt template
        self.email_prompt_template = self._load_email_prompt_template()
    
    def _load_company_summary(self) -> str:
        """Load the company summary from the resources directory."""
        try:
            with open(DEFAULT_COMPANY_SUMMARY, 'r') as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Failed to load company summary: {str(e)}")
            return "Neutrino Tech Systems is a leader in healthcare IT solutions."
    
    def _load_email_prompt_template(self) -> str:
        """Load the email prompt template from the prompts directory."""
        try:
            with open(DEFAULT_EMAIL_PROMPT, 'r') as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Failed to load email prompt template: {str(e)}")
            return """
Lead Info:
- First Name: {{first_name}}
- Company Name: {{company_name}}
- Designation: {{designation}}
- Industry: {{industry}}
- Scenario: {{scenario}}
- Step: {{step}}

Instructions:
- Generate a personalized email.
- Output JSON with subject, intro, body, cta.
"""
    
    def _load_sample_email(self, scenario: str, step: int) -> str:
        """Load a sample email for a specific scenario and step."""
        # Log the scenario for debugging
        logger.info(f"Loading sample email for scenario: {scenario}, step: {step}")
        
        # Ensure scenario is a string and normalize it
        scenario_str = str(scenario).lower() if scenario else "cold_outreach"
        
        # Force conference scenario if it contains "conference" or "in person"
        if "conference" in scenario_str or "in person" in scenario_str or "in-person" in scenario_str:
            scenario_str = "conference"
        
        # Determine file path based on scenario and step
        if scenario_str == "conference":
            # For conference/in-person scenario
            if step == 1:
                file_name = "initial_email.md"
            else:
                file_name = f"followup{step-1}.md"
            
            sample_path = SAMPLES_DIR / "conference" / file_name
        else:
            # For other scenarios (default to cold_outreach)
            step_name = "initial_email" if step == 1 else f"followup{step-1}"
            file_name = f"{step_name}.md"
            
            if scenario_str not in ["cold_outreach", "conference", "follow_up", "product_update", "webinar_invitation", "case_study"]:
                scenario_str = "cold_outreach"
            
            sample_path = SAMPLES_DIR / scenario_str / file_name
        
        # Try to load the sample file
        try:
            if sample_path.exists():
                with open(sample_path, 'r') as f:
                    return f.read().strip()
            else:
                logger.warning(f"Sample email not found at {sample_path}")
                return ""
        except Exception as e:
            logger.error(f"Error loading sample email: {str(e)}")
            return ""
    
    def infer_campaign_scenario(self, description: str) -> str:
        """Infer the campaign scenario from the description."""
        # If the description is already a valid scenario, return it directly
        if description and description.lower() in [s.lower() for s in CAMPAIGN_SCENARIOS.values()]:
            return description.lower()
            
        if not description:
            return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
            
        # First, try to infer from keywords without using LLM
        description_lower = description.lower()
        
        # Check for conference/in-person keywords
        conference_keywords = ["conference", "event", "summit", "expo", "convention", "meeting", "symposium",
                               "forum", "in person", "in-person", "face to face", "face-to-face", "coffee", "lunch"]
        if any(keyword in description_lower for keyword in conference_keywords):
            return CAMPAIGN_SCENARIOS["CONFERENCE"]
            
        # Check for follow-up keywords
        followup_keywords = ["follow up", "follow-up", "following up", "touched base", "reconnect", "checking in"]
        if any(keyword in description_lower for keyword in followup_keywords):
            return CAMPAIGN_SCENARIOS["FOLLOW_UP"]
        
        # If LLM is available, use it for more sophisticated inference
        if self.use_llm:
            try:
                # Create prompt for scenario inference
                prompt = f"""
                You are an assistant that categorizes email campaign descriptions into predefined scenarios.
                Please categorize the following campaign description into one of these scenarios:
                - cold_outreach: Initial contact with potential clients
                - conference: Follow-up after meeting at an event or any in-person meeting
                - follow_up: Following up on a previous conversation
                - product_update: Announcing new features or products
                - webinar_invitation: Inviting to an online event
                - case_study: Sharing success stories
                
                Campaign description: "{description}"
                
                Output only the scenario name without any explanation or additional text.
                """
                
                # Call OpenAI API with new client interface
                client = openai.OpenAI(api_key=self.openai_api_key)
                response = client.completions.create(
                    model="gpt-3.5-turbo-instruct",
                    prompt=prompt,
                    max_tokens=10,
                    temperature=0.3
                )
                
                # Extract the response text
                result = response.choices[0].text.strip().lower()
                
                # Validate against known scenarios
                for scenario_value in CAMPAIGN_SCENARIOS.values():
                    if scenario_value in result:
                        return scenario_value
                
                # Default to cold_outreach if no match
                return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
            except Exception as e:
                logger.error(f"Error inferring campaign scenario with LLM: {str(e)}")
                return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
        
        # Default to cold_outreach if no LLM and no keyword match
        return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
    
    def generate_template_for_category(
        self,
        category: str,
        scenario: str,
        step: int = 1,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """Generate an email template for a specific category and scenario."""
        # Log the input parameters for debugging
        logger.info(f"Generating template for category: {category}, scenario: {scenario}, step: {step}")
        
        # Normalize scenario to ensure it's one of our supported types
        scenario_str = str(scenario).lower() if scenario else "cold_outreach"
        
        # Force conference scenario if it contains "conference" or "in person"
        if "conference" in scenario_str or "in person" in scenario_str or "in-person" in scenario_str:
            scenario_str = "conference"
        
        # Load sample email based on scenario and step
        sample_email = self._load_sample_email(scenario_str, step)
        
        # If LLM is not available, return a basic template
        if not self.use_llm:
            subject = f"Follow-up: {category} {scenario}"
            body = f"<p>Hello {{{{first_name}}}},</p><p>I wanted to follow up regarding our previous conversation about Neutrino Tech Systems' solutions for {{{{company_name}}}}.</p><p>Would you be available for a brief call to discuss how we can help?</p><p>Best regards,<br>Bella Taylor<br>Senior Client Partner<br>Neutrino Tech Systems</p>"
            
            return {
                "subject": subject,
                "body": body
            }
        
        # Prepare prompt for LLM
        prompt = self.email_prompt_template
        prompt = prompt.replace("{{scenario}}", scenario)
        prompt = prompt.replace("{{day_of_week}}", datetime.datetime.now().strftime("%A"))
        prompt = prompt.replace("{{campaign_name}}", f"{category} {scenario.capitalize()}")
        prompt = prompt.replace("{{step}}", str(step))
        prompt = prompt.replace("{{neutrino_summary}}", self.company_summary)
        prompt = prompt.replace("{{sample_email}}", sample_email)
        
        # Add a note about using actual data
        prompt += "\n\nCRITICAL: The placeholders {{first_name}}, {{company_name}}, etc. will be replaced with ACTUAL data from the Excel file during personalization. DO NOT use generic names or companies in your template."
        
        # Add conference-specific information if applicable
        if scenario_str == "conference" and additional_context:
            venue = additional_context.get("venue", "") or additional_context.get("meeting_location", "")
            if venue:
                prompt += f"\n\nCONFERENCE DETAILS:\n- Location: {venue}\n\nMake sure to reference this specific location in the email. Highlight it in <b>bold</b>.\n"
        
        try:
            # Call OpenAI API
            client = openai.OpenAI(api_key=self.openai_api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email. Use <b>bold</b> for important terms."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            # Extract the response content
            response_content = response.choices[0].message.content.strip()
            
            # Try to parse as JSON first
            try:
                response_json = json.loads(response_content)
                personalized_subject = response_json.get("subject", "")
                personalized_body = response_json.get("body", "")
                
                # If either is empty, fall back to text parsing
                if not personalized_subject or not personalized_body:
                    raise ValueError("JSON response missing required fields")
                
            except Exception as e:
                logger.warning(f"Failed to parse response as JSON: {str(e)}")
                
                # Fall back to text parsing
                # Look for subject line
                subject_match = re.search(r'(?i)Subject:?\s*(.+?)(?:\n|$)', response_content)
                if subject_match:
                    personalized_subject = subject_match.group(1).strip()
                else:
                    # Extract first line as subject if no explicit subject
                    lines = response_content.split('\n')
                    personalized_subject = lines[0].strip()
                    
                # Extract body (everything after subject or first line)
                if subject_match:
                    subject_end = subject_match.end()
                    personalized_body = response_content[subject_end:].strip()
                else:
                    lines = response_content.split('\n')
                    personalized_body = '\n'.join(lines[1:]).strip()
            
            return {
                "subject": personalized_subject,
                "body": personalized_body
            }
            
        except Exception as e:
            logger.error(f"Error generating template with LLM: {str(e)}")
            # Fallback template if LLM generation fails
            subject = f"Follow-up: {category} {scenario}"
            body = f"<p>Hello {{{{first_name}}}},</p><p>I wanted to follow up regarding our previous conversation about Neutrino Tech Systems' solutions for {{{{company_name}}}}.</p><p>Would you be available for a brief call to discuss how we can help?</p><p>Best regards,<br>Bella Taylor<br>Senior Client Partner<br>Neutrino Tech Systems</p>"
            
            return {
                "subject": subject,
                "body": body
            }
    
    def personalize_template(self, template: Dict[str, str], contact_data: Dict[str, str]) -> Dict[str, str]:
        """
        Personalize an email template by replacing placeholders with contact data.
        
        Args:
            template: Dictionary with subject and body
            contact_data: Dictionary with contact data (first_name, company_name, etc.)
            
        Returns:
            Dictionary with personalized subject and body
        """
        logger.info(f"Personalizing template with contact data: {contact_data}")
        
        # Start with the template
        personalized_subject = template["subject"]
        personalized_body = template["body"]
        
        # Replace placeholders in subject and body
        for key, value in contact_data.items():
            if not value:  # Skip empty values
                continue
                
            # Create placeholder pattern with double curly braces
            placeholder = f"{{{{{key}}}}}"
            
            # Replace in subject
            if placeholder in personalized_subject:
                personalized_subject = personalized_subject.replace(placeholder, value)
                logger.info(f"Replaced {placeholder} in subject with {value}")
            
            # Replace in body
            if placeholder in personalized_body:
                personalized_body = personalized_body.replace(placeholder, value)
                logger.info(f"Replaced {placeholder} in body with {value}")
        
        # Check for any remaining placeholders and log them
        subject_placeholders = re.findall(r'{{[^}]+}}', personalized_subject)
        body_placeholders = re.findall(r'{{[^}]+}}', personalized_body)
        
        if subject_placeholders:
            logger.warning(f"Remaining placeholders in subject: {subject_placeholders}")
        
        if body_placeholders:
            logger.warning(f"Remaining placeholders in body: {body_placeholders}")
        
        return {
            "subject": personalized_subject,
            "body": personalized_body
        }


def generate_templates_for_campaign(
    db_session,
    campaign_id: int,
    categories: List[str],
    scenario: str,
    models
) -> Dict[str, Dict[str, str]]:
    """Generate templates for all categories in a campaign."""
    generator = TemplateGenerator()
    
    # Generate templates for each category
    templates = {}
    for category in categories:
        # Generate the template
        template_data = generator.generate_template_for_category(category, scenario)
        templates[category] = template_data
        
        # Save to database
        db_template = models.EmailTemplate(
            subject=template_data["subject"],
            body=template_data["body"],
            campaign_id=campaign_id
        )
        
        db_session.add(db_template)
    
    # Commit the transaction
    db_session.commit()
    
    return templates


def infer_campaign_scenario(description: str) -> str:
    """
    Standalone function to infer campaign scenario from description.
    This delegates to the TemplateGenerator class method.
    
    Args:
        description: Campaign description
        
    Returns:
        Inferred scenario (one of CAMPAIGN_SCENARIOS values)
    """
    generator = TemplateGenerator()
    return generator.infer_campaign_scenario(description)
