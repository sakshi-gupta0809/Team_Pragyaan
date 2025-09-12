import React, { useState } from 'react';
import { FileText, Edit2, Save, X, Check, ArrowLeft, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';

const TemplateMapping = ({ templates, categories, onSaveTemplates, isLoading }) => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [savedTemplates, setSavedTemplates] = useState(templates);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState(null);

  const currentCategory = categories[currentCategoryIndex];
  // Ensure we're always getting the most up-to-date template from savedTemplates
  const currentTemplate = savedTemplates.find(t => t.categoryId === currentCategory?.id) || {
    categoryId: currentCategory?.id,
    subject: '',
    body: ''
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditedSubject(currentTemplate.subject);
    setEditedBody(currentTemplate.body);
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  const handleSave = () => {
    const updatedTemplate = {
      ...currentTemplate,
      subject: editedSubject,
      body: editedBody
    };
    
    const updatedTemplates = savedTemplates.map(t => 
      t.categoryId === currentCategory.id ? updatedTemplate : t
    );
    
    // If template for this category doesn't exist yet, add it
    if (!savedTemplates.some(t => t.categoryId === currentCategory.id)) {
      updatedTemplates.push(updatedTemplate);
    }
    
    setSavedTemplates(updatedTemplates);
    setEditMode(false);
  };

  const handleRegenerate = async () => {
    if (!currentCategory || !currentCategory.id) return;
    
    setIsRegenerating(true);
    setRegenerationError(null);

    try {
      console.log(`Regenerating template for category: ${currentCategory.id}`);
      const campaignId = window.localStorage.getItem('currentCampaignId') || 1;
      console.log(`Campaign ID: ${campaignId}`);
      
      // Make API call to regenerate template
      const response = await fetch(
        `http://localhost:8000/api/neutrino/campaigns/${campaignId}/categories/${currentCategory.id}/regenerate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit'
        }
      );

      const responseText = await response.text();
      console.log('API Response:', responseText);
      
      if (!response.ok) {
        throw new Error(`Failed to regenerate template: ${response.status} ${response.statusText}\n${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${e.message}\n${responseText}`);
      }
      
      if (!data.success || !data.template) {
        throw new Error(`Invalid response from template regeneration API: ${JSON.stringify(data)}`);
      }

      // Log template format to ensure it matches desired structure
      console.log('Validating template format...');

      console.log('Received regenerated template:', data.template);

      // Create updated template with the regenerated content
      // Ensure the email follows the format specified in the example
      const regeneratedTemplate = {
        categoryId: data.template.categoryId,
        subject: data.template.subject,
        body: data.template.body,
        regenerated: true
      };

      // Validate if the template has the correct format
      if (!regeneratedTemplate.subject.includes("{{first_name}}") ||
          !regeneratedTemplate.subject.includes("{{company_name}}")) {
        console.warn("Regenerated template subject does not have the expected placeholders");
      }

      if (!regeneratedTemplate.body.includes("{{first_name}}") ||
          !regeneratedTemplate.body.includes("{{company_name}}") ||
          !regeneratedTemplate.body.includes("{{designation}}")) {
        console.warn("Regenerated template body does not have the expected placeholders");
      }

      console.log('Created regenerated template object:', regeneratedTemplate);

      // Update the templates array
      const updatedTemplates = [...savedTemplates];
      const existingIndex = updatedTemplates.findIndex(t => t.categoryId === currentCategory.id);
      
      if (existingIndex >= 0) {
        // Replace existing template
        updatedTemplates[existingIndex] = regeneratedTemplate;
      } else {
        // Add new template
        updatedTemplates.push(regeneratedTemplate);
      }
      
      console.log('Setting updated templates:', updatedTemplates);
      
      // Update the state with new templates
      setSavedTemplates(updatedTemplates);
      
      // Force re-render with current template update
      setCurrentCategoryIndex(currentCategoryIndex);
      
      // Show success message
      console.log('Template successfully regenerated');

    } catch (error) {
      console.error('Error regenerating template:', error);
      setRegenerationError(error.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleNext = () => {
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setEditMode(false);
    }
  };

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
      setEditMode(false);
    }
  };

  const handleSaveAll = () => {
    onSaveTemplates(savedTemplates);
  };

  const getCategoryStyle = (category) => {
    const styles = {
      'operations': 'bg-yellow-100 text-dark border-yellow-200',
      'clinical': 'bg-yellow-50 text-dark border-yellow-100',
      'it': 'bg-secondary text-dark border-gray-200',
      'research': 'bg-gray-100 text-dark border-gray-200',
      'sales': 'bg-primary text-dark border-yellow-300',
      'executive': 'bg-dark text-secondary border-gray-800',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return styles[category.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-dark" />
            <h2 className="text-2xl font-bold text-gray-800">Email Templates</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Template {currentCategoryIndex + 1} of {categories.length}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Category pills */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-2">
            {categories.map((category, index) => (
              <button
                key={category.id}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  index === currentCategoryIndex
                    ? `${getCategoryStyle(category.id)} ring-2 ring-offset-2 ring-primary`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => {
                  setCurrentCategoryIndex(index);
                  setEditMode(false);
                }}
              >
                {category.name} ({templates.find(t => t.categoryId === category.id) ? '✓' : ''})
              </button>
            ))}
          </div>
        </div>

        {/* Current category */}
        <div className="mb-6">
          <div className={`p-3 rounded-lg border ${getCategoryStyle(currentCategory?.id)}`}>
            <h3 className="font-medium">{currentCategory?.name} Recipients</h3>
            <p className="text-sm">{currentCategory?.description}</p>
          </div>
        </div>

        {/* Template editor */}
        <div className="mb-6 border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Email Template</h3>
            {!editMode ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-xl text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {isRegenerating ? (
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
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <Edit2 className="mr-1 h-4 w-4" />
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-xl text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save
                </button>
              </div>
            )}
          </div>
          
          <div className="p-4">
            {editMode ? (
              <div>
                {/* Subject */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    placeholder="Enter email subject..."
                  />
                </div>
                
                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Body
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    rows="10"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    placeholder="Enter email body..."
                  ></textarea>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 prose max-w-none min-h-[200px] whitespace-pre-wrap font-mono">
                {/* Display email as a complete formatted template */}
                <div className="font-medium mb-2">Subject: {currentTemplate.subject || 'No subject'}</div>
                <div className="border-t border-gray-300 mb-2 pt-2"></div>
                <div>
                  {currentTemplate.body ? (
                    <div className="complete-email-template">
                      <p>Hi {'{{first_name}}'},</p>
                      
                      {currentTemplate.body.split('\n\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                      
                      <p>Looking forward to connecting.</p>
                      
                      <p>Best regards,<br/>
                      [Your Name]<br/>
                      Neutrino Tech Systems</p>
                    </div>
                  ) : (
                    'No content'
                  )}
                </div>
                {currentTemplate.regenerated && (
                  <div className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-dark">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI Regenerated
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Template navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentCategoryIndex === 0}
            className={`inline-flex items-center px-4 py-2 border ${
              currentCategoryIndex === 0
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Previous Template
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentCategoryIndex === categories.length - 1}
            className={`inline-flex items-center px-4 py-2 border ${
              currentCategoryIndex === categories.length - 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
          >
            Next Template
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {savedTemplates.length} of {categories.length} templates customized
          {regenerationError && (
            <div className="mt-2 text-sm text-red-600">
              Error: {regenerationError}
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={() => window.history.back()}
          >
            Back
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={handleSaveAll}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 -ml-1 h-4 w-4" />
                Save All Templates
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateMapping;