"""
Email template generation module for the Neutrino Email Automation System.
Handles inference of campaign type and generation of category-based email templates.
"""
import logging
import os
import json
from typing import Dict, List, Optional, Union, Any
from pathlib import Path
import datetime

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

# Default email format template removed – only email_prompt.md will be used

class TemplateGenerator:
    """
    Handles generation of email templates using LLM and reference samples.
    """
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the template generator.
        
        Args:
            openai_api_key: OpenAI API key for LLM-based generation
        """
        self.openai_api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI package not installed. Using fallback template generation.")
            self.use_llm = False
        elif not self.openai_api_key:
            logger.warning("No OpenAI API key provided. Using fallback template generation.")
            logger.warning(f"Environment keys available: {list(os.environ.keys())}")
            self.use_llm = False
        else:
            openai.api_key = self.openai_api_key
            self.use_llm = True
            logger.info(f"LLM-based template generation enabled with API key starting with {self.openai_api_key[:5]}...")
            logger.info("LLM-based template generation enabled.")
        
        # Load company summary
        self.company_summary = self._load_company_summary()
        
        # Load email prompt template
        self.email_prompt_template = self._load_email_prompt_template()
        
        # Do not load email format template – generation will rely solely on email_prompt.md
    
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
    
    # Removed email format template loader
    
    def _load_sample_email(self, scenario: str, step: int) -> str:
        """
        Load a sample email for a specific scenario and step.
        
        Args:
            scenario: The campaign scenario (cold_outreach, conference, etc.)
            step: The email step (1 for initial, 2+ for follow-ups)
            
        Returns:
            Sample email text or fallback template if not found
        """
        # Log the scenario for debugging
        logger.info(f"Loading sample email for scenario: {scenario}, step: {step}")
        
        # Ensure scenario is a string and normalize it
        scenario_str = str(scenario).lower() if scenario else "cold_outreach"
        logger.info(f"Normalized scenario: {scenario_str}")
        
        # Force conference scenario if it contains "conference" or "in person"
        if "conference" in scenario_str or "in person" in scenario_str or "in-person" in scenario_str:
            scenario_str = "conference"
            logger.info(f"Forcing conference scenario based on keywords in: {scenario}")
        
        # Determine file path based on scenario and step
        if scenario_str == "conference":
            # For conference/in-person scenario, use the correct file name from the conference folder
            if step == 1:
                file_name = "initail_email.md"  # This matches the actual file name in the conference folder
            else:
                file_name = f"followup{step-1}.md"
            logger.info(f"Using conference sample email: {file_name}")
        else:
            # For other scenarios (default to cold_outreach)
            step_name = "initial_email" if step == 1 else f"followup{step-1}"
            file_name = f"{step_name}.md"
            # If not a recognized scenario, use cold_outreach
            if scenario_str not in ["cold_outreach", "follow_up", "product_update", "webinar_invitation", "case_study"]:
                scenario_str = "cold_outreach"
                logger.info(f"Using default 'cold_outreach' scenario for unrecognized scenario: {scenario}")
        
        # Check if the conference folder exists
        conference_dir = SAMPLES_DIR / "conference"
        if not conference_dir.exists():
            logger.error(f"Conference samples directory does not exist: {conference_dir}")
            # List all available sample directories
            available_dirs = [d.name for d in SAMPLES_DIR.iterdir() if d.is_dir()]
            logger.info(f"Available sample directories: {available_dirs}")
        else:
            # List all files in the conference directory for debugging
            conference_files = [f.name for f in conference_dir.iterdir() if f.is_file()]
            logger.info(f"Files in conference directory: {conference_files}")
        
        sample_path = SAMPLES_DIR / scenario_str / file_name
        logger.info(f"Looking for sample email at: {sample_path}")
        
        try:
            if sample_path.exists():
                with open(sample_path, 'r') as f:
                    sample_content = f.read().strip()
                logger.info(f"Loaded sample email from {sample_path}")
                
                # For conference scenario, add a note about using the venue information
                if scenario_str == "conference":
                    sample_content += "\n\nNOTE: When using this template, replace any generic venue references with the specific venue provided in the campaign description. Make sure to use the exact venue name and highlight it in bold."
                
                return sample_content
            else:
                logger.warning(f"Sample email not found at {sample_path}")
                # For conference scenario, don't provide fallback - only use .md files from conference folder
                if scenario_str == "conference":
                    logger.error(f"No fallback for conference emails. Must use .md files from conference folder.")
                    raise FileNotFoundError(f"Required conference email template not found: {sample_path}")
                return ""
        except Exception as e:
            logger.error(f"Error loading sample email: {str(e)}")
            if scenario_str == "conference":
                # Re-raise the exception for conference scenario to prevent fallback
                raise
            return ""
    
    def infer_campaign_scenario(self, description: str) -> str:
        """
        Infer the campaign scenario from the description using LLM.
        
        Args:
            description: Campaign description
            
        Returns:
            Inferred scenario (one of CAMPAIGN_SCENARIOS values)
        """
        # If the description is already a valid scenario, return it directly
        if description and description.lower() in [s.lower() for s in CAMPAIGN_SCENARIOS.values()]:
            logger.info(f"Using provided scenario: {description}")
            return description.lower()
            
        if not description:
            logger.info("No description provided, using default scenario (cold_outreach)")
            return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
            
        # First, try to infer from keywords without using LLM
        description_lower = description.lower()
        
        # Check for conference/in-person keywords
        conference_keywords = ["conference", "event", "summit", "expo", "convention", "meeting", "symposium",
                              "forum", "in person", "in-person", "face to face", "face-to-face", "coffee", "lunch"]
        if any(keyword in description_lower for keyword in conference_keywords):
            logger.info(f"Inferred conference scenario from keywords in description: {description}")
            return CAMPAIGN_SCENARIOS["CONFERENCE"]
            
        # Check for follow-up keywords
        followup_keywords = ["follow up", "follow-up", "following up", "touched base", "reconnect", "checking in"]
        if any(keyword in description_lower for keyword in followup_keywords):
            logger.info(f"Inferred follow-up scenario from keywords in description: {description}")
            return CAMPAIGN_SCENARIOS["FOLLOW_UP"]
            
        # If no keywords matched and LLM is available, use it
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
                
                # Extract the response text (updated for new client interface)
                result = response.choices[0].text.strip().lower()
                
                # Log the result
                logger.info(f"LLM inference result: {result}")
                
                # Validate against known scenarios
                for scenario_value in CAMPAIGN_SCENARIOS.values():
                    if scenario_value in result:
                        logger.info(f"Inferred scenario: {scenario_value} from description")
                        return scenario_value
                
                # Default to cold_outreach if no match
                logger.warning(f"Could not infer scenario from description. Using default. LLM response: {result}")
                return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
            except Exception as e:
                logger.error(f"Error inferring campaign scenario with LLM: {str(e)}")
                return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
        
        # Default to cold_outreach if no LLM and no keyword match
        logger.info("No LLM available and no keyword match, using default scenario (cold_outreach)")
        return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
    
    def generate_template_for_category(
        self,
        category: str,
        scenario: str,
        step: int = 1,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        Generate an email template for a specific category and scenario.
        
        Args:
            category: Contact category (from CONTACT_CATEGORIES)
            scenario: Campaign scenario (from CAMPAIGN_SCENARIOS)
            step: Email step (1 for initial, 2+ for follow-ups)
            
        Returns:
            Dictionary with subject and body
        """
        # Log the input parameters for debugging
        logger.info(f"Generating template for category: {category}, scenario: {scenario}, step: {step}")
        
        # Normalize scenario to ensure it's one of our supported types
        scenario_str = str(scenario).lower() if scenario else "cold_outreach"
        logger.info(f"Normalized scenario: {scenario_str}")
        
        # Force conference scenario if it contains "conference" or "in person"
        if "conference" in scenario_str or "in person" in scenario_str or "in-person" in scenario_str:
            scenario_str = "conference"
            logger.info(f"Forcing conference scenario based on keywords in: {scenario}")
            
        # Log additional context if provided
        if additional_context:
            venue = additional_context.get("venue") or additional_context.get("meeting_location")
            if venue and scenario_str == "conference":
                logger.info(f"Using venue for conference scenario: {venue}")
        
        try:
            # Load sample email based on scenario and step
            sample_email = self._load_sample_email(scenario_str, step)
        except FileNotFoundError as e:
            # For conference scenario, we don't allow fallback
            if scenario_str == "conference":
                logger.error(f"Cannot generate template for conference scenario: {str(e)}")
                raise RuntimeError(f"Conference email templates must use .md files from conference folder. {str(e)}")
            sample_email = ""
        
        if not self.use_llm:
            # No fallback – enforce LLM-only generation
            raise RuntimeError("LLM unavailable: template generation requires OPENAI_API_KEY and openai package.")
        
        try:
            # Add randomization based on current time and category
            seed = f"{category}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"
            
            # Prepare prompt variables
            day_of_week = datetime.datetime.now().strftime("%A")
            
            # Use dynamic placeholders that will be replaced with actual data
            placeholders = {
                "first_name": "{{first_name}}",  # Will be replaced with actual first name from Excel
                "company_name": "{{company_name}}",  # Will be replaced with actual company from Excel
                "designation": "{{designation}}",  # Will be replaced with actual designation from Excel
                "industry": "{{industry}}"  # Will be replaced with actual industry from Excel
            }
            
            # Keep the placeholders in the prompt template as is
            prompt = self.email_prompt_template
            prompt = prompt.replace("{{scenario}}", scenario)
            prompt = prompt.replace("{{day_of_week}}", day_of_week)
            prompt = prompt.replace("{{campaign_name}}", f"{category} {scenario.capitalize()}")
            prompt = prompt.replace("{{step}}", str(step))
            prompt = prompt.replace("{{neutrino_summary}}", self.company_summary)
            prompt = prompt.replace("{{sample_email}}", sample_email)
            
            # Add a note about using actual data
            prompt += "\n\nCRITICAL: The placeholders {{first_name}}, {{company_name}}, etc. will be replaced with ACTUAL data from the Excel file during personalization. DO NOT use generic names or companies in your template."
            
            # Add additional context to the prompt if provided
            if additional_context:
                context_str = "\nAdditional Context for Personalization:\n"
                
                # Handle industry information
                if "common_industries" in additional_context and additional_context["common_industries"]:
                    industries = additional_context["common_industries"]
                    context_str += f"- Common Industries: {', '.join(industries)}\n"
                
                # Handle job titles
                if "common_job_titles" in additional_context and additional_context["common_job_titles"]:
                    job_titles = additional_context["common_job_titles"]
                    context_str += f"- Common Job Titles: {', '.join(job_titles)}\n"
                
                # Handle focus terms
                if "focus_terms" in additional_context and isinstance(additional_context["focus_terms"], list):
                    context_str += f"- Key Focus Areas: {', '.join(additional_context['focus_terms'])}\n"
                
                # Add contact examples
                if "contact_data" in additional_context and isinstance(additional_context["contact_data"], list) and additional_context["contact_data"]:
                    contacts = additional_context["contact_data"]
                    context_str += f"- Target Audience: {additional_context.get('contact_count', len(contacts))} contacts in this category\n"
                    context_str += "- Representative Contacts:\n"
                    for idx, contact in enumerate(contacts[:3]):  # Just use up to 3 contacts as examples
                        name = contact.get('name', 'Unknown')
                        job = contact.get('job_title', 'Unknown')
                        company = contact.get('company', 'Unknown Company')
                        context_str += f"  * {name}: {job} at {company}\n"
                
                # Add other relevant fields
                for key, value in additional_context.items():
                    if key not in ['focus_terms', 'contact_data', 'common_industries', 'common_job_titles',
                                  'category_seed', 'campaign_id', 'timestamp', 'contact_count']:
                        context_str += f"- {key.replace('_', ' ').title()}: {value}\n"
                
                prompt += context_str
                prompt += "\nEMAIL PERSONALIZATION INSTRUCTIONS:\n"
                prompt += "1. Use the contact information above to craft a highly relevant email that speaks directly to this audience's needs\n"
                prompt += "2. Reference specific job roles, industries, and challenges they face\n"
                prompt += "3. Tailor your value proposition to address their specific pain points\n"
                prompt += "4. Make this email distinctly different from emails to other categories\n"
                prompt += "5. Don't mention specific contact names, but do reference their roles and industries\n"
            
            # Add multiple sources of randomization
            current_time = datetime.datetime.now()
            microseconds = current_time.microsecond
            prompt += f"\nUNIQUENESS IDENTIFIERS:\n"
            prompt += f"- Seed: {seed}\n"
            prompt += f"- Timestamp: {current_time.timestamp()}\n"
            prompt += f"- Microsecond: {microseconds}\n"
            prompt += f"- Random Factor: {(microseconds % 100) / 100}\n"
            
            # Get current microsecond for added randomization
            microsecond = datetime.datetime.now().microsecond
            
            # Determine which category we're generating for
            category_for_model = "default"
            if "Clinical / Pharmacy" in category:
                category_for_model = "clinical"
            elif "IT / Technology" in category:
                category_for_model = "it"
            elif "R&D / Data" in category:
                category_for_model = "rd"
            elif "Operations" in category:
                category_for_model = "operations"
            elif "Sales / Partnerships" in category:
                category_for_model = "sales"
            elif "Executive" in category:
                category_for_model = "executive"
            
            # Different system prompts for each category - ensuring completely human tone
            system_prompts = {
                "clinical": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email to a healthcare professional. Use medical terminology and evidence-based language. Use <b>bold</b> for important terms. Never use emojis. Never mention AI or use phrases that sound automated. Write as if you're a real person sending a normal business email.",
                "it": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email to an IT professional. Use technical language about systems and integrations. Use <b>bold</b> for important terms. Never use emojis. Never mention AI or use phrases that sound automated. Write as if you're a real person sending a normal business email.",
                "rd": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email to a research professional. Focus on data, innovation, and scientific advancement. Use <b>bold</b> for important terms. Never use emojis. Never mention AI or use phrases that sound automated. Write as if you're a real person sending a normal business email.",
                "operations": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email to an operations professional. Use clear, practical language about process improvements. Use <b>bold</b> for important terms. Never use emojis. Never mention AI or use phrases that sound automated. Write as if you're a real person sending a normal business email.",
                "sales": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email to a sales professional. Use persuasive, results-focused language. Use <b>bold</b> for important terms. Never use emojis. Never mention AI or use phrases that sound automated. Write as if you're a real person sending a normal business email.",
                "executive": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email to a C-suite executive. Create a strategic, high-level message. Use <b>bold</b> for important terms. Never use emojis. Never mention AI or use phrases that sound automated. Write as if you're a real person sending a normal business email.",
                "default": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email. Use <b>bold</b> for important terms. Never use emojis. Never mention AI or use phrases that sound automated. Write as if you're a real person sending a normal business email to a specific individual."
            }
            
            # Use different model based on category to maximize variation
            model_selection = {
                "clinical": "gpt-4o",
                "it": "gpt-3.5-turbo",
                "rd": "gpt-4o",
                "operations": "gpt-3.5-turbo",
                "sales": "gpt-4o",
                "executive": "gpt-3.5-turbo",
                "default": "gpt-4o" if microsecond % 2 == 0 else "gpt-3.5-turbo"
            }
            
            # Vary temperature based on category and microsecond
            base_temp = 0.8 + (microsecond % 20) / 100  # 0.8-0.99 range for randomness
            temperature_selection = {
                "clinical": base_temp + 0.1,
                "it": base_temp + 0.2,
                "rd": base_temp + 0.05,
                "operations": base_temp + 0.15,
                "sales": base_temp + 0.2,
                "executive": base_temp + 0.1,
                "default": base_temp
            }
            
            # Add instructions for HTML formatting
            prompt += "\n\nHTML FORMATTING REQUIREMENTS:\n"
            prompt += "1. Use <b>bold text</b> for important terms, company names, and key points\n"
            prompt += "2. Use proper HTML bullet points with <ul> and <li> tags for lists\n"
            prompt += "3. Structure the email with clear paragraphs\n"
            prompt += "4. Ensure all HTML tags are properly closed\n"
            prompt += "5. Make the email visually appealing with proper formatting\n"
            
            # Call OpenAI API with new client interface and category-specific parameters
            client = openai.OpenAI(api_key=self.openai_api_key)
            # Prepare conference-specific instructions if this is a conference scenario
            conference_instructions = ""
            if scenario == "conference":
                venue = additional_context.get("venue") or additional_context.get("meeting_location") or "the conference"
                conference_instructions = f"""
                CONFERENCE/IN-PERSON MEETING INSTRUCTIONS:
                1. This is an in-person meeting email for a meeting at: <b>{venue}</b>
                2. Use the venue '{venue}' as the specific location for the meeting
                3. Mention this venue/location prominently in the email
                4. Suggest a specific meeting time and place within or near {venue}
                5. Make the CTA about meeting in person at this specific venue
                6. Bold the venue name and meeting details
                """
                logger.info(f"Added conference-specific instructions for venue: {venue}")
            
            response = client.chat.completions.create(
                model=model_selection.get(category_for_model, "gpt-4o"),
                messages=[
                    {"role": "system", "content": system_prompts.get(category_for_model, system_prompts["default"])},
                    {"role": "user", "content": f"Write a completely human, personalized email for {category} professionals. Use proper HTML formatting with <b>bold</b> for emphasis and <ul><li>bullet points</li></ul> for lists. NEVER mention AI, algorithms, or anything that sounds automated. Write as if you're a real person sending an individual email."},
                    {"role": "user", "content": prompt + conference_instructions + f"\n\nIMPORTANT REQUIREMENTS:\n1. This is email #{microsecond} in sequence {category_for_model}. Make it completely different from any other email.\n2. Use actual data from the contact information in your personalization.\n3. NEVER use 'AI', 'assistant', 'algorithm', or any terms that suggest automation.\n4. Write in a completely human, conversational tone as if you're a real person writing directly to this individual.\n5. DO NOT include meta-statements like 'This message was crafted uniquely for you' or 'as part of our focus on personalization' or any similar phrases that draw attention to the personalization process.\n6. Just write a normal business email as one human would write to another - don't comment on the email itself.\n7. NEVER use emojis or emoticons in the email.\n8. Use <b>bold text</b> for important terms, company names, key points, and meeting details.\n9. For conference/in-person scenarios, include specific details about the venue and suggest meeting over coffee or at a specific location within the venue.\n10. If this is a conference/in-person email, the CTA should specifically suggest a 'quick chat over coffee' at the specific venue mentioned."}
                ],
                temperature=temperature_selection.get(category_for_model, 1.0),
                max_tokens=1500,  # Larger token limit for more creative space
                frequency_penalty=0.7 + (microsecond % 30) / 100,  # 0.7-0.99 range
                presence_penalty=0.7 + (microsecond % 30) / 100   # 0.7-0.99 range
            )
            
            # Extract the response text
            result_text = response.choices[0].message.content.strip()
            
            # Try to parse JSON from the response
            try:
                # Find JSON in the response
                json_start = result_text.find("{")
                json_end = result_text.rfind("}") + 1
                
                if json_start >= 0 and json_end > json_start:
                    json_str = result_text[json_start:json_end]
                    result = json.loads(json_str)
                else:
                    # No JSON found, create structured response manually
                    logger.warning("No JSON found in LLM response, parsing manually")
                    parts = result_text.split("\n\n")
                    subject = next((p for p in parts if p.startswith("Subject:") or p.lower().startswith("subject:")), "")
                    body = "\n\n".join(p for p in parts if not (p.startswith("Subject:") or p.lower().startswith("subject:")))
                    
                    result = {
                        "subject": subject.replace("Subject:", "").strip(),
                        "intro": "",
                        "body": body.strip(),
                        "cta": ""
                    }
                
                # Combine parts for the final template
                subject = result.get("subject", f"Neutrino: {scenario.capitalize()} for {category}")
                
                # Assemble the full body
                body_parts = []
                if result.get("intro"):
                    body_parts.append(result["intro"])
                if result.get("body"):
                    body_parts.append(result["body"])
                if result.get("cta"):
                    body_parts.append(result["cta"])
                
                body = "\n\n".join(body_parts)
                
                return {
                    "subject": subject,
                    "body": body
                }
            
            except Exception as json_error:
                logger.error(f"Failed to parse JSON from LLM response: {str(json_error)}")
                # Fall back to simple parsing
                parts = result_text.split("\n\n")
                subject = next((p for p in parts if p.startswith("Subject:") or p.lower().startswith("subject:")), "")
                body = "\n\n".join(p for p in parts if not (p.startswith("Subject:") or p.lower().startswith("subject:")))
                
                return {
                    "subject": subject.replace("Subject:", "").strip(),
                    "body": body.strip()
                }
                
        except Exception as e:
            logger.error(f"Error generating template for category {category}: {str(e)}")
            raise
            
    def personalize_template(self, template: Dict[str, str], contact_data: Dict[str, str]) -> Dict[str, str]:
        """
        Personalize an email template with contact data.
        
        Args:
            template: Dictionary with subject and body
            contact_data: Dictionary with contact data for personalization
            
        Returns:
            Dictionary with personalized subject and body
        """
        logger.info(f"Personalizing template with contact data: {contact_data}")
        
        # Make copies to avoid modifying the originals
        personalized_subject = template["subject"]
        personalized_body = template["body"]
        
        # Replace placeholders in subject and body
        for key, value in contact_data.items():
            placeholder = "{{" + key + "}}"
            personalized_subject = personalized_subject.replace(placeholder, str(value))
            personalized_body = personalized_body.replace(placeholder, str(value))
        
        # Ensure HTML formatting is preserved
        # Make sure <b> tags are properly closed
        if "<b>" in personalized_body and "</b>" not in personalized_body:
            personalized_body = personalized_body.replace("<b>", "<b>").replace("</b>", "</b>")
            
        # Make sure <ul> and <li> tags are properly closed
        if "<ul>" in personalized_body and "</ul>" not in personalized_body:
            personalized_body = personalized_body.replace("<ul>", "<ul>").replace("</ul>", "</ul>")
        if "<li>" in personalized_body and "</li>" not in personalized_body:
            personalized_body = personalized_body.replace("<li>", "<li>").replace("</li>", "</li>")
            
        # Log the personalized template
        logger.info(f"Personalized subject: {personalized_subject}")
        logger.info(f"Personalized body (first 100 chars): {personalized_body[:100]}...")
        
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
    """
    Generate templates for all categories in a campaign.
    
    Args:
        db_session: SQLAlchemy database session
        campaign_id: Campaign ID
        categories: List of categories to generate templates for
        scenario: Campaign scenario
        models: SQLAlchemy models module
        
    Returns:
        Dictionary mapping categories to templates
    """
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
