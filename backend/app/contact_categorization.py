"""
Contact categorization module for the Neutrino Email Automation System.
Provides functions to categorize contacts based on their designation/role.
"""
import logging
import re
from typing import Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# Define contact categories
CONTACT_CATEGORIES = {
    "clinical": "Clinical / Pharmacy",
    "it": "IT / Technology",
    "rd": "R&D / Data",
    "operations": "Operations",
    "sales": "Sales / Partnerships",
    "executive": "Executive",
    "other": "Other"
}

# Category-based keyword mappings
CATEGORY_KEYWORDS = {
    "clinical": [
        "clinical", "pharmacy", "pharmacist", "pharmaceutical", "medical", "healthcare",
        "health", "doctor", "physician", "nurse", "practitioner", "patient", "care",
        "therapeutic", "medicine", "pharm", "drug", "treatment", "hospital", "clinic"
    ],
    "it": [
        "it", "technology", "tech", "information", "software", "developer", "engineer",
        "programming", "system", "infrastructure", "network", "data", "database",
        "security", "cloud", "devops", "solution", "architecture", "digital", "web",
        "application", "app", "mobile", "cyber"
    ],
    "rd": [
        "research", "development", "r&d", "scientist", "data scientist", "analyst",
        "analytics", "machine learning", "ml", "ai", "artificial intelligence",
        "statistics", "statistical", "insight", "mining", "modeling", "innovation",
        "discovery", "lab", "experiment", "testing"
    ],
    "operations": [
        "operations", "operational", "ops", "process", "procedure", "logistics",
        "supply chain", "production", "manufacturing", "quality", "compliance",
        "regulatory", "administration", "admin", "facility", "maintenance", "service",
        "support", "management"
    ],
    "sales": [
        "sales", "marketing", "business development", "partnership", "alliance",
        "account", "client", "customer", "revenue", "growth", "market", "commercial",
        "relationship", "strategic", "brand", "promotion", "advertising", "channel",
        "distribution", "retail"
    ],
    "executive": [
        "chief", "ceo", "cfo", "cio", "cto", "coo", "cmo", "president", "vp",
        "vice president", "director", "executive", "head", "lead", "leader", "founder",
        "owner", "partner", "principal", "chairman", "chairwoman", "chairperson",
        "board", "senior"
    ]
}

# Title-based direct mappings, ordered by specificity (more specific matches first)
TITLE_MAPPINGS = {
    # Clinical specific roles
    "clinical director": "clinical",
    "medical director": "clinical",
    "pharmacy director": "clinical",
    "director of pharmacy": "clinical",
    "director of clinical": "clinical",
    "pharmacist": "clinical",
    "physician": "clinical",
    "doctor": "clinical",
    "nurse": "clinical",
    "healthcare": "clinical",
    "medical": "clinical",
    "health": "clinical",
    "patient": "clinical",
    "therapeutic": "clinical",
    "medicine": "clinical",
    
    # IT specific roles
    "it director": "it",
    "technology director": "it",
    "director of it": "it",
    "director of technology": "it",
    "developer": "it",
    "software engineer": "it",
    "web developer": "it",
    "systems administrator": "it",
    "network": "it",
    "database administrator": "it",
    "security": "it",
    "cloud": "it",
    "devops": "it",
    
    # R&D specific roles
    "research director": "rd",
    "r&d director": "rd",
    "data director": "rd",
    "director of research": "rd",
    "research scientist": "rd",
    "data scientist": "rd",
    "machine learning": "rd",
    "ai engineer": "rd",
    "research": "rd",
    "scientist": "rd",
    "analyst": "rd",
    "analytics": "rd",
    "innovation": "rd",
    
    # Operations specific roles
    "operations director": "operations",
    "director of operations": "operations",
    "logistics director": "operations",
    "supply chain director": "operations",
    "operations manager": "operations",
    "process manager": "operations",
    "logistics coordinator": "operations",
    "supply chain": "operations",
    "operations": "operations",
    "logistics": "operations",
    "process": "operations",
    "admin": "operations",
    
    # Sales specific roles
    "sales director": "sales",
    "marketing director": "sales",
    "director of sales": "sales",
    "director of marketing": "sales",
    "business development": "sales",
    "account manager": "sales",
    "sales manager": "sales",
    "marketing manager": "sales",
    "partnership": "sales",
    "sales": "sales",
    "account": "sales",
    "marketing": "sales",
    
    # Executive roles (only match these if no functional area matched)
    "ceo": "executive",
    "cfo": "executive",
    "cio": "executive",
    "cto": "executive",
    "coo": "executive",
    "cmo": "executive",
    "chief executive": "executive",
    "chief financial": "executive",
    "chief operating": "executive",
    "chief information": "executive",
    "chief technology": "executive",
    "chief marketing": "executive",
    "chief commercial": "executive",
    "chief people": "executive",
    "chief human resources": "executive",
    "president": "executive",
    "vice president": "executive",
    "vp,": "executive",
    "vp ": "executive",
    "founder": "executive",
    "owner": "executive",
    "chairman": "executive",
    "chairwoman": "executive",
    "chairperson": "executive",
    
    # General director (match last)
    "director": "executive",
    "head of": "executive"
}

