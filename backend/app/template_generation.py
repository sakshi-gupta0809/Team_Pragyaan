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

# Default email format template
DEFAULT_EMAIL_FORMAT = PROMPTS_DIR / "email_format.md"

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
        
        # Load email format template
        self.email_format_template = self._load_email_format_template()
    
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
    
    def _load_email_format_template(self) -> str:
        """Load the email format template from the prompts directory."""
        try:
            with open(DEFAULT_EMAIL_FORMAT, 'r') as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Failed to load email format template: {str(e)}")
            return """
            Subject: Neutrino Healthcare IT Solutions for {{first_name}} at {{company_name}}

            Hi {{first_name}},

            I hope this email finds you well. I came across {{company_name}} while researching innovative companies in the healthcare space and was impressed by your focus on improving patient outcomes.

            As a {{designation}} at {{company_name}}, I imagine you're constantly looking for ways to optimize your healthcare IT operations while maintaining compliance and enhancing patient care.

            At Neutrino Tech Systems, we specialize in healthcare IT solutions that help organizations like yours streamline operations, improve compliance, and enhance patient engagement. Our specialty pharmacy automation solutions have helped clients reduce turnaround times by up to 40% while maintaining HIPAA compliance.

            Would you be open to a 15-minute call this week to discuss how Neutrino might be able to support {{company_name}}'s healthcare IT initiatives?

            Looking forward to connecting.

            Best regards,
            [Your Name]
            Neutrino Tech Systems
            """
    
    def _load_sample_email(self, scenario: str, step: int) -> str:
        """
        Load a sample email for a specific scenario and step.
        
        Args:
            scenario: The campaign scenario (cold_outreach, conference, etc.)
            step: The email step (1 for initial, 2+ for follow-ups)
            
        Returns:
            Sample email text or fallback template if not found
        """
        # Always return empty - we want the LLM to generate the complete email from scratch
        # without any reference to existing templates
        logger.info(f"Forcing complete email generation from scratch for {scenario} step {step}")
        return ""
    
    def infer_campaign_scenario(self, description: str) -> str:
        """
        Infer the campaign scenario from the description using LLM.
        
        Args:
            description: Campaign description
            
        Returns:
            Inferred scenario (one of CAMPAIGN_SCENARIOS values)
        """
        if not self.use_llm or not description:
            # Default to cold outreach if LLM not available
            logger.info("Using default scenario (cold_outreach)")
            return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
        
        try:
            # Create prompt for scenario inference
            prompt = f"""
            You are an AI assistant that categorizes email campaign descriptions into predefined scenarios.
            Please categorize the following campaign description into one of these scenarios:
            - cold_outreach: Initial contact with potential clients
            - conference: Follow-up after meeting at an event
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
            
            # Validate against known scenarios
            for scenario_value in CAMPAIGN_SCENARIOS.values():
                if scenario_value in result:
                    logger.info(f"Inferred scenario: {scenario_value} from description")
                    return scenario_value
            
            # Default to cold_outreach if no match
            logger.warning(f"Could not infer scenario from description. Using default. LLM response: {result}")
            return CAMPAIGN_SCENARIOS["COLD_OUTREACH"]
            
        except Exception as e:
            logger.error(f"Error inferring campaign scenario: {str(e)}")
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
        # Don't load any sample email - force completely new generation
        sample_email = ""
        
        if not self.use_llm:
            # Use fallback template generation
            return self._generate_fallback_template(category, scenario, step)
            
        # Add randomization based on current time and category
        seed = f"{category}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        
        try:
            # Prepare prompt variables
            day_of_week = datetime.datetime.now().strftime("%A")
            
            # Get placeholder info for the category
            category_info = {
                "Clinical / Pharmacy": {
                    "first_name": "John",
                    "company_name": "MedPharm Solutions",
                    "designation": "Clinical Operations Director",
                    "industry": "Healthcare"
                },
                "IT / Technology": {
                    "first_name": "Sarah",
                    "company_name": "TechSystems Inc",
                    "designation": "IT Director",
                    "industry": "Technology"
                },
                "R&D / Data": {
                    "first_name": "Michael",
                    "company_name": "DataScience Health",
                    "designation": "Research Lead",
                    "industry": "Healthcare Analytics"
                },
                "Operations": {
                    "first_name": "Jennifer",
                    "company_name": "OptiCare Health",
                    "designation": "Operations Manager",
                    "industry": "Healthcare"
                },
                "Sales / Partnerships": {
                    "first_name": "David",
                    "company_name": "HealthPartners Inc",
                    "designation": "Business Development Director",
                    "industry": "Healthcare Services"
                },
                "Executive": {
                    "first_name": "Lisa",
                    "company_name": "ExecHealth Systems",
                    "designation": "Chief Medical Officer",
                    "industry": "Healthcare Technology"
                },
                "Other": {
                    "first_name": "Robert",
                    "company_name": "Innovate Health",
                    "designation": "Program Manager",
                    "industry": "Healthcare"
                }
            }
            
            # Get the right placeholders for the category
            placeholders = category_info.get(category, category_info["Other"])
            
            # Replace placeholders in the prompt template
            prompt = self.email_prompt_template.replace("{{first_name}}", placeholders["first_name"])
            prompt = prompt.replace("{{company_name}}", placeholders["company_name"])
            prompt = prompt.replace("{{designation}}", placeholders["designation"])
            prompt = prompt.replace("{{industry}}", placeholders["industry"])
            prompt = prompt.replace("{{scenario}}", scenario)
            prompt = prompt.replace("{{day_of_week}}", day_of_week)
            prompt = prompt.replace("{{campaign_name}}", f"{category} {scenario.capitalize()}")
            prompt = prompt.replace("{{step}}", str(step))
            prompt = prompt.replace("{{neutrino_summary}}", self.company_summary)
            prompt = prompt.replace("{{sample_email}}", sample_email)
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
            
            # Add strict instructions for email format and uniqueness
            # Add additional requirements to follow specific email format from the template file
            prompt += "\n# ADDITIONAL FORMAT REQUIREMENTS - STRICTLY FOLLOW\n"
            prompt += "Your response MUST follow this exact structure but with unique content:\n"
            prompt += self.email_format_template
            prompt += "7. Create a distinctly different tone and approach for this specific audience\n"
            prompt += "8. Your entire email should be ORIGINAL but MUST follow the format above with placeholders\n"
            
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
            
            # Different system prompts for each category
            system_prompts = {
                "clinical": "You are an expert healthcare copywriter who specializes in clinical communications. Create an email that speaks directly to healthcare professionals with medical terminology and evidence-based language. Never use generic templates or standard openings like 'As a [title]'.",
                "it": "You are a technical copywriter for IT professionals. Write with precision about systems, integrations, and technical benefits. Use IT-specific language and avoid all standard email templates and phrases.",
                "rd": "You are a specialized research communications expert. Your emails focus on data, innovation, and scientific advancement. Craft a message that researchers will find compelling and unique.",
                "operations": "You are an operations efficiency expert who communicates with clear, practical language about process improvements. Create a completely original email focused on operational excellence.",
                "sales": "You are a top sales copywriter who creates high-converting emails without templates. Write with persuasive, results-focused language that stands out from typical sales emails.",
                "executive": "You are an executive communications specialist. Create a strategic, high-level message appropriate for C-suite leaders. Your email must be completely unique in structure and content.",
                "default": "You are a world-class email copywriter who creates completely original B2B emails from scratch. You never use templates or standard structures."
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
            
            # Call OpenAI API with new client interface and category-specific parameters
            client = openai.OpenAI(api_key=self.openai_api_key)
            response = client.chat.completions.create(
                model=model_selection.get(category_for_model, "gpt-4o"),
                messages=[
                    {"role": "system", "content": system_prompts.get(category_for_model, system_prompts["default"])},
                    {"role": "user", "content": f"Create a completely original email for {category} professionals. DO NOT use any standard templates, phrases like 'As a [title]', or formulaic approaches."},
                    {"role": "user", "content": prompt + f"\n\nIMPORTANT: This is email #{microsecond} in sequence {category_for_model}. Make it completely different from any other email."}
                ],
                temperature=temperature_selection.get(category_for_model, 1.0),
                max_tokens=1500,  # Larger token limit for more creative space
                frequency_penalty=0.7 + (microsecond % 30) / 100,  # 0.7-0.99 range
                presence_penalty=0.7 + (microsecond % 30) / 100   # 0.7-0.99 range
            )
            
            # Extract the response JSON (updated for new client interface)
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
            except Exception as json_error:
                logger.error(f"Failed to parse JSON from LLM response: {str(json_error)}")
                # Fall back to simple parsing
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
            
        except Exception as e:
            logger.error(f"Error generating template for category {category}: {str(e)}")
            return self._generate_fallback_template(category, scenario, step)
    
    def _generate_fallback_template(
        self, 
        category: str, 
        scenario: str, 
        step: int = 1
    ) -> Dict[str, str]:
        """
        Generate a fallback template when LLM is not available.
        
        Args:
            category: Contact category
            scenario: Campaign scenario
            step: Email step
            
        Returns:
            Dictionary with subject and body
        """
        # Simple template based on category and scenario
        if step == 1:
            # Initial email
            if scenario == "cold_outreach":
                subject = f"Neutrino's Healthcare IT Solutions for {{{{first_name}}}}'s team at {{{{company_name}}}}"
                body = f"""Hello {{{{first_name}}}},

