"""
Test script to demonstrate job title categorization functionality.
"""
import sys
import os

# Add the backend directory to the Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.append(backend_dir)

# Import the categorization function
from app.contact_categorization import categorize_designation, CONTACT_CATEGORIES

# Sample job titles from different categories to test
test_titles = [
    # Clinical
    "Pharmacist",
    "Clinical Director",
    "Chief Medical Officer",
    "Physician",
    "Nurse Practitioner",
    "Director of Pharmacy",
    
    # IT
    "IT Manager",
    "Chief Technology Officer",
    "Software Engineer",
    "Database Administrator",
    "Systems Architect",
    
    # R&D
    "Research Scientist",
    "Data Scientist",
    "Analytics Director",
    "Machine Learning Engineer",
    "Research & Development Director",
    
    # Operations
    "Operations Manager",
    "VP of Operations",
    "Supply Chain Director",
    "Logistics Coordinator",
    "Process Improvement Manager",
    
    # Sales
    "Sales Director",
    "Account Manager",
    "Business Development Executive",
    "Marketing Manager",
    "Partnership Director",
    
    # Executive
    "Chief Executive Officer",
    "President",
    "Vice President",
    "Founder",
    "Chief Financial Officer",
    
    # Mixed/Ambiguous
    "Director of Digital Transformation",
    "Innovation Lead",
    "Strategic Advisor",
    "Project Manager",
    "Consultant"
]

def main():
    print("=" * 80)
    print("JOB TITLE CATEGORIZATION TEST")
    print("=" * 80)
    print()
    
    results = {}
    for title in test_titles:
        category_id = categorize_designation(title)
        category_name = CONTACT_CATEGORIES[category_id]
        
        if category_id not in results:
            results[category_id] = []
        
        results[category_id].append((title, category_name))
    
    # Print results by category
    for category_id, titles in sorted(results.items()):
        print(f"\n== {category_id.upper()} ({CONTACT_CATEGORIES[category_id]}) ==")
        for title, category_name in titles:
            print(f"  • {title}")
    
    print("\n\nDETAILED RESULTS:")
    print("-" * 80)
    print(f"{'JOB TITLE':<40} {'CATEGORY ID':<15} {'CATEGORY NAME':<25}")
    print("-" * 80)
    
    for title in test_titles:
        category_id = categorize_designation(title)
        category_name = CONTACT_CATEGORIES[category_id]
        print(f"{title:<40} {category_id:<15} {category_name:<25}")

if __name__ == "__main__":
    main()