def categorize_designation(designation: str) -> str:
    """
    Categorize a contact's designation/title into one of the predefined categories.
    Uses rule-based pattern matching on the designation text.
    
    Args:
        designation: The contact's job title or designation
        
    Returns:
        The category ID (one of the keys in CONTACT_CATEGORIES)
    """
    if not designation or not isinstance(designation, str):
        logger.warning(f"Invalid designation: {designation}")
        return "other"
    
    # Normalize the designation (lowercase, remove extra spaces)
    normalized = designation.lower().strip()
    
    # Implement a more sophisticated title matching logic
    # First, look for exact matches or specific functional area patterns
    for title, category in TITLE_MAPPINGS.items():
        if title in normalized:
            # Check if this is a more specific match (contains department name)
            # For example, "Director of Pharmacy" should match "pharmacy" first rather than just "director"
            if (title.startswith("director of") or
                title.endswith("director") or
                "manager" in title or
                title.startswith("chief")):
                logger.debug(f"Categorized '{designation}' as {CONTACT_CATEGORIES[category]} by specific title mapping")
                return category
    
    # If no specific matches, try generic title matches
    for title, category in TITLE_MAPPINGS.items():
        if title in normalized:
            logger.debug(f"Categorized '{designation}' as {CONTACT_CATEGORIES[category]} by general title mapping")
            return category
    
    # If no direct title matches, try keyword matching with weighted scoring
    category_scores = {cat: 0 for cat in CATEGORY_KEYWORDS.keys()}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        # Give more weight to longer keyword matches
        for keyword in keywords:
            if keyword in normalized:
                # More weight to longer and more specific keywords
                weight = len(keyword) / 5  # Normalize by dividing by 5
                category_scores[category] += weight
    
    # Find the category with highest score
    best_category = "other"
    best_score = 0
    
    for category, score in category_scores.items():
        if score > best_score:
            best_score = score
            best_category = category
    
    # Return the category with the highest score if there is a meaningful match
    if best_score > 0:
        logger.debug(f"Categorized '{designation}' as {CONTACT_CATEGORIES[best_category]} with score {best_score}")
        return best_category
    
    # Default to other if no matches found
    logger.debug(f"Categorized '{designation}' as {CONTACT_CATEGORIES['other']} (no matches)")
    return "other"

def categorize_contacts_from_dataframe(df, designation_column="Designation"):
    """
    Categorize contacts from a pandas DataFrame with a designation column.
    
    Args:
        df: Pandas DataFrame containing contact information
        designation_column: Name of the column containing designations
        
    Returns:
        DataFrame with an additional 'Category' column
    """
    if designation_column not in df.columns:
        logger.error(f"Designation column '{designation_column}' not found in dataframe")
        raise ValueError(f"Designation column '{designation_column}' not found in dataframe")
    
    # Apply categorization function to each row
    df["Category"] = df[designation_column].apply(categorize_designation)
    
    # Log category distribution
    category_counts = df["Category"].value_counts()
    logger.info(f"Categorized {len(df)} contacts: {category_counts.to_dict()}")
    
    return df

def get_category_distribution(df, category_column="Category"):
    """
    Get the distribution of contacts across categories.
    
    Args:
        df: Pandas DataFrame containing categorized contacts
        category_column: Name of the column containing categories
        
    Returns:
        Dictionary with category counts and percentages
    """
    if category_column not in df.columns:
        logger.error(f"Category column '{category_column}' not found in dataframe")
        raise ValueError(f"Category column '{category_column}' not found in dataframe")
    
    # Get counts and percentages
    counts = df[category_column].value_counts()
    total = len(df)
    percentages = (counts / total * 100).round(1)
    
    # Combine into a dictionary
    distribution = {
        "total_contacts": total,
        "categories": {
            category: {
                "count": int(counts.get(category, 0)),
                "percentage": float(percentages.get(category, 0))
            }
            for category in CONTACT_CATEGORIES.values()
        }
    }
    
    return distribution