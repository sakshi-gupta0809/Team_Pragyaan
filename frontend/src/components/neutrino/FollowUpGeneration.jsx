import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, CheckCircle, Mail, Clock, Users, Sparkles, FileText } from 'lucide-react';

const FollowUpGeneration = ({ 
  campaignData, 
  onNext, 
  onBack, 
  onTemplatesGenerated 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [followUpTemplates, setFollowUpTemplates] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [followUpStep, setFollowUpStep] = useState(2); // Start with step 2 (first follow-up)
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [regenerating, setRegenerating] = useState({});

  // Generate follow-up templates for all categories
  const generateFollowUpTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignData.id}/generate-followups/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          step: followUpStep,
          categories: (campaignData.categories || []).map(cat => cat.id)
        }),
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Failed to generate follow-up templates: ${response.statusText}`);
      }

      const data = await response.json();
      setFollowUpTemplates(data.templates || {});
      // Set first category as selected
      if (campaignData.categories && campaignData.categories.length > 0) {
        const firstCategory = campaignData.categories[0];
        const categoryKey = typeof firstCategory === 'string' ? firstCategory : firstCategory.id || firstCategory.name;
        setSelectedCategory(categoryKey);
      }

      showToast('Follow-up templates generated successfully!', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Failed to generate follow-up templates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch existing follow-up templates
  const fetchExistingFollowUpTemplates = async () => {
    if (!campaignData.id) return;
    
    setIsLoadingExisting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/campaigns/${campaignData.id}/followup-templates/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch existing follow-up templates: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Organize templates by category and step
      const templates = {};
      data.forEach(template => {
        if (!templates[template.category]) {
          templates[template.category] = {};
        }
        templates[template.category][template.step] = {
          subject: template.subject,
          body: template.body
        };
      });
      
      // Only update state if we found templates
      if (Object.keys(templates).length > 0) {
        setFollowUpTemplates(templates);
        
        // Set first category as selected if not already set
        if (!selectedCategory && campaignData.categories && campaignData.categories.length > 0) {
          const firstCategory = campaignData.categories[0];
          const categoryKey = typeof firstCategory === 'string' ? firstCategory : firstCategory.id || firstCategory.name;
          setSelectedCategory(categoryKey);
        }
      }
    } catch (err) {
      console.error("Error fetching existing follow-up templates:", err);
      // Don't show error to user, just log it - this is a background operation
    } finally {
      setIsLoadingExisting(false);
    }
  };

  // Regenerate template for specific category
  const regenerateTemplate = async (category, step) => {
    console.log('Regenerating template for category:', category, 'step:', step);
    setRegenerating(prev => ({ ...prev, [`${category}_${step}`]: true }));

    try {
      const requestBody = {
        category,
        step,
        template_type: 'followup'
      };
      console.log('Request body:', requestBody);
      
      const response = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignData.id}/regenerate-template/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate template: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update the specific template
      setFollowUpTemplates(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [step]: data.template
        }
      }));

      showToast('Template regenerated successfully!', 'success');
    } catch (err) {
      showToast('Failed to regenerate template', 'error');
    } finally {
      setRegenerating(prev => ({ ...prev, [`${category}_${step}`]: false }));
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    // Simple toast implementation - you can replace with your toast system
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  // Fetch existing templates or generate new ones on component mount
  useEffect(() => {
    if (campaignData.id && campaignData.categories) {
      // First try to fetch existing follow-up templates
      fetchExistingFollowUpTemplates().then(() => {
        // Check if we need to generate new templates
        if (Object.keys(followUpTemplates).length === 0) {
          generateFollowUpTemplates();
        }
      });
    }
  }, [campaignData.id, campaignData.categories]);

  const categories = campaignData.categories || [];
  const currentTemplate = selectedCategory ? 
    followUpTemplates[selectedCategory]?.[followUpStep] : null;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-dark" />
            <h2 className="text-2xl font-bold text-gray-800">Follow-up Email Templates</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Follow-up #{followUpStep - 1}
            </span>
            <select
              value={followUpStep}
              onChange={(e) => setFollowUpStep(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value={2}>Follow-up 1</option>
              <option value={3}>Follow-up 2</option>
              <option value={4}>Follow-up 3</option>
              <option value={5}>Follow-up 4</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Category pills */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2">
            {categories.map((category) => {
              // Handle both string categories and object categories
              const categoryName = typeof category === 'string' ? category : category.name || category.id;
              const categoryKey = typeof category === 'string' ? category : category.id || category.name;
              
              return (
                <button
                  key={categoryKey}
                  onClick={() => setSelectedCategory(categoryKey)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    selectedCategory === categoryKey
                      ? 'bg-primary text-dark ring-2 ring-offset-2 ring-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {categoryName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current category */}
        <div className="mb-6">
          <div className="p-3 rounded-lg border bg-gray-100 text-gray-800 border-gray-200">
            <h3 className="font-medium">{selectedCategory} Recipients</h3>
            <p className="text-sm">{categories.find(c => {
              const categoryKey = typeof c === 'string' ? c : c.id || c.name;
              return categoryKey === selectedCategory;
            })?.description || 'Contact category'}</p>
          </div>
        </div>

        {/* Template editor */}
        {selectedCategory && currentTemplate ? (
          <div className="mb-6 border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <h3 className="font-medium text-gray-700">Follow-up Email Template</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => regenerateTemplate(selectedCategory, followUpStep)}
                  disabled={regenerating[`${selectedCategory}_${followUpStep}`]}
                  className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-xl text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {regenerating[`${selectedCategory}_${followUpStep}`] ? (
                    <>
                      <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 prose max-w-none min-h-[200px] font-sans mb-4">
                {/* Subject */}
                <div className="font-medium mb-2">Subject: {currentTemplate.subject || 'No subject'}</div>
                <div className="border-t border-gray-300 mb-2 pt-2"></div>
                
                {/* Add a note about placeholders */}
                <div className="bg-gray-100 p-2 mb-3 text-xs rounded">
                  <p className="font-bold">Preview Note:</p>
                  <p>Highlighted text shows placeholders that will be replaced with actual data from Excel.</p>
                </div>
                
                <div>
                  {currentTemplate.body ? (
                    <div className="complete-email-template">
                      {/* Highlight the placeholder to show it will be replaced with actual data */}
                      <p>Hi <span className="bg-gray-200 text-gray-800 px-1 rounded font-bold">{'{{first_name}}'}</span>,</p>
                      
                      {/* Render HTML content safely with placeholder highlighting */}
                      <div
                        dangerouslySetInnerHTML={{
                          __html: currentTemplate.body
                            .split('\n\n')
                            .map(paragraph => {
                              // Highlight placeholders
                              const highlightedParagraph = paragraph.replace(
                                /\{\{([^}]+)\}\}/g,
                                '<span class="bg-gray-200 text-gray-800 px-1 rounded font-bold">{{$1}}</span>'
                              );
                              return `<p>${highlightedParagraph}</p>`;
                            })
                            .join('')
                        }}
                      />
                      
                      <p>Looking forward to connecting.</p>
                      
                      <p>Best regards,<br/>
                      [Your Name]<br/>
                      Neutrino Tech Systems</p>
                    </div>
                  ) : (
                    'No content'
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : selectedCategory ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No follow-up template available for this category and step.</p>
              <button
                onClick={() => regenerateTemplate(selectedCategory, followUpStep)}
                className="mt-4 px-4 py-2 bg-primary text-dark rounded-lg hover:bg-primary-dark"
              >
                Generate Template
              </button>
            </div>
          </div>
        ) : null}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Generating follow-up templates...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Template navigation */}
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Templates
          </button>
          
          <button
            onClick={() => {
              onTemplatesGenerated(followUpTemplates);
              onNext();
            }}
            disabled={!selectedCategory || !currentTemplate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Schedule
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {Object.keys(followUpTemplates).length} of {categories.length} templates generated
          {error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {error}
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={generateFollowUpTemplates}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <RefreshCw className={`mr-2 -ml-1 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Regenerate All
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpGeneration;
