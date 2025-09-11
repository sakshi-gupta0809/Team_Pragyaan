import React, { useState, useEffect } from 'react';
import {
  Mail, Users, BarChart3, Settings, Calendar, HelpCircle, LogOut,
  Search, Bell, Plus, Upload, TrendingUp, Eye, MousePointer, Bot, PieChart, MoreVertical, Pause, Play, Square,
  Send
} from 'lucide-react';
import ContactsPage from './ContactsPage';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeTimer, setActiveTimer] = useState(true);
  const [timerTime, setTimerTime] = useState('01:24:08');
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDescription, setNewCampaignDescription] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactLinkedIn, setNewContactLinkedIn] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  // State for data
  const [stats, setStats] = useState({});
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  
  // Enhanced error handling
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const toggleTimer = () => setActiveTimer(!activeTimer);

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', name: 'Campaigns', icon: Mail, badge: '12' },
    { id: 'contacts', name: 'Contacts', icon: Users },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'analytics', name: 'Analytics', icon: PieChart },
    { id: 'ai-services', name: 'AI Services', icon: Bot }
  ];

  const generalItems = [
    { id: 'settings', name: 'Settings', icon: Settings },
    { id: 'help', name: 'Help', icon: HelpCircle },
    { id: 'logout', name: 'Logout', icon: LogOut }
  ];

  // Fetch all backend data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setApiError(null);

      // Helper function to handle individual fetch operations
      const fetchEndpoint = async (url, setter, name, fallbackData = null) => {
        try {
          const response = await fetch(url, {
            mode: 'cors'
          });
          if (response.ok) {
            setter(await response.json());
          } else {
            if (fallbackData) {
              console.log(`Using fallback data for ${name} due to missing endpoint`);
              setter(fallbackData);
              return; // Don't throw error if we have fallback data
            }
            
            let errorMessage = `Failed to fetch ${name}`;
            try {
              const errorData = await response.json();
              if (errorData.detail) {
                errorMessage = `${errorMessage}: ${errorData.detail}`;
              }
            } catch (e) {
              errorMessage = `${errorMessage}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
          }
        } catch (error) {
          if (fallbackData) {
            console.log(`Using fallback data for ${name} due to connection error`);
            setter(fallbackData);
            return; // Don't throw error if we have fallback data
          }
          
          const errorMessage = error.message === "Failed to fetch"
            ? "Network error: Please check your connection to the backend server"
            : error.message;
          
          console.error(`Error fetching ${name}:`, errorMessage);
          showToast(errorMessage, "error");
          throw error;
        }
      };

      try {
        // Create comprehensive mock data for development
        const mockAnalyticsData = {
          total_emails: 1250,
          open_rate: 0.42,
          response_rate: 0.18,
          ai_services: [
            { name: "Optimal Send Time", status: "active" },
            { name: "Response Prediction", status: "active" },
            { name: "Compliance Check", status: "active" }
          ],
          weekly_stats: {
            emails_sent: [32, 45, 38, 52, 48, 25, 40],
            opens: [18, 25, 19, 30, 28, 15, 22],
            responses: [5, 8, 6, 10, 9, 4, 7]
          }
        };

        const mockCampaigns = [
          { id: 1, name: "Q4 Product Launch", description: "Promoting our new product lineup", created_at: "2025-09-01T10:00:00Z" },
          { id: 2, name: "Customer Feedback Survey", description: "Annual customer satisfaction survey", created_at: "2025-08-15T14:30:00Z" },
          { id: 3, name: "Holiday Promotion", description: "Special holiday discounts and offers", created_at: "2025-08-30T09:15:00Z" }
        ];

        const mockContacts = [
          { id: 1, name: "John Doe", email: "john@example.com", linkedin_url: "https://linkedin.com/in/johndoe", campaign_id: 1 },
          { id: 2, name: "Jane Smith", email: "jane@example.com", linkedin_url: "https://linkedin.com/in/janesmith", campaign_id: 1 },
          { id: 3, name: "Mike Johnson", email: "mike@example.com", linkedin_url: "https://linkedin.com/in/mikejohnson", campaign_id: 2 },
          { id: 4, name: "Sarah Williams", email: "sarah@example.com", linkedin_url: "https://linkedin.com/in/sarahwilliams", campaign_id: 3 }
        ];

        const mockSchedules = [
          { id: 1, send_time: "2025-09-15T09:00:00Z", is_holiday: false, email_log_id: 1 },
          { id: 2, send_time: "2025-09-16T10:30:00Z", is_holiday: false, email_log_id: 2 },
          { id: 3, send_time: "2025-09-17T14:00:00Z", is_holiday: false, email_log_id: 3 }
        ];

        const mockTemplates = [
          { id: 1, subject: "Check out our new products!", body: "Hi {name}, we're excited to share our latest products...", campaign_id: 1 },
          { id: 2, subject: "We value your feedback", body: "Hello {name}, your opinion matters to us...", campaign_id: 2 },
          { id: 3, subject: "Holiday special offers inside", body: "Dear {name}, 'tis the season for great deals...", campaign_id: 3 }
        ];

        const mockEmailLogs = [
          { id: 1, recipient_email: "john@example.com", subject: "Check out our new products!", status: "sent", campaign_id: 1 },
          { id: 2, recipient_email: "jane@example.com", subject: "Check out our new products!", status: "opened", campaign_id: 1 },
          { id: 3, recipient_email: "mike@example.com", subject: "We value your feedback", status: "clicked", campaign_id: 2 }
        ];

        // DEVELOPMENT MODE: Use mock data while backend is being fixed
        console.log("Using mock data in development mode due to backend connection issues");
        setStats(mockAnalyticsData);
        setRecentCampaigns(mockCampaigns);
        setContacts(mockContacts);
        setSchedules(mockSchedules);
        setTemplates(mockTemplates);
        setEmailLogs(mockEmailLogs);
        
        // Try to fetch real data but fall back to mock data
        try {
          await fetchEndpoint("http://localhost:8000/analytics/summary/", setStats, "analytics data", mockAnalyticsData);
          await fetchEndpoint("http://localhost:8000/campaigns/", setRecentCampaigns, "campaigns", mockCampaigns);
          await fetchEndpoint("http://localhost:8000/contacts/", setContacts, "contacts", mockContacts);
          await fetchEndpoint("http://localhost:8000/schedules/", setSchedules, "schedules", mockSchedules);
          await fetchEndpoint("http://localhost:8000/email_templates/", setTemplates, "email templates", mockTemplates);
          await fetchEndpoint("http://localhost:8000/email_logs/", setEmailLogs, "email logs", mockEmailLogs);
        } catch (error) {
          console.log("Using mock data due to API connection issues:", error);
          // We already set mock data above, so no need to do anything here
        }
      } catch (err) {
        // Main error is already handled in fetchEndpoint function
        setApiError("Failed to load some data. Please refresh the page or check the console for details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle file import
  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setIsImporting(false);
      return;
    }

    setIsImporting(true);
    setIsLoading(true);
    setApiError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/contacts/import/', {
        method: 'POST',
        body: formData,
        mode: 'cors'
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`Successfully imported ${result.imported_count} contacts`, "success");
        // Refresh contacts list
        const contactsRes = await fetch("http://localhost:8000/contacts/", {
          mode: 'cors'
        });
        setContacts(await contactsRes.json());
      } else {
        // Handle different error status codes
        let errorMessage = "Failed to import contacts";
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = `${errorMessage}: ${errorData.detail}`;
          }
        } catch (e) {
          // If we can't parse the JSON, just use the status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        
        setApiError(errorMessage);
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error importing contacts:", error);
      const errorMessage = error.message === "Failed to fetch"
        ? "Network error: Please check your connection and try again"
        : "Failed to import contacts. Please try again.";
      
      setApiError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  };

  // Handle new campaign creation
  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setToast({ ...toast, visible: false });
    }, 5000);
  };

  // Dismiss toast
  const dismissToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName) {
      showToast("Campaign name is required", "error");
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('http://localhost:8000/campaigns/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCampaignName,
          description: newCampaignDescription || '',
        }),
        mode: 'cors'
      });

      if (response.ok) {
        const newCampaign = await response.json();
        setRecentCampaigns([...recentCampaigns, newCampaign]);
        setNewCampaignName('');
        setNewCampaignDescription('');
        setShowNewCampaignModal(false);
        setActiveSection('campaigns');
        showToast(`Campaign "${newCampaign.name}" created successfully!`, "success");
      } else {
        // Handle different error status codes
        let errorMessage = "Failed to create campaign";
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = `${errorMessage}: ${errorData.detail}`;
          }
        } catch (e) {
          // If we can't parse the JSON, just use the status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        
        setApiError(errorMessage);
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      const errorMessage = error.message === "Failed to fetch"
        ? "Network error: Please check your connection and try again"
        : "Failed to create campaign. Please try again.";
      
      setApiError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };
// Handle adding a new contact
const handleAddContact = async () => {
  if (!newContactName || !newContactEmail) {
    showToast("Name and email are required", "error");
    return;
  }

  setIsLoading(true);
  setApiError(null);

  try {
    const response = await fetch(`http://localhost:8000/campaigns/${selectedCampaignId}/contacts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newContactName,
        email: newContactEmail,
        linkedin_url: newContactLinkedIn || null,
      }),
      mode: 'cors'
    });

    if (response.ok) {
      const newContact = await response.json();
      // Update contacts list
      const contactsRes = await fetch("http://localhost:8000/contacts/", {
        mode: 'cors'
      });
      const updatedContacts = await contactsRes.json();
      setContacts(updatedContacts);
      
      setNewContactName('');
      setNewContactEmail('');
      setNewContactLinkedIn('');
      setShowAddContactModal(false);
      showToast(`Contact ${newContact.name} added successfully!`, "success");
    } else {
      // Handle different error status codes
      let errorMessage = "Failed to add contact";
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = `${errorMessage}: ${errorData.detail}`;
        }
      } catch (e) {
        // If we can't parse the JSON, just use the status text
        errorMessage = `${errorMessage}: ${response.statusText}`;
      }
      
      setApiError(errorMessage);
      showToast(errorMessage, "error");
    }
  } catch (error) {
    console.error("Error adding contact:", error);
    const errorMessage = error.message === "Failed to fetch"
      ? "Network error: Please check your connection and try again"
      : "Failed to add contact. Please try again.";
    
    setApiError(errorMessage);
    showToast(errorMessage, "error");
  } finally {
    setIsLoading(false);
  }
};
  // This is a duplicate function that was removed

  // Determine current page title
  const getPageTitle = () => {
    const item = [...navigationItems, ...generalItems].find(item => item.id === activeSection);
    return item ? item.name : 'Dashboard';
  };

  const getPageDescription = () => {
    const descriptions = {
      'dashboard': 'Monitor your email campaigns and track performance metrics',
      'campaigns': 'Create, manage, and optimize your email campaigns',
      'contacts': 'Organize and segment your email subscribers',
      'calendar': 'Schedule and plan your email marketing activities',
      'analytics': 'Analyze campaign performance and engagement metrics',
      'ai-services': 'Configure and monitor AI-powered email features',
      'settings': 'Configure your account and platform preferences',
      'help': 'Get support and learn how to use the platform'
    };
    return descriptions[activeSection] || '';
  };

  // Render section content
  const renderContent = () => {
    switch(activeSection) {
      case 'campaigns':
        return <SectionCard title="Recent Campaigns" data={recentCampaigns} />;
      case 'contacts':
        return <ContactsPage />;
      case 'calendar':
        return <SectionCard title="Upcoming Schedules" data={schedules} icon={<Calendar className="w-16 h-16 text-gray-300" />} />;
      case 'analytics':
        return <AnalyticsDashboard stats={stats} />;
      case 'ai-services':
        return <SectionCard title="AI Services" data={stats.ai_services || []} icon={<Bot className="w-16 h-16 text-gray-300" />} />;
      case 'settings':
        return <SectionCard title="Settings" data={[]} icon={<Settings className="w-16 h-16 text-gray-300" />} />;
      case 'help':
        return <SectionCard title="Help & Support" data={[]} icon={<HelpCircle className="w-16 h-16 text-gray-300" />} />;
      default:
        return <DashboardHome 
                  stats={stats} 
                  recentCampaigns={recentCampaigns} 
                  activeTimer={activeTimer} 
                  toggleTimer={toggleTimer} 
                  timerTime={timerTime} 
                />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`} role="alert">
          <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${
            toast.type === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            )}
          </div>
          <div className="ml-3 text-sm font-medium">{toast.message}</div>
          <button
            type="button"
            onClick={dismissToast}
            className={`ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 p-1.5 inline-flex h-8 w-8 ${
              toast.type === 'success' ? 'bg-green-100 text-green-500 hover:bg-green-200 focus:ring-green-400' : 'bg-red-100 text-red-500 hover:bg-red-200 focus:ring-red-400'
            }`}
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
      )}
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">EmailAI</span>
              <div className="text-xs text-gray-500">AI-Powered Platform</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          <MenuSection title="MAIN MENU" items={navigationItems} activeSection={activeSection} setActiveSection={setActiveSection} />
          <MenuSection title="GENERAL" items={generalItems} activeSection={activeSection} setActiveSection={setActiveSection} />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden bg-slate-50">
        <DashboardHeader
          activeTimer={activeTimer}
          toggleTimer={toggleTimer}
          timerTime={timerTime}
          setShowNewCampaignModal={setShowNewCampaignModal}
          setIsImporting={setIsImporting}
          fileInputRef={fileInputRef}
          setShowAddContactModal={setShowAddContactModal}
          handleFileImport={handleFileImport}
        />
        <main className="p-4 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{getPageTitle()}</h1>
            <p className="text-gray-600 text-base">{getPageDescription()}</p>
          </div>
    
          {/* New Campaign Modal */}
          {showNewCampaignModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Create New Campaign</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter campaign name"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    value={newCampaignDescription}
                    onChange={(e) => setNewCampaignDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter campaign description"
                    rows="3"
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowNewCampaignModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCampaign}
                    disabled={isLoading}
                    className={`px-4 py-2 bg-orange-500 text-white rounded-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'} flex items-center justify-center`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Campaign'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Add Contact Modal */}
          {showAddContactModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Add New Contact</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {recentCampaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter contact name"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter contact email"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL (optional)</label>
                  <input
                    type="url"
                    value={newContactLinkedIn}
                    onChange={(e) => setNewContactLinkedIn(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter LinkedIn profile URL"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddContactModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddContact}
                    disabled={isLoading}
                    className={`px-4 py-2 bg-orange-500 text-white rounded-lg ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'} flex items-center justify-center`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      'Add Contact'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;


// ================== Reusable Components ==================

const MenuSection = ({ title, items, activeSection, setActiveSection }) => (
  <>
    <div className="px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">
      {title}
    </div>
    <div className="space-y-1 px-3">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setActiveSection(item.id)}
          className={`w-full flex items-center px-3 py-3 rounded-xl text-left transition-all duration-200 ${
            activeSection === item.id 
              ? 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <item.icon className={`w-5 h-5 mr-3 ${activeSection === item.id ? 'text-orange-600' : ''}`} />
          <span className="font-medium">{item.name}</span>
          {item.badge && <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">{item.badge}</span>}
        </button>
      ))}
    </div>
  </>
);

const DashboardHeader = ({
  activeTimer,
  toggleTimer,
  timerTime,
  setShowNewCampaignModal,
  setIsImporting,
  fileInputRef,
  setShowAddContactModal,
  handleFileImport
}) => (
  <header className="bg-white shadow-sm border-b border-gray-100">
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center space-x-6">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input type="text" placeholder="Search campaigns, contacts, analytics..."
            className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-96 bg-gray-50 focus:bg-white transition-all duration-200"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button
          onClick={() => setShowNewCampaignModal(true)}
          className="flex items-center space-x-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-all duration-200 text-xs shadow-sm hover:shadow-md">
          <Plus className="w-3 h-3" />
          <span className="font-medium">New Campaign</span>
        </button>
        <button
          onClick={() => {
            setIsImporting(true);
            if (fileInputRef.current) fileInputRef.current.click();
          }}
          className="flex items-center space-x-1 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-200 bg-white text-xs">
          <Upload className="w-3 h-3 text-gray-600" />
          <span className="text-gray-700 font-medium">Import Data</span>
        </button>
        <button
          onClick={() => setShowAddContactModal(true)}
          className="flex items-center space-x-1 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-200 bg-white text-xs">
          <Users className="w-3 h-3 text-gray-600" />
          <span className="text-gray-700 font-medium">Add Contact</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".csv,.xlsx,.xls"
          onChange={handleFileImport}
        />
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
          <div>
            <div className="text-sm font-semibold text-gray-900">Alex Johnson</div>
            <div className="text-xs text-gray-500">alex@company.com</div>
          </div>
        </div>
      </div>
    </div>
  </header>
);

// Dashboard Home Content
const DashboardHome = ({ stats, recentCampaigns, activeTimer, toggleTimer, timerTime }) => (
  <>
    <div className="grid grid-cols-2 gap-3 mb-6 max-w-3xl mx-auto">
      <StatCard icon={<Mail className="w-4 h-4" />} label="Total Campaigns" value={stats.total_campaigns} />
      <StatCard icon={<Send className="w-4 h-4 text-blue-600" />} label="Emails Sent" value={stats.emails_sent} />
      <StatCard icon={<Eye className="w-4 h-4 text-purple-600" />} label="Open Rate" value={`${stats.open_rate}%`} />
      <StatCard icon={<MousePointer className="w-4 h-4 text-orange-600" />} label="Click Rate" value={`${stats.click_rate}%`} />
    </div>

    <SectionCard title="Recent Campaigns" data={recentCampaigns} />
    
    {/* Time Tracker */}
    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg mt-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Time Tracker</h3>
      <div className="text-center">
        <div className="text-3xl font-bold mb-4">{timerTime}</div>
        <div className="flex items-center justify-center space-x-3">
          <button onClick={toggleTimer} className="w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm">
            {activeTimer ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button className="w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm">
            <Square className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </>
);

// Stat Card
const StatCard = ({ icon, label, value }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <div className="p-1.5 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </div>
    </div>
  </div>
);

// Section Card
const SectionCard = ({ title, data, icon }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
    <div className="flex items-center mb-4">
      {icon && <div className="mr-3">{icon}</div>}
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    </div>
    <div className="space-y-3">
      {data.length ? (
        data.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div>{item.name || item.title || `Item ${idx + 1}`}</div>
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </div>
        ))
      ) : (
        <p className="text-gray-500 py-6 text-center">No data available...</p>
      )}
    </div>
  </div>
);

// Analytics Dashboard Placeholder
const AnalyticsDashboard = ({ stats }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign Analytics</h2>
    <div className="grid grid-cols-3 gap-4">
      <StatCard icon={<TrendingUp className="w-4 h-4 text-green-600" />} label="Open Rate" value={`${stats.open_rate || 0}%`} />
      <StatCard icon={<TrendingUp className="w-4 h-4 text-blue-600" />} label="Click Rate" value={`${stats.click_rate || 0}%`} />
      <StatCard icon={<TrendingUp className="w-4 h-4 text-red-600" />} label="Bounce Rate" value={`${stats.bounce_rate || 0}%`} />
    </div>
  </div>
);