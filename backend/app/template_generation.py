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

    def _normalize_category_key(self, category: Optional[str]) -> str:
        """Map various category labels to a canonical key used for role logic."""
        if not category:
            return "other"
        c = str(category).strip().lower()
        # Direct matches
        if c in {"it", "clinical", "operations", "sales", "executive", "rd", "research", "other"}:
            return "rd" if c == "research" else c
        # Substring heuristics
        if "it" in c or "technolog" in c or "cio" in c or "cto" in c:
            return "it"
        if "clinic" in c or "pharm" in c or "care" in c or "patient" in c:
            return "clinical"
        if "research" in c or "r&d" in c or "data" in c or "analytics" in c:
            return "rd"
        if "operation" in c or "process" in c or "program" in c or "project" in c:
            return "operations"
        if "sale" in c or "partner" in c or "bd" in c or "business development" in c:
            return "sales"
        if "executive" in c or "vp" in c or "chief" in c or "director" in c or "cxo" in c:
            return "executive"
        return "other"
    
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
                model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                logger.info(f"Using OpenAI model: {model_name}")
                response = client.completions.create(
                    model=model_name,
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
        additional_context: Optional[Dict[str, Any]] = None,
        campaign_description: Optional[str] = None
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
        
        # If LLM is not available, build a scenario-aware fallback using samples
        if not self.use_llm:
            is_conference = scenario_str == "conference"
            # Derive a concise, service-forward subject
            role_service_subjects = {
                "it": "{{first_name}}, streamline integrations + data security at {{company_name}}",
                "clinical": "{{first_name}}, reduce admin load and boost patient outcomes",
                "rd": "{{first_name}}, accelerate analytics & insights at {{company_name}}",
                "operations": "{{first_name}}, automate workflows across {{company_name}}",
                "sales": "{{first_name}}, faster HLS deal cycles with automation",
                "executive": "{{first_name}}, measurable ROI from HLS workflow automation",
                "other": "{{first_name}}, pragmatic automation for {{company_name}}"
            }
            category_key = self._normalize_category_key(category)
            base_subject = role_service_subjects.get(category_key, role_service_subjects["other"]) 
            if is_conference:
                subject = base_subject.replace("{{first_name}}", "{{first_name}}")
            else:
                subject = base_subject

            # Try to extract a venue or meeting location from additional_context
            venue_text = ""
            if additional_context:
                venue_text = additional_context.get("venue") or additional_context.get("meeting_location") or ""

            # Lightly use the sample email to guide tone without copying
            sample_hint = ""
            if sample_email:
                # Take the first sentence as a tone hint but do not reuse greetings
                sentences = re.split(r"(?<=[.!?])\s+", sample_email)
                hint = sentences[0].strip() if sentences else ""
                # Strip greeting-like starts (Hi/Hello/Dear ...)
                if re.match(r"^(hi|hello|dear)\b", hint.strip().lower()):
                    hint = ""
                # Remove placeholder-like braces to avoid leakage
                hint = re.sub(r"\{\{[^}]+\}\}", "", hint)
                # Only use if it's substantial content (not just greetings)
                if len(hint.strip()) > 10:
                    sample_hint = hint[:140]

            # Compose a short, natural email ~120–180 words
            # Role-based problem statements
            role_challenges = {
                "it": "connect siloed systems, harden data flows, and reduce manual handoffs",
                "clinical": "cut admin overhead so clinicians focus on care, not clicks",
                "rd": "speed up data prep and model iteration without sacrificing quality",
                "operations": "remove swivel‑chair tasks and standardize processes end‑to‑end",
                "sales": "shorten review cycles with clean data and timely stakeholder views",
                "executive": "capture measurable ROI with visibility across care and ops",
                "other": "remove repetitive work and surface insights where decisions happen"
            }
            challenge_line = role_challenges.get(category_key, role_challenges["other"]) 

            if is_conference:
                meetup_line = f"If you have a few minutes at <b>{venue_text}</b>, I’d love to say hello over coffee." if venue_text else "If you’ll be on‑site, we could say hello over a quick coffee."
                cta = "Would a 10–15 minute coffee chat on one of the event days work for you?"
            else:
                meetup_line = ""
                cta = "Would you be open to a 15‑minute call later this week?"

            # Service bullets (kept concise and natural)
            service_bullets = [
                "Integrate EHR, CRM, and analytics for clean data flow",
                "Automate routine steps with human‑in‑the‑loop controls",
                "Surface role‑based insights for faster decisions",
                "Measure impact with clear, executive‑ready reporting"
            ]

            body_parts = [
                f"<p>Hi {{{{first_name}}}},</p>",
                f"<p>{sample_hint}</p>" if sample_hint else "",
                f"<p>We help healthcare teams like {{{{company_name}}}} {challenge_line}—without adding complexity.</p>",
                "<ul>",
                *[f"<li>{bullet}</li>" for bullet in service_bullets],
                "</ul>",
                f"<p>{meetup_line}</p>" if meetup_line else "",
                f"<p><b>{cta}</b></p>",
                "<p>Best regards,<br/>Bella Taylor<br/>Senior Client Partner<br/>Neutrino Tech Systems</p>"
            ]

            # Join and trim extra whitespace
            body = "".join([part for part in body_parts if part])

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
        
        # Add campaign description if available
        if campaign_description:
            prompt += f"\n\nCAMPAIGN DESCRIPTION:\n{campaign_description}\n\nIncorporate the context from this campaign description into the email. Make sure the email content aligns with the campaign objectives described above."
        
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
            model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
            logger.info(f"Using OpenAI model: {model_name}")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are Bella Taylor, Senior Client Partner at Neutrino Tech Systems. Write a completely human, personalized email. Use <b>bold</b> for important terms."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            # Extract the response content
            response_content = response.choices[0].message.content.strip()
            
            # Parse the new format (Subject line followed by email body)
            try:
                # Look for subject line at the beginning
                subject_match = re.search(r'(?i)^Subject:?\s*(.+?)(?:\n|$)', response_content)
                if subject_match:
                    personalized_subject = subject_match.group(1).strip()
                    
                    # Extract everything after the subject line as the body
                    subject_end = subject_match.end()
                    personalized_body = response_content[subject_end:].strip()
                    
                    # If successful, return the parsed content
                    if personalized_subject and personalized_body:
                        return {
                            "subject": personalized_subject,
                            "body": personalized_body
                        }
                
                # If we couldn't parse the subject/body format, try JSON as fallback
                if response_content.strip().startswith('{') and response_content.strip().endswith('}'):
                    try:
                        response_json = json.loads(response_content)
                        personalized_subject = response_json.get("subject", "")
                        
                        # If JSON has intro/body/cta fields, combine them
                        if "intro" in response_json and "body" in response_json:
                            intro = response_json.get("intro", "")
                            body = response_json.get("body", "")
                            cta = response_json.get("cta", "")
                            
                            # Combine into a clean email format
                            personalized_body = f"{intro}\n\n{body}\n\n{cta}"
                        else:
                            personalized_body = response_json.get("body", "")
                        
                        # If either is empty, fall back to text parsing
                        if not personalized_subject or not personalized_body:
                            raise ValueError("JSON response missing required fields")
                        
                        return {
                            "subject": personalized_subject,
                            "body": personalized_body
                        }
                    except Exception as e:
                        logger.warning(f"Failed to parse response as JSON: {str(e)}")
            except Exception as e:
                logger.warning(f"Failed to parse response format: {str(e)}")
                
                # Fall back to text parsing
                # Look for subject line
                subject_match = re.search(r'(?i)Subject:?\s*(.+?)(?:\n|$)', response_content)
                if subject_match:
                    personalized_subject = subject_match.group(1).strip()
                else:
                    # Extract first line as subject if no explicit subject
                    lines = response_content.split('\n')
                    first_line = lines[0].strip()
                    
                    # Check if first line looks like a greeting (Hi, Hello, etc.) or contains placeholders
                    if re.match(r'^(Hi|Hello|Dear|Hey)\s+', first_line) or '{{' in first_line:
                        # If first line is a greeting or has placeholders, generate a subject using LLM
                        try:
                            # Create a subject generation prompt
                            subject_prompt = f"""
                            Generate a concise, engaging email subject line (max 10 words) for an email with this content:
                            
                            {response_content[:500]}...
                            
                            The subject should be business-appropriate, directly related to the content, and not include
                            any prefixes like 'Subject:' or 'Re:'. Just output the subject line text.
                            """
                            
                            # Call OpenAI API for subject generation
                            model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                            logger.info(f"Using OpenAI model: {model_name}")
                            subject_response = client.chat.completions.create(
                                model=model_name,
                                messages=[
                                    {"role": "system", "content": "You generate concise, effective email subject lines."},
                                    {"role": "user", "content": subject_prompt}
                                ],
                                temperature=0.7,
                                max_tokens=50
                            )
                            
                            # Extract the subject from the response
                            generated_subject = subject_response.choices[0].message.content.strip()
                            
                            # Remove any "Subject:" prefix if the model accidentally included it
                            generated_subject = re.sub(r'^(?i)Subject:\s*', '', generated_subject)
                            
                            # Use the generated subject
                            personalized_subject = generated_subject
                            
                            logger.info(f"Generated subject via LLM: {personalized_subject}")
                            
                        except Exception as e:
                            logger.warning(f"Failed to generate subject with LLM: {str(e)}")
                            
                            # Extract key topics from the email content to use in subject
                            # This is a non-hardcoded approach that adapts to the actual content
                            topics = []
                            content_sample = response_content[:1000].lower()
                            
                            # Check for common business themes in the content
                            if "automation" in content_sample:
                                topics.append("Automation")
                            if "ai" in content_sample or "artificial intelligence" in content_sample:
                                topics.append("AI")
                            if "data" in content_sample:
                                topics.append("Data")
                            if "healthcare" in content_sample:
                                topics.append("Healthcare")
                            if "pharma" in content_sample:
                                topics.append("Pharma")
                            if "patient" in content_sample:
                                topics.append("Patient Care")
                            if "innovation" in content_sample:
                                topics.append("Innovation")
                            
                            # Use the identified topics to create a subject
                            if topics:
                                # Take up to 3 topics for the subject
                                topic_text = " & ".join(topics[:3])
                                personalized_subject = f"{topic_text} Solutions for Your Business"
                            else:
                                # Very generic fallback with no hardcoded specifics
                                personalized_subject = "Neutrino Business Solutions"
                    else:
                        # Use first line as subject
                        personalized_subject = first_line
                
                # Extract body (everything after subject or greeting)
                subject_match = re.search(r'(?i)Subject:?\s*(.+?)(?:\n|$)', response_content)
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
            # Robust fallback mirrors the no‑LLM branch above
            is_conference = (str(scenario).lower() if scenario else "") in ["conference", "in person", "in-person"]
            subject = ("{{first_name}}, quick coffee at the event?" if is_conference else "{{first_name}}, a quick idea for {{company_name}}")
            venue_text = ""
            if isinstance(additional_context, dict):
                venue_text = additional_context.get("venue") or additional_context.get("meeting_location") or ""
            if is_conference:
                meetup_line = f"If you have a few minutes at <b>{venue_text}</b>, I’d love to say hello over coffee." if venue_text else "If you’ll be on-site, we could say hello over a quick coffee."
                cta = "Would a 10–15 minute coffee chat on one of the event days work for you?"
            else:
                meetup_line = ""
                cta = "Would you be open to a 15‑minute call later this week?"
            bullets_html = (
                "<ul>"
                "<li>Integrate EHR, CRM, and analytics for clean data flow</li>"
                "<li>Automate routine steps with human‑in‑the‑loop controls</li>"
                "<li>Surface role‑based insights for faster decisions</li>"
                "<li>Measure impact with clear, executive‑ready reporting</li>"
                "</ul>"
            )
            body = (
                "<p>Hi {{first_name}},</p>"
                "<p>We help healthcare teams like {{company_name}} remove repetitive work and surface insights where decisions happen—without adding complexity.</p>"
                + bullets_html
                + (f"<p>{meetup_line}</p>" if meetup_line else "")
                + f"<p><b>{cta}</b></p>"
                + "<p>Best regards,<br/>Bella Taylor<br/>Senior Client Partner<br/>Neutrino Tech Systems</p>"
            )
            return {"subject": subject, "body": body}
    
    def personalize_template(self, template: Dict[str, str], contact_data: Dict[str, str]) -> Dict[str, str]:
        """
        Personalize an email template by replacing placeholders with contact data.
        
        Args:
            template: Dictionary with subject and body
            contact_data: Dictionary with contact data (first_name, company_name, etc.)
            
        Returns:
            Dictionary with personalized subject and body
        """
        logger.info(f"Personalizing template with contact data")
        
        # Use the centralized placeholder processing module
        from .email_placeholders import process_placeholders
        
        # Process placeholders in both subject and body
        personalized_subject = process_placeholders(template["subject"], contact_data)
        personalized_body = process_placeholders(template["body"], contact_data)

        # Ensure subject showcases services and company when available
        company_name = (contact_data.get("company_name") or contact_data.get("company") or "").strip()
        if company_name and company_name.lower() not in personalized_subject.lower():
            # Append concise service tag if not already present
            service_tag = " — workflow automation & analytics"
            if len(personalized_subject) < 70:
                personalized_subject = f"{personalized_subject} · {company_name}"
            else:
                personalized_subject = f"{personalized_subject}{service_tag}"

        # Remove duplicate greetings like multiple "Hi FirstName" lines
        # Keep the first greeting paragraph and strip subsequent greeting lines
        def strip_duplicate_greetings(html_text: str) -> str:
            # Normalize spacing
            text = html_text
            # Pattern to find greeting paragraphs
            greeting_regex = re.compile(r"(<p>\s*(Hi|Hello|Dear)\b[^<]*</p>)", re.IGNORECASE)
            matches = list(greeting_regex.finditer(text))
            if len(matches) <= 1:
                return text
            # Keep the first, remove the rest
            keep_start, keep_end = matches[0].span()
            cleaned = text[:keep_end]
            cursor = keep_end
            for m in matches[1:]:
                s, e = m.span()
                cleaned += text[cursor:s]
                cursor = e
            cleaned += text[cursor:]
            return cleaned

        personalized_body = strip_duplicate_greetings(personalized_body)

        # Inject designation/role-based challenge line if helpful and not already present
        designation = (contact_data.get("designation") or contact_data.get("job_title") or "").lower()
        role_hint = None
        role_map = [
            ("chief|vp|director|strategy|executive|cxo", "capture measurable ROI with visibility across clinical and operations."),
            ("it|architect|engineer|data|cio|cto|technology", "connect siloed systems, secure data flows, and reduce manual handoffs."),
            ("clinical|pharmacy|care|nurse|md|doctor", "cut admin overhead so clinicians focus on care, not clicks."),
            ("research|r&d|scientist|analytics|biostat", "speed up data prep and analysis while maintaining quality."),
            ("operations|ops|process|program|project", "remove swivel‑chair tasks and standardize processes end‑to‑end."),
            ("sales|partnership|bd|business development|marketing", "shorten review cycles with clean data and timely stakeholder views.")
        ]
        for pattern, line in role_map:
            if designation and re.search(pattern, designation):
                role_hint = line
                break
        # Insert after the first paragraph if not already present
        if role_hint and role_hint.lower() not in personalized_body.lower():
            insertion = f"<p>Specifically for your role, we help teams {role_hint}</p>"
            # Find end of first paragraph
            first_p_end = personalized_body.lower().find("</p>")
            if first_p_end != -1:
                personalized_body = personalized_body[:first_p_end+4] + insertion + personalized_body[first_p_end+4:]
            else:
                personalized_body = insertion + personalized_body
        
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
