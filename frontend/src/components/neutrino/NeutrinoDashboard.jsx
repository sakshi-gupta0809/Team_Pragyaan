import React, { useState, useEffect } from 'react';
import { 
  Mail, Users, BarChart3, Settings, Calendar, 
  HelpCircle, LogOut, Search, Bell, PlusCircle, ChevronRight
} from 'lucide-react';

// Import our components
import CampaignCreationForm from './CampaignCreationForm';
import ContactCategorization from './ContactCategorization';
import TemplateMapping from './TemplateMapping';
import SchedulingCalendar from './SchedulingCalendar';
import CampaignOutput from './CampaignOutput';

const NeutrinoDashboard = () => {
  // Main state for workflow steps
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for storing data between steps
  const [campaignData, setCampaignData] = useState({
    id: null,
    name: '',
    description: '',
    startDate: '',
    contacts: [],
    templates: [],
    categories: [],
    emails: []
  });
  
  // Define the workflow steps
  const steps = [
    { id: 1, name: 'Campaign Creation', description: 'Set up your campaign details and upload leads' },
    { id: 2, name: 'Contact Categorization', description: 'Review and confirm contact categories' },
    { id: 3, name: 'Email Templates', description: 'Customize email templates for each category' },
    { id: 4, name: 'Schedule', description: 'Review and confirm email send schedule' },
    { id: 5, name: 'Campaign Ready', description: 'Your campaign is ready to launch' }
  ];
  
  // Navigation items for the sidebar
  const navigationItems = [
    { id: 'campaigns', name: 'Campaigns', icon: Mail, badge: '3' },
    { id: 'contacts', name: 'Contacts', icon: Users },
    { id: 'templates', name: 'Templates', icon: FileText },
    { id: 'scheduler', name: 'Scheduler', icon: Calendar },
    { id: 'reports', name: 'Reports', icon: BarChart3 }
  ];
  
  // For the first step - campaign creation form submission
  const handleCampaignFormSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to create campaign and process contacts
      const response = await fetch('http://localhost:8000/api/campaigns/', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create campaign: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update campaign data state with API response
      setCampaignData({
        ...campaignData,
        id: data.id,
        name: data.name,
        description: data.description,
        startDate: data.start_date,
        contacts: data.contacts || [],
        categories: data.categories || []
      });
      
      // Move to next step
      setCurrentStep(2);
    } catch (err) {
      console.error("Error submitting campaign form:", err);
      setError("Failed to create campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // For the second step - approve contact categorization
  const handleCategoryApprove = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to approve categories
      const response = await fetch(`http://localhost:8000/api/campaigns/${campaignData.id}/categories/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to approve categories: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update state with templates from API
      setCampaignData({
        ...campaignData,
        templates: data.templates || []
      });
      
      // Move to next step
      setCurrentStep(3);
    } catch (err) {
      console.error("Error approving categories:", err);
      setError("Failed to process categories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // For the third step - save email templates
  const handleSaveTemplates = async (templates) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to save templates
      const response = await fetch(`http://localhost:8000/api/campaigns/${campaignData.id}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templates })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update state with the saved templates
      setCampaignData({
        ...campaignData,
        templates: data.templates || templates
      });
      
      // Move to next step
      setCurrentStep(4);
    } catch (err) {
      console.error("Error saving templates:", err);
      setError("Failed to save templates. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // For the fourth step - approve schedule
  const handleScheduleApprove = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to approve schedule
      const response = await fetch(`http://localhost:8000/api/campaigns/${campaignData.id}/schedule/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: campaignData.startDate
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to approve schedule: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update state with the scheduled emails from API
      setCampaignData({
        ...campaignData,
        emails: data.emails || []
      });
      
      // Move to final step
      setCurrentStep(5);
    } catch (err) {
      console.error("Error approving schedule:", err);
      setError("Failed to process schedule. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // For the fifth step - download campaign data
  const handleDownloadCampaign = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to get campaign data in CSV format
      const response = await fetch(`http://localhost:8000/api/campaigns/${campaignData.id}/export`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download campaign data: ${response.statusText}`);
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${campaignData.name.replace(/\s+/g, '_').toLowerCase()}_emails.csv`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading campaign data:", err);
      setError("Failed to download campaign data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to render the current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <CampaignCreationForm onSubmit={handleCampaignFormSubmit} isLoading={isLoading} />;
      case 2:
        return <ContactCategorization 
                contacts={campaignData.contacts} 
                onApprove={handleCategoryApprove} 
                isLoading={isLoading} 
              />;
      case 3:
        return <TemplateMapping 
                templates={campaignData.templates} 
                categories={campaignData.categories} 
                onSaveTemplates={handleSaveTemplates} 
                isLoading={isLoading} 
              />;
      case 4:
        return <SchedulingCalendar 
                campaignStart={campaignData.startDate} 
                categories={campaignData.categories} 
                onScheduleApprove={handleScheduleApprove} 
                isLoading={isLoading} 
              />;
      case 5:
        return <CampaignOutput 
                campaignData={campaignData} 
                onDownload={handleDownloadCampaign} 
                isLoading={isLoading} 
              />;
      default:
        return <div>Unknown step</div>;
    }
  };
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md border-r border-gray-100 rounded-r-2xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Neutrino</span>
              <div className="text-xs text-gray-500">Email Automation</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          <div className="px-4 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <a
                key={item.id}
                href="#"
                className={`flex items-center px-4 py-3 text-sm font-medium ${
                  item.id === 'campaigns'
                    ? 'text-dark bg-primary bg-opacity-10 border-r-2 border-primary'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${item.id === 'campaigns' ? 'text-primary' : 'text-gray-400'}`} />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-dark text-secondary text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
          
          <div className="px-4 mt-8 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">General</p>
          </div>
          <div className="space-y-1">
            <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Settings className="mr-3 h-5 w-5 text-gray-400" />
              Settings
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <HelpCircle className="mr-3 h-5 w-5 text-gray-400" />
              Help
            </a>
            <a href="#" className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <LogOut className="mr-3 h-5 w-5 text-gray-400" />
              Logout
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 rounded-b-2xl mb-4">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Email Campaign Workflow</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
                  placeholder="Search..."
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Bell className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-dark flex items-center justify-center text-secondary font-medium">
                  NP
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Workflow Steps */}
        <div className="px-6 py-4">
          <div className="flex items-center">
            <nav className="flex" aria-label="Progress">
              <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                  <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                    {currentStep > step.id ? (
                      // Completed step
                      <>
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="h-0.5 w-full bg-primary"></div>
                        </div>
                        <div
                          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary"
                        >
                          <svg
                            className="h-5 w-5 text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </>
                    ) : currentStep === step.id ? (
                      // Current step
                      <>
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="h-0.5 w-full bg-gray-200"></div>
                        </div>
                        <div
                          className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white"
                          aria-current="step"
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true"></span>
                        </div>
                      </>
                    ) : (
                      // Upcoming step
                      <>
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="h-0.5 w-full bg-gray-200"></div>
                        </div>
                        <div
                          className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white"
                        >
                          <span className="text-sm font-medium text-gray-500">{step.id}</span>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{steps.find(s => s.id === currentStep)?.name}</h2>
              <p className="text-sm text-gray-500">{steps.find(s => s.id === currentStep)?.description}</p>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main content - current step */}
        <div className="px-6 pb-6">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

// Missing FileText import - let's add it
import { FileText } from 'lucide-react';

export default NeutrinoDashboard;