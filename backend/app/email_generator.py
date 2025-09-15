"""
Email generator module for the Neutrino Email Automation System.
Handles generation of realistic business email addresses using OpenAI.
"""
import logging
import os
import re
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path('/app/.env')
load_dotenv(dotenv_path=env_path)

# Import OpenAI
try:
    import openai
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logging.warning("OpenAI package not installed. Advanced email generation will be disabled.")

logger = logging.getLogger(__name__)

class EmailGenerator:
    """
    Handles generation of realistic business email addresses using OpenAI.
    """
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the email generator.
        
        Args:
            openai_api_key: OpenAI API key for LLM-based generation
        """
        # Get API key from parameter or environment
        self.openai_api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
        logger.info(f"OpenAI API key from environment: {'Found' if os.environ.get('OPENAI_API_KEY') else 'Not found'}")
        
        # Default to fallback mode
        self.use_llm = False
        self.client = None
        
        # Check if we can use LLM
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI package not installed. Using fallback email generation.")
        elif not self.openai_api_key:
            logger.warning("No OpenAI API key provided. Using fallback email generation.")
        else:
            try:
                # Initialize the OpenAI client
                self.client = OpenAI(api_key=self.openai_api_key)
                self.use_llm = True
                logger.info(f"LLM-based email generation enabled with API key: {self.openai_api_key[:5]}...")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {str(e)}")

    def generate_business_email(self, name: str, job_title: Optional[str] = None, 
                               company: Optional[str] = None) -> str:
        """
        Generate a realistic business email for a contact.
        
        Args:
            name: Full name of the contact
            job_title: Job title or designation (optional)
            company: Company name (optional)
            
        Returns:
            Generated business email address
        """
        # If we can't use LLM or API isn't available, fall back to simple pattern-based generation
        if not self.use_llm or not self.client:
            logger.info(f"Using fallback email generation for {name}")
            return self._generate_fallback_email(name, company)
        
        try:
            # Split name into parts
            name_parts = name.split()
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[-1] if len(name_parts) > 1 else ""
            
            # Create a structured prompt similar to the email content prompts
            prompt = f"""
            Contact Info:
            - Full Name: {name}
            - Job Title: {job_title or "Unknown"}
            - Company: {company or "Unknown"}
            
            Instructions:
            - Generate a realistic business email address for this professional.
            - Follow standard business email conventions (firstname.lastname@company.com, etc.)
            - If company is unknown, use a professional domain (example.com, gmail.com, etc.)
            - Email must be lowercase, without spaces, and follow valid email format.
            - Output ONLY the email address with no additional text.
            """
            
            # Call OpenAI API using the client format
            try:
                model_name = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                logger.info(f"Using OpenAI model: {model_name}")
                response = self.client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": "You are an expert at generating realistic business email addresses based on professional naming conventions."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=60
                )
                logger.info("Successfully called OpenAI API for email generation")
            except Exception as e:
                logger.error(f"OpenAI API call failed: {str(e)}")
                return self._generate_fallback_email(name, company)
            
            # Extract the response text using the new response format
            email = response.choices[0].message.content.strip().lower()
            logger.info(f"Raw OpenAI response received: {email}")
            
            # Validate the email format
            if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                logger.warning(f"Generated email '{email}' failed validation, using fallback")
                return self._generate_fallback_email(name, company)
            
            logger.info(f"Generated business email for {name}: {email}")
            return email
            
        except Exception as e:
            logger.error(f"Error generating business email: {str(e)}")
            return self._generate_fallback_email(name, company)
    
    def _generate_fallback_email(self, name: str, company: Optional[str] = None) -> str:
        """
        Generate a fallback email when LLM is not available.
        
        Args:
            name: Full name of the contact
            company: Company name (optional)
            
        Returns:
            Generated fallback email address
        """
        # Clean the name and create a simple email format
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
        
        logger.info(f"Generated fallback email for {name}: {email}")
        return email