I noticed that {{{{company_name}}}} is in the {category.lower()} space, and I wanted to reach out about how Neutrino Tech Systems has been helping similar organizations.

{self.company_summary[:200]}...

Would you be open to a quick call this week to discuss how we might be able to help {{{{company_name}}}} with its {category.lower()} needs?

Best regards,
{{{{sender_name}}}}
Neutrino Tech Systems"""
            
            elif scenario == "conference":
                subject = f"Great connecting at {{{{event_name}}}} | Neutrino and {{{{company_name}}}}"
                body = f"""Hello {{{{first_name}}}},

It was great meeting you at {{{{event_name}}}}. I enjoyed our conversation about the challenges in the {category.lower()} space.

At Neutrino, we've been working with several organizations on similar initiatives, and I thought you might be interested in learning more about our approach.

Would you be available for a follow-up discussion next week?

Best regards,
{{{{sender_name}}}}
Neutrino Tech Systems"""
            
            else:
                subject = f"Neutrino Tech Systems: {scenario.capitalize()} for {{{{company_name}}}}"
                body = f"""Hello {{{{first_name}}}},

I'm reaching out regarding {{{{company_name}}}}'s {category.lower()} operations and how Neutrino Tech Systems might be able to help.

{self.company_summary[:200]}...

Would you be interested in learning more?

