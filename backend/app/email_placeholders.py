"""
Email placeholder processing module for the Neutrino Email Automation System.
Handles replacement of placeholders in email templates with contact data.
"""
import logging
import re
from typing import Dict, Any, Optional, Union

logger = logging.getLogger(__name__)

def process_placeholders(text: str, contact: Union[Dict[str, Any], 'models.Contact'], fallback_values: Optional[Dict[str, str]] = None) -> str:
    """
    Replace all placeholders in text with corresponding values from contact data.
    
    Supports placeholders in formats:
    - {name}  (single curly braces format)
    - {{name}} (double curly braces format)
    
    Args:
        text: Text containing placeholders
        contact: Either a Contact model instance or a dictionary with contact data
        fallback_values: Dictionary of fallback values for missing data
            
    Returns:
        Text with all placeholders replaced
    """
    if not text:
        return text
    
    # Log the original text for debugging
    logger.debug(f"Original text for placeholder processing: {text[:100]}...")
    logger.debug(f"Contains single-brace placeholders: {'{{' in text and '}' in text}")
    logger.debug(f"Contains double-brace placeholders: {'{{{' in text and '}}}' in text}")
    
    # Convert contact model to dictionary if needed
    contact_data = {}
    if hasattr(contact, '__dict__'):
        # It's a model instance
        contact_data = {
            "name": getattr(contact, "name", ""),
            "email": getattr(contact, "email", ""),
            "company": getattr(contact, "company", ""),
            "designation": getattr(contact, "designation", ""),
            "industry": getattr(contact, "industry", ""),
            "category": getattr(contact, "category", ""),
            "linkedin_url": getattr(contact, "linkedin_url", ""),
            "city": getattr(contact, "poc_city", ""),  # Get from dedicated column
            "state": getattr(contact, "poc_state", ""), # Get from dedicated column
            "POC City": getattr(contact, "poc_city", ""),  # Get from dedicated column
            "POC State": getattr(contact, "poc_state", ""),  # Get from dedicated column
        }
        
        # Preserve HTML line breaks in text content
        # Convert newlines to <br> if the content doesn't already have HTML tags
        for key in ["name", "company", "designation", "industry", "category"]:
            if contact_data.get(key) and "<" not in contact_data[key] and "\n" in contact_data[key]:
                contact_data[key] = contact_data[key].replace("\n", "<br>")
        
        # Extract extra_data if available
        extra_data = getattr(contact, "extra_data", None)
        if extra_data and isinstance(extra_data, dict):
            for key, value in extra_data.items():
                contact_data[key] = value
                
                # Also add normalized versions of keys for easier access
                clean_key = key.lower().replace(" ", "_")
                if clean_key != key:
                    contact_data[clean_key] = value
    else:
        # It's already a dictionary
        contact_data = contact
        
    # Set default fallback values if not provided
    if fallback_values is None:
        fallback_values = {
            "name": "there",
            "first_name": "there",
            "last_name": "",
            "email": contact_data.get("email", ""),
            "company": "your company",
            "company_name": "your company",
            "designation": "professional",
            "job_title": "professional",
            "industry": "your industry",
            "linkedin": "",
            "category": "",
            "city": "",
            "state": "",
            "POC City": "",
            "POC State": "",
        }
    
    # Log all available contact data for debugging
    logger.debug(f"Contact data for placeholder processing: {contact_data}")
    
    # Extract first and last name from full name if not already present
    if "name" in contact_data and contact_data["name"]:
        name_parts = contact_data["name"].split()
        if name_parts and "first_name" not in contact_data:
            contact_data["first_name"] = name_parts[0]
        if len(name_parts) > 1 and "last_name" not in contact_data:
            contact_data["last_name"] = name_parts[-1]
    
    # If we have a first name, also add it with a capitalized version
    # This handles cases where the template uses {Tiffany} instead of {first_name}
    if "first_name" in contact_data and contact_data["first_name"]:
        first_name = contact_data["first_name"]
        # Add the first name as a capitalized key
        contact_data[first_name] = first_name
        contact_data[first_name.capitalize()] = first_name
    
    # Add LinkedIn URL with different field names for compatibility
    if "linkedin_url" in contact_data and contact_data["linkedin_url"]:
        contact_data["linkedin"] = contact_data["linkedin_url"]
    # Create comprehensive placeholder mapping with fallbacks
    placeholder_map = {}
    
    # Standard placeholders in both formats
    standard_fields = [
        "name", "first_name", "last_name", "email",
        "company", "company_name", "designation", "job_title",
        "industry", "category", "linkedin", "city", "state",
        "POC City", "POC State"  # Add common Excel column headers
    ]
    
    # Add special case for first name (direct name reference)
    if "first_name" in contact_data and contact_data["first_name"]:
        first_name = contact_data["first_name"]
        placeholder_map[f"{{{first_name}}}"] = first_name
        placeholder_map[f"{{{first_name.capitalize()}}}"] = first_name
        placeholder_map[f"{{{{{first_name}}}}}"] = first_name
        placeholder_map[f"{{{{{first_name.capitalize()}}}}}"] = first_name
    
    # Add standard fields in both formats
    for field in standard_fields:
        value = contact_data.get(field, fallback_values.get(field, ""))
        placeholder_map[f"{{{field}}}"] = value
        placeholder_map[f"{{{{{field}}}}}"] = value
        
        # Add special case for "your company" placeholder
        if field in ["company", "company_name"]:
            placeholder_map["{your company}"] = value
            placeholder_map["{{your company}}"] = value
        
        # Add special case for industry placeholder
        if field == "industry":
            placeholder_map["{your industry}"] = value
            placeholder_map["{{your industry}}"] = value
    
    # Add special mappings for common Excel columns
    # Map "POC City" to "city" and vice versa
    if "POC City" in contact_data and contact_data["POC City"]:
        placeholder_map["{city}"] = contact_data["POC City"]
        placeholder_map["{{city}}"] = contact_data["POC City"]
    elif "city" in contact_data and contact_data["city"]:
        placeholder_map["{POC City}"] = contact_data["city"]
        placeholder_map["{{POC City}}"] = contact_data["city"]
        
    # Map "POC State" to "state" and vice versa
    if "POC State" in contact_data and contact_data["POC State"]:
        placeholder_map["{state}"] = contact_data["POC State"]
        placeholder_map["{{state}}"] = contact_data["POC State"]
    elif "state" in contact_data and contact_data["state"]:
        placeholder_map["{POC State}"] = contact_data["state"]
        placeholder_map["{{POC State}}"] = contact_data["state"]
        
    # Check for extra data industry fields with different formats
    industry_fields = ["industry", "Industry", "sector", "Sector", "business_type", "BusinessType"]
    for field in industry_fields:
        if field in contact_data and contact_data[field] and "industry" not in contact_data:
            contact_data["industry"] = contact_data[field]
            placeholder_map["{industry}"] = contact_data[field]
            placeholder_map["{{industry}}"] = contact_data[field]
            placeholder_map["{your industry}"] = contact_data[field]
            placeholder_map["{{your industry}}"] = contact_data[field]
    
    # Replace all placeholders in text
    result = text
    for placeholder, value in placeholder_map.items():
        if value is not None:  # Only replace if we have a value
            result = result.replace(placeholder, str(value))
    
    # Process extra data placeholders with format {extra.field_name} or {field_name}
    # This handles both the explicit extra.field syntax and direct field names from Excel
    for key, value in contact_data.items():
        if key not in standard_fields and value is not None:
            # Handle direct field access (from Excel columns)
            result = result.replace(f"{{{key}}}", str(value))
            result = result.replace(f"{{{{{key}}}}}", str(value))
            
            # Also handle with extra. prefix for consistency
            result = result.replace(f"{{extra.{key}}}", str(value))
            result = result.replace(f"{{{{extra.{key}}}}}", str(value))
            
            # Handle common naming variations (like "POC City" → "city")
            # Try lowercase version without spaces
            clean_key = key.lower().replace(" ", "_")
            result = result.replace(f"{{{clean_key}}}", str(value))
            result = result.replace(f"{{{{{clean_key}}}}}", str(value))
            
            # Handle special cases for common Excel column formats with more variations
            if key.lower() == "poc city" or key.lower() == "city":
                result = result.replace("{city}", str(value))
                result = result.replace("{{city}}", str(value))
                result = result.replace("{POC City}", str(value))
                result = result.replace("{{POC City}}", str(value))
            elif key.lower() == "poc state" or key.lower() == "state":
                result = result.replace("{state}", str(value))
                result = result.replace("{{state}}", str(value))
                result = result.replace("{POC State}", str(value))
                result = result.replace("{{POC State}}", str(value))
            elif key.lower() == "company name" or key.lower() == "company":
                result = result.replace("{company_name}", str(value))
                result = result.replace("{{company_name}}", str(value))
                result = result.replace("{company}", str(value))
                result = result.replace("{{company}}", str(value))
    
    # Log available placeholders and their values for debugging
    placeholder_debug = {key: value for key, value in contact_data.items() if key not in standard_fields}
    if placeholder_debug:
        logger.debug(f"Available extra data placeholders: {placeholder_debug}")
    
    # Check for any remaining placeholders and log them
    # Also look for any remaining industry values with braces
    result = re.sub(r'{([^}]+, [^}]+)}', r'\1', result)
    
    # Check for direct location values used as placeholders (e.g., {Columbus}, {OH})
    # First, get the actual location values
    city_value = contact_data.get("city", contact_data.get("POC City", ""))
    state_value = contact_data.get("state", contact_data.get("POC State", ""))
    
    # If we have values, look for direct references to these values as placeholders
    if city_value:
        result = result.replace(f"{{{city_value}}}", city_value)
    if state_value:
        result = result.replace(f"{{{state_value}}}", state_value)
    
    # Then find any other remaining placeholders
    remaining_placeholders = re.findall(r'{[^}]+}|{{[^}]+}}', result)
    if remaining_placeholders:
        logger.warning(f"Remaining unprocessed placeholders in text: {remaining_placeholders}")
        
        # Try to handle common variations of remaining placeholders
        for placeholder in remaining_placeholders:
            clean_placeholder = placeholder.replace("{", "").replace("}", "")
            
            # Try lowercase version
            lowercase_key = clean_placeholder.lower()
            if lowercase_key in contact_data:
                result = result.replace(placeholder, str(contact_data[lowercase_key]))
                continue
                
            # Try to find any key that might match (case-insensitive)
            for key in contact_data.keys():
                if key.lower() == lowercase_key:
                    result = result.replace(placeholder, str(contact_data[key]))
                    break
                    
            # Handle special cases for common problematic placeholders
            if "company" in clean_placeholder.lower():
                company_value = contact_data.get("company", fallback_values.get("company", "your company"))
                result = result.replace(placeholder, str(company_value))
            elif "industry" in clean_placeholder.lower() or "sector" in clean_placeholder.lower():
                industry_value = contact_data.get("industry", fallback_values.get("industry", "your industry"))
                # Special handling for industry values that might contain curly braces
                if industry_value and ("{" in industry_value or "}" in industry_value):
                    # If the industry value itself contains braces, extract the content
                    industry_match = re.search(r'{([^}]+)}', industry_value)
                    if industry_match:
                        industry_value = industry_match.group(1)
                result = result.replace(placeholder, str(industry_value))
            elif "city" in clean_placeholder.lower():
                city_value = contact_data.get("city", contact_data.get("POC City", ""))
                # If city value is empty, replace the placeholder with an empty string
                if not city_value:
                    result = result.replace(placeholder, "")
                else:
                    result = result.replace(placeholder, str(city_value))
            elif "state" in clean_placeholder.lower():
                state_value = contact_data.get("state", contact_data.get("POC State", ""))
                # If state value is empty, replace the placeholder with an empty string
                if not state_value:
                    result = result.replace(placeholder, "")
                else:
                    result = result.replace(placeholder, str(state_value))
            # Handle specific location names in placeholders (like {Columbus}, {OH})
            elif clean_placeholder in ["Columbus", "OH"] or clean_placeholder in contact_data.values():
                # This handles direct values in placeholders
                result = result.replace(placeholder, clean_placeholder)
        
        # Try one more pass for any missed placeholders
        # Sometimes placeholders are nested or have complex formats
        for placeholder in remaining_placeholders:
            # Strip braces to get the key
            key = placeholder.replace("{", "").replace("}", "")
            if key in contact_data:
                result = result.replace(placeholder, str(contact_data[key]))
            else:
                # For any remaining placeholders like {Columbus} or {OH},
                # assume they are literal values and remove the braces
                result = result.replace(placeholder, key)
    # Final pass: remove any empty location placeholder combinations like "{}, {}"
    result = re.sub(r'{\s*},\s*{\s*}', '', result)
    
    # Clean up phrases with dangling prepositions due to empty locations
    result = re.sub(r'in\s+\.', '.', result)
    result = re.sub(r'in\s+,', 'in', result)
    result = re.sub(r'from\s+\.', '.', result)
    result = re.sub(r'from\s+,', 'from', result)
    result = re.sub(r'at\s+\.', '.', result)
    
    # Remove any remaining placeholders with empty content
    result = re.sub(r'{\s*}', '', result)
    
    return result