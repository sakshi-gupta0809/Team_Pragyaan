# Email Placeholders Guide

This document explains how to use placeholders in your email templates for personalization. Placeholders allow you to insert contact-specific information into your email templates, creating personalized messages for each recipient.

## Available Placeholders

The following placeholders are available for use in your email templates:

### Basic Information
- `{name}` - Contact's full name
- `{first_name}` - Contact's first name (extracted from full name)
- `{last_name}` - Contact's last name (extracted from full name)
- `{email}` - Contact's email address

### Professional Information
- `{company}` or `{company_name}` - Contact's company name
- `{designation}` or `{job_title}` - Contact's job title or role
- `{industry}` - Contact's industry
- `{category}` - Contact's category (e.g., Clinical, IT, R&D)
- `{linkedin}` or `{linkedin_url}` - Contact's LinkedIn profile URL
### Location Information
- `{city}` or `{POC City}` - Contact's city
- `{state}` or `{POC State}` - Contact's state

### Excel Column Data
Any column from your uploaded Excel/CSV file can be used as a placeholder:

- Single braces format: `{column_name}` - Example: `{POC City}`
- Double braces format: `{{column_name}}` - Example: `{{POC City}}`
- Original format: Use the exact column name as it appears in Excel - Example: `{POC City}`
- Normalized format: Use lowercase with underscores - Example: `{poc_city}`

Both formats work equally well and are supported by the system. The system will automatically map common variations like:
- `{POC City}` ↔ `{city}` (both directions)
- `{POC State}` ↔ `{state}` (both directions)
- `{Company Name}` ↔ `{company}` ↔ `{company_name}` (all variations)

### Examples of Excel Column Placeholders
- Excel column "POC City" → You can use: `{POC City}`, `{{POC City}}`, `{city}`, or `{{city}}`
- Excel column "Mobile No." → You can use: `{Mobile No.}`, `{{Mobile No.}}`, `{mobile_no}`, or `{{mobile_no}}`
- Excel column "Company Name" → You can use: `{Company Name}`, `{{Company Name}}`, `{company_name}`, or `{{company_name}}`

The system will check both the original column name and normalized versions (lowercase with underscores), so both `{First Name}` and `{first_name}` will work for a column named "First Name" in your Excel file.

## Examples

### Subject Line Examples
```
Follow up from our meeting at {company}
{first_name}, special offer for {company_name}
Invitation to our webinar on solutions for the {industry} industry
```

### Email Body Examples
```
Dear {first_name},

Thank you for your interest in our healthcare solutions for {company}. 
As a {designation} at a leading organization in the {industry} industry,
we believe our platform would be valuable for your team.

Based on your location in {city}, {state}, we'd like to offer you a
personalized demo focusing on regional compliance requirements.

Best regards,
Sales Team
```

### Custom Data Example
If your uploaded Excel file has a column named "Last Interaction Date", you can use:
```
I wanted to follow up on our conversation from {extra.Last Interaction Date}.
```
or simply:
```
I wanted to follow up on our conversation from {Last Interaction Date}.
```

## Notes on Placeholder Formats

- Both single and double curly braces formats are supported: `{name}` and `{{name}}` will both work equally well
- Double braces format is particularly useful when working with data from Excel columns that have spaces or special characters
- If a placeholder value is missing, it will be replaced with a sensible fallback (e.g., "there" for missing first names)
- Placeholder names are case-sensitive in most cases, so it's best to use lowercase versions like `{first_name}` rather than `{First_Name}`
- For Excel column data, both the original column name and normalized versions (lowercase with underscores) are supported

## Best Practices

1. **Test Before Sending**: Always test your templates with sample data before sending to real contacts
2. **Provide Fallbacks**: Ensure your contact data is complete, but write templates that make sense even if some fields are missing
3. **Use Natural Language**: Integrate placeholders naturally into your text so the email flows well regardless of the placeholder content
4. **Check for Remaining Placeholders**: After personalization, verify that no placeholders remain in your email (look for any remaining `{...}` text)

## Formatting in Email Templates

### Line Breaks and Paragraphs

To ensure proper email formatting:

1. **Single Line Break**: Use a regular newline (`\n`) or press Enter once in the template editor
   - This will be rendered as a `<br>` tag in HTML

2. **Paragraph Break**: Use two newlines (press Enter twice)
   - This creates a new paragraph with proper spacing

3. **Lists**: Start lines with bullets (•, *, or -) for automatic list formatting
   - Each bullet point will become a list item in HTML

### HTML Formatting

You can use these basic HTML tags in your templates:

```
<b>Bold text</b>
<i>Italic text</i>
<u>Underlined text</u>
<a href="https://example.com">Link text</a>
```

Note: Any URLs in your template will be automatically converted to clickable links with tracking.

## Troubleshooting
If placeholders aren't being replaced correctly:

1. Verify the spelling and format of your placeholders
2. Check that your contact data contains the necessary fields
3. Review logs for any warnings about unprocessed placeholders
4. If using Excel columns, make sure:
   - Your Excel column names are properly loaded into the contact's extra_data
   - You're using either the exact column name or the normalized version (lowercase with underscores)
   - You're using consistent braces format - either `{column_name}` or `{{column_name}}`
5. For location data like city and state, you can use both `{city}` and `{POC City}` interchangeably

### Debugging Placeholder Issues

If placeholders aren't being replaced, check these common issues:

1. **Excel column headers are different from what you expect**:
   - Use the normalized format like `{city}` instead of `{POC City}` or vice versa
   - Try both formats if one doesn't work

2. **Placeholder format is incorrect**:
   - Make sure braces are properly balanced: `{name}` not `{name`
   - For double braces, ensure both are properly closed: `{{name}}` not `{{name}`

3. **Data is missing**:
   - Ensure the contact has all required data fields
   - For Excel columns, check that they're properly loaded into the contact's extra_data
3. Review logs for any warnings about unprocessed placeholders