Best regards,
{{{{sender_name}}}}
Neutrino Tech Systems"""
        
        else:
            # Follow-up email
            subject = f"Following up: Neutrino and {{{{company_name}}}}"
            body = f"""Hello {{{{first_name}}}},

I wanted to follow up on my previous message about Neutrino's solutions for {category.lower()} teams.

We've recently helped several organizations in the healthcare space improve their operations through our specialized IT solutions.

Would you have time for a brief call this week?

Best regards,
{{{{sender_name}}}}
Neutrino Tech Systems"""
        
        return {
            "subject": subject,
            "body": body
        }
    
    def personalize_template(
        self,
        template: Dict[str, str],
        contact_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Personalize a template for a specific contact.
        
        Args:
            template: Template with subject and body
            contact_data: Contact information (name, company, etc.)
            
        Returns:
            Dictionary with personalized subject and body
        """
        subject = template["subject"]
        body = template["body"]
        
        # Replace placeholders with contact data
        for key, value in contact_data.items():
            if value and isinstance(value, str):
                placeholder = "{{" + key + "}}"
                subject = subject.replace(placeholder, value)
                body = body.replace(placeholder, value)
        
        # Handle any remaining placeholders
        import re
        subject = re.sub(r'\{\{[^}]+\}\}', '', subject)
        body = re.sub(r'\{\{[^}]+\}\}', '', body)
        
        return {
            "subject": subject,
            "body": body
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