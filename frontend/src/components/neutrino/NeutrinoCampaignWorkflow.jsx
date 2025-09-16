import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import CampaignCreationForm from './CampaignCreationForm';
import ContactCategorization from './ContactCategorization';
import TemplateMapping from './TemplateMapping';
import FollowUpGeneration from './FollowUpGeneration';
import SchedulingCalendar from './SchedulingCalendar';
import CampaignOutput from './CampaignOutput';

const NeutrinoCampaignWorkflow = ({ onClose }) => {
  // Main state for workflow steps
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  
  // State for storing data between steps
  const [campaignData, setCampaignData] = useState({
    id: null,
    name: '',
    description: '',
    startDate: '',
    contacts: [],
    templates: [],
    followUpTemplates: {},
    categories: [],
    emails: []
  });
  
  // Define the workflow steps
  const steps = [
    { id: 1, name: 'Campaign Creation', description: 'Set up your campaign details and upload leads' },
    { id: 2, name: 'Contact Categorization', description: 'Review and confirm contact categories' },
    { id: 3, name: 'Email Templates', description: 'Customize initial email templates for each category' },
    { id: 4, name: 'Follow-up Templates', description: 'Generate follow-up email templates' },
    { id: 5, name: 'Schedule', description: 'Review and confirm email send schedule' },
    { id: 6, name: 'Campaign Ready', description: 'Your campaign is ready to launch' }
  ];
  
  // For the first step - campaign creation form submission
  const handleCampaignFormSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to create campaign and process contacts with proper CORS headers
      const response = await fetch('http://localhost:8000/api/neutrino/campaigns/', {
        method: 'POST',
        // Don't set Content-Type header when sending FormData - browser will set it with proper boundary
        headers: {
          'Accept': 'application/json'
        },
        body: formData,
        mode: 'cors',
        credentials: 'omit'
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
      
      // Store campaign ID in localStorage for use in other components
      window.localStorage.setItem('currentCampaignId', data.id);
      
      // Move to next step
      setCurrentStep(2);
      setToast({ visible: true, message: 'Campaign created successfully', type: 'success' });
    } catch (err) {
      console.error("Error submitting campaign form:", err);
      // Fallback behavior for demo/development purposes
      // In a real app, you would display the error message
      const mockCampaignData = {
        id: Date.now(),
        name: "Demo Campaign",
        description: "This is a demo campaign (backend connection failed)",
        start_date: new Date().toISOString(),
        contacts: [
          { id: 1, name: "John Doe", email: "john@example.com", category: "sales" },
          { id: 2, name: "Jane Smith", email: "jane@example.com", category: "operations" },
          { id: 3, name: "Alex Brown", email: "alex@example.com", category: "it" }
        ],
        categories: [
          { id: "sales", name: "Sales Team", description: "Sales and account management" },
          { id: "operations", name: "Operations", description: "Operations and logistics" },
          { id: "it", name: "IT Department", description: "Technical team members" }
        ]
      };
      
      // Update with mock data
      setCampaignData({
        ...campaignData,
        id: mockCampaignData.id,
        name: mockCampaignData.name,
        description: mockCampaignData.description,
        startDate: mockCampaignData.start_date,
        contacts: mockCampaignData.contacts || [],
        categories: mockCampaignData.categories || []
      });
      
      // Store mock campaign ID in localStorage for use in other components
      window.localStorage.setItem('currentCampaignId', mockCampaignData.id);
      
      // Show error but continue with demo data
      setError("Backend connection failed. Using demo data for preview purposes.");
      setToast({ visible: true, message: 'Using demo campaign data', type: 'error' });
      
      // Move to next step anyway
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };
  
  // For the second step - approve contact categorization
  const handleCategoryApprove = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to approve categories with proper CORS headers
      const response = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignData.id}/categories/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
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
      setToast({ visible: true, message: 'Categories approved', type: 'success' });
    } catch (err) {
      console.error("Error approving categories:", err);
      
      // Fallback behavior with mock templates
      const mockTemplates = [
        {
          categoryId: "sales",
          subject: "Partnership opportunity with our company",
          body: "Dear {{name}},\n\nI hope this email finds you well. I'm reaching out because I believe there could be some valuable partnership opportunities between our companies.\n\nLet's schedule a quick call to discuss this further.\n\nBest regards,\nMarketing Team"
        },
        {
          categoryId: "operations",
          subject: "Improving operational efficiency",
          body: "Hello {{name}},\n\nI wanted to connect regarding some innovations in operational efficiency that might benefit {{company}}.\n\nWould you be available for a brief discussion?\n\nRegards,\nOperations Team"
        },
        {
          categoryId: "it",
          subject: "New technical solutions for {{company}}",
          body: "Hi {{name}},\n\nI'm reaching out to discuss some new technical solutions that could help address common challenges in your industry.\n\nLet me know if you'd like to learn more.\n\nBest,\nTechnical Team"
        }
      ];
      
      // Update state with mock templates
      setCampaignData({
        ...campaignData,
        templates: mockTemplates
      });
      
      // Show error but continue with demo data
      setError("Backend connection failed. Using demo templates for preview purposes.");
      setToast({ visible: true, message: 'Using demo templates', type: 'error' });
      
      // Move to next step anyway
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };
  
  // For the third step - save email templates
  const handleSaveTemplates = async (templates) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to save templates with proper CORS headers
      const response = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignData.id}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ templates }),
        mode: 'cors',
        credentials: 'omit'
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
      setToast({ visible: true, message: 'Templates saved', type: 'success' });
    } catch (err) {
      console.error("Error saving templates:", err);
      
      // Fallback behavior - use the templates that were provided
      setCampaignData({
        ...campaignData,
        templates: templates
      });
      
      // Show error but continue with existing templates
      setError("Backend connection failed. Using existing templates for preview purposes.");
      setToast({ visible: true, message: 'Failed to save templates; using current', type: 'error' });
      
      // Move to next step anyway
      setCurrentStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  // For the fourth step - follow-up templates generation
  const handleFollowUpTemplatesGenerated = (followUpTemplates) => {
    setCampaignData(prev => ({
      ...prev,
      followUpTemplates: followUpTemplates
    }));
    setCurrentStep(5);
  };
  
  // For the fifth step - approve schedule
  const handleScheduleApprove = async () => {
    console.log('Approving schedule for campaign:', campaignData.id);
    setIsLoading(true);
    setError(null);
    
    try {
      const requestBody = {
        startDate: campaignData.startDate
      };
      console.log('Schedule approval request body:', requestBody);
      
      // Make API call to approve schedule with proper CORS headers
      const response = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignData.id}/schedule/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        mode: 'cors',
        credentials: 'omit'
      });
      
      console.log('Schedule approval response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to approve schedule: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Schedule approval response data:', data);
      
      // Update state with the scheduled emails from API
      setCampaignData({
        ...campaignData,
        emails: data.emails || []
      });
      
      // Move to final step
      setCurrentStep(6);
      setToast({ visible: true, message: 'Schedule approved', type: 'success' });
    } catch (err) {
      console.error("Error approving schedule:", err);
      
      // Generate mock scheduled emails for fallback
      const mockEmails = campaignData.contacts.map(contact => {
        const template = campaignData.templates.find(t => t.categoryId === contact.category);
        return {
          id: `mock-${contact.id}`,
          recipient: contact.email,
          subject: template ? template.subject : "Campaign Email",
          body: template ? template.body : "Demo email body",
          scheduledDate: new Date(new Date(campaignData.startDate).getTime() + Math.random() * 86400000 * 5).toISOString(),
          status: "scheduled"
        };
      });
      
      // Update with mock data
      setCampaignData({
        ...campaignData,
        emails: mockEmails
      });
      
      // Show error but continue with demo data
      setError("Backend connection failed. Using demo schedule data for preview purposes.");
      setToast({ visible: true, message: 'Using demo schedule', type: 'error' });
      
      // Move to final step anyway
      setCurrentStep(6);
    } finally {
      setIsLoading(false);
    }
  };
  
  // For the fifth step - download campaign data
  const handleDownloadCampaign = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Make API call to get campaign data in CSV format with proper CORS headers
      const response = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignData.id}/export`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv, application/json'
        },
        mode: 'cors',
        credentials: 'omit'
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
      setToast({ visible: true, message: 'CSV downloaded', type: 'success' });
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading campaign data:", err);
      
      // Create fallback CSV data
      let csvContent = "recipient,subject,body,scheduled_date,status\n";
      
      // Add each email as a row in the CSV
      campaignData.emails.forEach(email => {
        // Escape quotes in the subject and body
        const escapedSubject = email.subject.replace(/"/g, '""');
        const escapedBody = email.body.replace(/"/g, '""');
        
        csvContent += `"${email.recipient}","${escapedSubject}","${escapedBody}","${email.scheduledDate}","${email.status}"\n`;
      });
      
      // Create a blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      // Create and trigger download link
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${campaignData.name.replace(/\s+/g, '_').toLowerCase()}_emails_demo.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      // Show a more informative error message
      setError("Backend connection failed. Generated a demo CSV file with placeholder data.");
      setToast({ visible: true, message: 'Generated demo CSV', type: 'error' });
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
        return <FollowUpGeneration 
                campaignData={campaignData} 
                onNext={() => setCurrentStep(5)} 
                onBack={() => setCurrentStep(3)} 
                onTemplatesGenerated={handleFollowUpTemplatesGenerated}
              />;
      case 5:
        return <SchedulingCalendar 
                campaignStart={campaignData.startDate} 
                categories={campaignData.categories} 
                onScheduleApprove={handleScheduleApprove} 
                isLoading={isLoading} 
              />;
      case 6:
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
    <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={currentStep}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-gray-800 text-white rounded-2xl shadow-md border border-gray-700"
    >
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow border ${toast.type === 'success' ? 'bg-green-900/70 text-green-100 border-green-700' : 'bg-red-900/70 text-red-100 border-red-700'}`}>
          <div className="flex items-center">
            <span className="text-sm">{toast.message}</span>
            <button className={`ml-3 text-xs ${toast.type === 'success' ? 'text-green-300' : 'text-red-300'}`} onClick={() => setToast({ ...toast, visible: false })}>Dismiss</button>
          </div>
        </div>
      )}
      {/* Back button */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white font-medium flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4 text-orange-400" />
          Back to Campaigns
        </button>
      </div>
      
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
                        <div className="h-0.5 w-full bg-orange-500"></div>
                      </div>
                      <div
                        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 border border-gray-500"
                      >
                        <CheckCircle className="h-5 w-5 text-orange-400" />
                      </div>
                    </>
                  ) : currentStep === step.id ? (
                    // Current step
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-700"></div>
                      </div>
                      <div
                        className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-500 bg-gray-900"
                        aria-current="step"
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" aria-hidden="true"></span>
                      </div>
                    </>
                  ) : (
                    // Upcoming step
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-gray-700"></div>
                      </div>
                      <div
                        className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-800 text-gray-300"
                      >
                        <span className="text-sm font-medium">{step.id}</span>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="mt-4 mb-6">
          <h2 className="text-xl font-bold text-white">{steps.find(s => s.id === currentStep)?.name}</h2>
          <p className="text-sm text-gray-400">{steps.find(s => s.id === currentStep)?.description}</p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mb-4 p-4 bg-red-900/40 border-l-4 border-red-600 text-red-200 rounded-r-lg">
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
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {renderCurrentStep()}
        </motion.div>
      </div>
    </motion.div>
    </AnimatePresence>
  );
};

export default NeutrinoCampaignWorkflow;