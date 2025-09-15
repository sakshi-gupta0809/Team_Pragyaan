import React, { useState, useEffect } from 'react';
import {
  Mail, Users, BarChart3, Settings, HelpCircle, LogOut,
  Search, Bell, Plus, Upload, TrendingUp, Eye, MousePointer, MoreVertical, Pause, Play, Square,
  Send, ChevronLeft, ChevronRight, PlusCircle, RefreshCw, ExternalLink, Clock, User, ArrowUpRight,
  Calendar, UserCircle
} from 'lucide-react';
import ContactsPage from './ContactsPage';
import CampaignsInterface from './CampaignsInterface';
import NeutrinoCampaignWorkflow from './neutrino/NeutrinoCampaignWorkflow';
import Profile from './Profile';

const Dashboard = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTimer, setActiveTimer] = useState(true);
  const [timerTime, setTimerTime] = useState('01:24:08');
  
  // Calendar-related state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
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
  
  // Enhanced calendar functionality
  const [activeDate, setActiveDate] = useState(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAllEventsModal, setShowAllEventsModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('09:00');
  const [newEventEndTime, setNewEventEndTime] = useState('10:00');
  const [newEventType, setNewEventType] = useState('meeting');
  const [newEventColor, setNewEventColor] = useState('bg-emerald-500');
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);

  // State for data
  const [stats, setStats] = useState({
    total_campaigns: 0,
    total_contacts: 0,
    emails_sent: 0,
    open_rate: 0,
    click_rate: 0,
    earnings: 2890,
    totalBalance: '2M',
    bookings: 24,
    demographics: 20,
    weekly_stats: { emails_sent: [], opens: [], responses: [] }
  });
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [liveStats, setLiveStats] = useState({ loading: false, data: null, error: null });
  const [scheduledCampaigns, setScheduledCampaigns] = useState([]);
  
  // Enhanced error handling
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const toggleTimer = () => setActiveTimer(!activeTimer);

  const refreshScheduledCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns/paginated/?page=1&page_size=100&status=scheduled', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        setScheduledCampaigns([]);
        return;
      }
      const data = await res.json();
      const items = Array.isArray(data?.campaigns) ? data.campaigns.map(c => ({ id: c.id, name: c.name })) : [];
      setScheduledCampaigns(items);
    } catch (e) {
      setScheduledCampaigns([]);
    }
  };

  // Days of week for calendar
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Format date for display
  const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
      day: date.getDate(),
      month: months[date.getMonth()],
      year: date.getFullYear(),
      dayName: days[date.getDay()]
    };
  };
  
  // Get current month days
  const getDaysInMonth = () => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const days = [];
    while (date.getMonth() === selectedDate.getMonth()) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  // Create a state for navigation items to update the badge dynamically
  const [navigationItems, setNavigationItems] = useState([
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, active: activeSection === 'dashboard' },
    { id: 'campaigns', name: 'Campaigns', icon: Mail, badge: stats.total_campaigns.toString(), active: activeSection === 'campaigns' },
    { id: 'contacts', name: 'Contacts', icon: Users, active: activeSection === 'contacts' },
    { id: 'neutrino', name: 'Create Campaign', icon: PlusCircle, active: activeSection === 'neutrino' },
    { id: 'profile', name: 'Profile', icon: UserCircle, active: activeSection === 'profile' }
  ])

  const generalItems = [
    { id: 'settings', name: 'Settings', icon: Settings },
    { id: 'help', name: 'Help', icon: HelpCircle },
    { id: 'logout', name: 'Logout', icon: LogOut }
  ];

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  // Check if a date has any events
  const hasEvents = (date) => {
    return getEventsForDate(date).length > 0;
  };

  // Add new event
  const handleAddEvent = async () => {
    if (!newEventTitle) {
      showToast("Event title is required", "error");
      return;
    }

    const formattedTime = `${newEventStartTime} — ${newEventEndTime}`;
    
    const newEvent = {
      id: Date.now(), // temp id; replaced by server id
      title: newEventTitle,
      time: formattedTime,
      type: newEventType,
      color: newEventColor,
      date: new Date(activeDate)
    };

    // Persist to backend
    try {
      const token = window.localStorage.getItem('token');
      const res = await fetch('/api/events/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newEvent.title,
          date: newEvent.date.toISOString(),
          start_time: newEventStartTime,
          end_time: newEventEndTime,
          type: newEvent.type,
          color: newEvent.color
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save event');
      setEvents([...events, { ...newEvent, id: data.id }]);
      showToast(`Event "${newEventTitle}" added successfully!`, "success");
    } catch (e) {
      // Fallback to local add if server fails
      setEvents([...events, newEvent]);
      showToast('Saved locally (offline).', 'success');
    }

    setNewEventTitle('');
    setNewEventStartTime('09:00');
    setNewEventEndTime('10:00');
    setShowAddEventModal(false);
  };

  // Edit existing event (local-only fallback function replaced by async handler below)

  // Delete event
  const handleDeleteEvent = (eventId) => {
    const updatedEvents = events.filter(event => event.id !== eventId);
    setEvents(updatedEvents);
    setShowEditEventModal(false);
    showToast("Event deleted successfully!", "success");
  };

  // Set current event for editing
  const openEditEventModal = (event) => {
    setCurrentEvent(event);
    setNewEventTitle(event.title);
    // Parse time from "HH:MM — HH:MM" format
    const timeParts = event.time.split(' — ');
    setNewEventStartTime(timeParts[0]);
    setNewEventEndTime(timeParts[1]);
    setNewEventType(event.type);
    setNewEventColor(event.color);
    setShowEditEventModal(true);
  };

  // Load initial events from localStorage (with demos as fallback)
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem('calendarEvents');
      if (cached) {
        const parsed = JSON.parse(cached).map(e => ({ ...e, date: new Date(e.date) }));
        setEvents(parsed);
        // Set active date to the nearest upcoming event, or today if none
        const today = new Date();
        const upcoming = parsed
          .slice()
          .sort((a,b) => new Date(a.date) - new Date(b.date))
          .find(e => new Date(e.date) >= new Date(today.setHours(0,0,0,0)));
        if (upcoming) {
          setActiveDate(new Date(upcoming.date));
        }
        setEventsLoaded(true);
        return;
      }
    } catch {}
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(today.getDate() + 2);
    setEvents([
      { id: 1, title: 'Email Campaign Launch', time: '09:00 AM — 10:00 AM', type: 'meeting', color: 'bg-emerald-500', date: today },
      { id: 2, title: 'Content Review', time: '11:00 AM — 12:30 PM', type: 'work', color: 'bg-amber-400', date: tomorrow },
      { id: 3, title: 'Team Strategy Session', time: '02:00 PM — 03:30 PM', type: 'development', color: 'bg-rose-400', date: dayAfterTomorrow }
    ]);
    setEventsLoaded(true);
  }, []);

  // Persist events to localStorage on change and fetch from backend on login
  useEffect(() => {
    if (!eventsLoaded) return;
    try {
      const toSave = events.map(e => ({ ...e, date: e.date instanceof Date ? e.date.toISOString() : e.date }));
      window.localStorage.setItem('calendarEvents', JSON.stringify(toSave));
    } catch {}
  }, [events, eventsLoaded]);

  useEffect(() => {
    // Try load from backend if token present
    (async () => {
      const token = window.localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/events/', { headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const mapped = data.map(d => ({ id: d.id, title: d.title, time: `${d.start_time || ''}${d.end_time ? ' — ' + d.end_time : ''}`.trim(), type: d.type, color: d.color || 'bg-emerald-500', date: new Date(d.date) }));
        setEvents(mapped);
        setEventsLoaded(true);
      } catch {}
    })();
  }, []);

  // Fetch live campaign stats for the last used campaign
  const fetchLiveCampaignStats = async () => {
    try {
      const id = window.localStorage.getItem('currentCampaignId');
      if (!id) return;
      setLiveStats(s => ({ ...s, loading: true, error: null }));
      const res = await fetch(`http://localhost:8000/campaigns/${id}/stats`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load campaign stats');
      setLiveStats({ loading: false, data, error: null });
    } catch (e) {
      setLiveStats({ loading: false, data: null, error: e.message });
    }
  };

  // Removed auto-fetch to declutter UI per request

  // Active bookings data
  const activeBookings = [
    {
      id: 1,
      title: 'Weekly Newsletter',
      time: '12:30 - 15:45',
      participants: [
        { initials: 'JD', bgColor: 'bg-blue-500' },
        { initials: 'AM', bgColor: 'bg-green-500' },
        { initials: 'RK', bgColor: 'bg-red-500' }
      ],
      type: 'team',
      status: 'active'
    },
    {
      id: 2,
      title: 'Cold Outreach Review',
      time: '16:30 - 20:00',
      participants: [
        { initials: 'SM', bgColor: 'bg-purple-500' },
        { initials: 'TG', bgColor: 'bg-yellow-500' }
      ],
      type: 'meeting',
      status: 'active'
    }
  ];
  
  // Fetch all backend data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setApiError(null);

      // Helper function to handle individual fetch operations
      const fetchEndpoint = async (url, setter, name) => {
        try {
          // Make sure we're using the full backend URL
          const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
          console.log(`Fetching from: ${fullUrl}`);
          
          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
          });
          if (response.ok) {
            setter(await response.json());
          } else {
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
          const errorMessage = error.message === "Failed to fetch"
            ? "Network error: Please check your connection to the backend server"
            : error.message;
          
          console.error(`Error fetching ${name}:`, errorMessage);
          // Quiet fallback: log but do not show noisy toast on initial load
          
          // Provide appropriate fallback data based on the endpoint type
          if (name === "campaigns") {
            setter([
              { id: 1, name: "Demo Campaign 1", status: "active", sent: 45, opened: 20, responded: 5 },
              { id: 2, name: "Demo Campaign 2", status: "scheduled", sent: 0, opened: 0, responded: 0 }
            ]);
          } else if (name === "contacts") {
            setter([
              { id: 1, name: "John Demo", email: "john@example.com", status: "active" },
              { id: 2, name: "Jane Demo", email: "jane@example.com", status: "active" }
            ]);
          } else if (name === "analytics data") {
            setter({ total_emails: 0, open_rate: 0, response_rate: 0, ai_services: [], weekly_stats: { emails_sent: [], opens: [], responses: [] } });
          } else {
            setter([]);
          }
        }
      };

      try {
        // Initialize default stats is now done in useState initialization

        // Fetch all data from API endpoints with correct prefixes
        await fetchEndpoint("/api/campaigns/", (campaignsData) => {
          setRecentCampaigns(campaignsData);
          // Update stats with real campaign count
          // Update both stats and navigation items with real campaign count
          const campaignCount = campaignsData.length;
          setStats(prevStats => ({
            ...prevStats,
            total_campaigns: campaignCount
          }));
          
          // Update the navigation items with the actual campaign count
          setNavigationItems(prevItems =>
            prevItems.map(item =>
              item.id === 'campaigns'
                ? { ...item, badge: campaignCount.toString() }
                : item
            )
          );
        }, "campaigns");
        
        await fetchEndpoint("/api/contacts/", (contactsData) => {
          setContacts(contactsData);
          // Update stats with real contact count
          setStats(prevStats => ({
            ...prevStats,
            total_contacts: contactsData.length
          }));
        }, "contacts");
        
        await fetchEndpoint("/api/schedules/", setSchedules, "schedules");
        await fetchEndpoint("/api/email_templates/", setTemplates, "email templates");
        
        await fetchEndpoint("/api/email_logs/", (logsData) => {
          setEmailLogs(logsData);
          // Calculate real email metrics from logs if available
          if (logsData && logsData.length > 0) {
            const sentCount = logsData.length;
            const openCount = logsData.filter(log => log.opened).length;
            const clickCount = logsData.filter(log => log.clicked).length;
            
            setStats(prevStats => ({
              ...prevStats,
              emails_sent: sentCount,
              open_rate: sentCount > 0 ? Math.round((openCount / sentCount) * 100) : 0,
              click_rate: sentCount > 0 ? Math.round((clickCount / sentCount) * 100) : 0
            }));
          }
        }, "email logs");
        
        // Try additional endpoint structures in case the first set of requests failed
        try {
          const backendUrl = 'http://localhost:8000';
          console.log("Trying direct backend endpoints");
          
          // Try direct endpoint without /api prefix
          const campaignsResponse = await fetch(`${backendUrl}/campaigns/`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
          });
          
          if (campaignsResponse.ok) {
            const campaignsData = await campaignsResponse.json();
            console.log("Found campaigns with direct endpoint:", campaignsData);
            setRecentCampaigns(campaignsData);
            setStats(prevStats => ({ ...prevStats, total_campaigns: campaignsData.length }));
          }
          
          // Try with debug endpoint
          const debugResponse = await fetch(`${backendUrl}/api/debug`, {
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
          });
          
          if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log("API debug info:", debugData);
          }
        } catch (error) {
          console.error("Error fetching from alternate URLs:", error);
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

  useEffect(() => {
    if (activeSection === 'dashboard') {
      refreshScheduledCampaigns();
    }
    
    // When navigating to campaigns section, refresh the campaign count
    if (activeSection === 'campaigns') {
      // Fetch the latest campaign count
      fetch('http://localhost:8000/api/campaigns/paginated/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      })
      .then(response => response.json())
      .then(data => {
        const campaignCount = data.total;
        console.log('Refreshed campaign count:', campaignCount);
        
        // Update stats with the latest count
        setStats(prevStats => ({
          ...prevStats,
          total_campaigns: campaignCount
        }));
        
        // Update navigation items with the latest count
        setNavigationItems(prevItems =>
          prevItems.map(item =>
            item.id === 'campaigns'
              ? { ...item, badge: campaignCount.toString() }
              : item
          )
        );
      })
      .catch(error => {
        console.error('Error refreshing campaign count:', error);
      });
    }
    
    // Update active state in navigation items when section changes
    setNavigationItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        active: item.id === activeSection
      }))
    );
  }, [activeSection]);

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

      const response = await fetch('/api/contacts/import/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formData,
        mode: 'cors',
        credentials: 'same-origin'
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`Successfully imported ${result.imported_count} contacts`, "success");
        // Refresh contacts list
        const contactsRes = await fetch("/api/contacts/", {
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
      const response = await fetch('/api/campaigns/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: newCampaignName,
          description: newCampaignDescription || '',
        }),
        mode: 'cors',
        credentials: 'same-origin'
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
    const response = await fetch(`/api/campaigns/${selectedCampaignId}/contacts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: newContactName,
        email: newContactEmail,
        linkedin_url: newContactLinkedIn || null,
      }),
      mode: 'cors',
      credentials: 'same-origin'
    });

    if (response.ok) {
      const newContact = await response.json();
      // Update contacts list
      const contactsRes = await fetch("/api/contacts/", {
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
  // Save edits to event
  const handleEditEvent = async () => {
    if (!currentEvent) return;
    const updated = {
      title: newEventTitle,
      date: new Date(activeDate).toISOString(),
      start_time: newEventStartTime,
      end_time: newEventEndTime,
      type: newEventType,
      color: newEventColor
    };
    try {
      const token = window.localStorage.getItem('token');
      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Failed to update');
      setEvents(prev => prev.map(ev => ev.id === currentEvent.id ? {
        ...ev,
        title: newEventTitle,
        time: `${newEventStartTime} — ${newEventEndTime}`,
        type: newEventType,
        color: newEventColor,
        date: new Date(activeDate)
      } : ev));
      setShowEditEventModal(false);
      showToast('Event updated', 'success');
    } catch (e) {
      // Local fallback
      setEvents(prev => prev.map(ev => ev.id === currentEvent.id ? {
        ...ev,
        title: newEventTitle,
        time: `${newEventStartTime} — ${newEventEndTime}`,
        type: newEventType,
        color: newEventColor,
        date: new Date(activeDate)
      } : ev));
      setShowEditEventModal(false);
      showToast('Updated locally (offline).', 'success');
    }
  }

  // Determine current page title
  const getPageTitle = () => {
    if (activeSection === 'campaigns' || activeSection === 'contacts' || activeSection === 'dashboard') {
      return '';
    }
    const item = [...navigationItems, ...generalItems].find(item => item.id === activeSection);
    return item ? item.name : '';
  };

  const getPageDescription = () => {
    const descriptions = {
      'dashboard': '',
      'campaigns': '',
      'contacts': '',
      'settings': 'Configure your account and platform preferences',
      'help': 'Get support and learn how to use the platform',
      'neutrino': 'Create a new email campaign'
    };
    return descriptions[activeSection] || '';
  };

  // Render section content
  const renderContent = () => {
    switch(activeSection) {
      case 'campaigns':
        return <CampaignsInterface />;
      case 'contacts':
        return <ContactsPage />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <SectionCard title="Settings" data={[]} icon={<Settings className="w-16 h-16 text-gray-300" />} />;
      case 'help':
        return <SectionCard title="Help & Support" data={[]} icon={<HelpCircle className="w-16 h-16 text-gray-300" />} />;
      case 'neutrino':
        return <NeutrinoCampaignWorkflow onClose={() => setActiveSection('dashboard')} />;
      default:
        return <DashboardHome
                  stats={stats}
                  recentCampaigns={recentCampaigns}
                  activeTimer={activeTimer}
                  toggleTimer={toggleTimer}
                  timerTime={timerTime}
                  scheduledCampaigns={scheduledCampaigns}
                  onRefreshScheduled={refreshScheduledCampaigns}
                />;
    }
  };

  return (
    <div className="flex min-h-screen bg-emerald-50 overflow-x-hidden">
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
      <div className="w-64 bg-white shadow-lg rounded-3xl m-4">
        <div className="p-6 border-b border-gray-100">
          <div>
            <span className="text-xl font-bold text-gray-900">E-maily</span>
            <div className="text-xs text-gray-500">AI-Powered Platform</div>
          </div>
        </div>
{/* Navigation */}
<nav className="mt-4 px-4">
  <MenuSection title="MAIN MENU" items={navigationItems} activeSection={activeSection} setActiveSection={setActiveSection} onLogout={() => setShowLogoutConfirm(true)} />
  <MenuSection title="GENERAL" items={generalItems} activeSection={activeSection} setActiveSection={setActiveSection} onLogout={() => setShowLogoutConfirm(true)} />
</nav>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 animate-[fadeIn_.2s_ease-out]" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-gray-100 animate-[popIn_.18s_ease-out]">
            <div className="text-lg font-semibold text-gray-900 mb-1">Log out?</div>
            <div className="text-sm text-gray-600 mb-6">You will need to log in again to access the dashboard.</div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setShowLogoutConfirm(false); onLogout && onLogout(); }} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">Log out</button>
            </div>
          </div>
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 w-full overflow-x-auto">
        <div className="bg-white rounded-3xl p-6 h-full w-full">
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
          
          <div className="mb-6 w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{getPageTitle()}</h1>
            <p className="text-gray-600 text-base">{getPageDescription()}</p>
          </div>
          
          {/* Content Grid */}
          <div className="flex flex-wrap">
            {/* Left content */}
            <div className={`${activeSection === 'campaigns' || activeSection === 'contacts' || activeSection === 'neutrino' ? 'w-full' : 'w-3/5 pr-6'}`}>
              {/* New Campaign Modal */}
              {showNewCampaignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-md">
                    <h3 className="text-xl font-bold mb-4">Create New Campaign</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                      <input
                        type="text"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                        placeholder="Enter campaign name"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                      <textarea
                        value={newCampaignDescription}
                        onChange={(e) => setNewCampaignDescription(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                        placeholder="Enter campaign description"
                        rows="3"
                      ></textarea>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowNewCampaignModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCampaign}
                        disabled={isLoading}
                        className={`px-4 py-2 bg-emerald-600 text-white rounded-xl ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-emerald-700'} flex items-center justify-center`}
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
                  <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-md">
                    <h3 className="text-xl font-bold mb-4">Add New Contact</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
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
                        className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
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
                        className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
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
                        className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                        placeholder="Enter LinkedIn profile URL"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowAddContactModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddContact}
                        disabled={isLoading}
                        className={`px-4 py-2 bg-emerald-600 text-white rounded-xl ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-emerald-700'} flex items-center justify-center`}
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
              
              {/* Main dashboard content */}
              {renderContent()}
            </div>
            
            {/* Right Content (Calendar) - Reduced size */}
            {activeSection === 'dashboard' && (
              <div className="w-1/3 flex-shrink-0 ml-4 md:ml-6 lg:ml-8">
                
                {/* Date Header */}
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {formatDate(selectedDate).month}, {formatDate(selectedDate).day} <span className="font-normal text-gray-500">{formatDate(selectedDate).dayName}</span>
                      </h2>
                    </div>
                    <div className="flex">
                      <button
                        onClick={goToPreviousMonth}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={goToNextMonth}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Calendar */}
                <div className="mb-6">
                  {/* Days of week */}
                  <div className="grid grid-cols-7 mb-1.5">
                    {weekDays.map((day, index) => (
                      <div key={index} className="text-center text-xs text-gray-500 py-1.5">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {(() => {
                      // Get first day of the month
                      const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                      // Get day of the week for first day (0-6, where 0 is Sunday)
                      const firstDayOfWeek = firstDay.getDay();
                      // Get days in current month
                      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                      // Get days in previous month
                      const daysInPrevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate();
                      
                      // Create array of all calendar cells
                      const calendarDays = [];
                      
                      // Add previous month days
                      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
                        calendarDays.push({
                          day: daysInPrevMonth - i,
                          currentMonth: false,
                          highlight: false
                        });
                      }
                      
                      // Add current month days
                      const currentDate = new Date();
                      const isCurrentMonth = currentDate.getMonth() === selectedDate.getMonth() &&
                                            currentDate.getFullYear() === selectedDate.getFullYear();
                      
                      for (let i = 1; i <= daysInMonth; i++) {
                        // Create date object for this day
                        const dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
                        
                        // Check if this date has events
                        const dayHasEvents = hasEvents(dayDate);
                        
                        // Highlight selected day
                        let highlight = false;
                        let highlightColor = '';
                        
                        // Check if this is the active date
                        const isSelectedDate =
                          activeDate.getDate() === i &&
                          activeDate.getMonth() === selectedDate.getMonth() &&
                          activeDate.getFullYear() === selectedDate.getFullYear();
                        
                        if (isSelectedDate) {
                          highlight = true;
                          highlightColor = 'bg-gray-300'; // Changed from emerald to gray
                        } else if (isCurrentMonth && i === currentDate.getDate()) {
                          // Highlight current day if viewing current month
                          highlight = true;
                          highlightColor = 'bg-gray-400'; // Changed from blue to gray
                        }
                        
                        calendarDays.push({
                          day: i,
                          currentMonth: true,
                          highlight,
                          highlightColor
                        });
                      }
                      
                      // Add next month days to fill the grid
                      const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
                      const nextMonthDays = totalCells - calendarDays.length;
                      
                      for (let i = 1; i <= nextMonthDays; i++) {
                        calendarDays.push({
                          day: i,
                          currentMonth: false,
                          highlight: false
                        });
                      }
                      
                      // Render calendar cells
                      return calendarDays.map((day, index) => {
                        // Create date object for this day (only for current month days)
                        let dayDate = null;
                        let dayHasEvents = false;
                        
                        if (day.currentMonth) {
                          dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.day);
                          dayHasEvents = hasEvents(dayDate);
                        }
                        
                        return (
                          <div
                            key={index}
                            onClick={() => {
                              if (day.currentMonth) {
                                // Set the active date to this day
                                const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.day);
                                setActiveDate(newDate);
                              }
                            }}
                            className={`text-center py-1 ${
                              !day.currentMonth ? 'text-gray-300' : 'cursor-pointer hover:bg-gray-100 rounded-lg'
                            }`}
                          >
                            <div className="relative">
                              {day.highlight ? (
                                <div className={`w-7 h-7 rounded-full ${day.highlightColor} text-white mx-auto flex items-center justify-center`}>
                                  {day.day}
                                </div>
                              ) : (
                                <div className="w-7 h-7 mx-auto flex items-center justify-center">
                                  {day.day}
                                </div>
                              )}
                              
                              {/* Event indicator dot */}
                              {day.currentMonth && dayHasEvents && (
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                
                {/* Selected Date Information */}
                <div className="mt-4 mb-3">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Events for {formatDate(activeDate).month} {formatDate(activeDate).day}, {formatDate(activeDate).year}
                  </h3>
                  
                  {/* Add Event Button */}
                  <button
                    onClick={() => setShowAddEventModal(true)}
                    className="flex items-center text-sm text-emerald-600 hover:text-emerald-800 mb-3"
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Add Event
                  </button>
                  <button
                    onClick={() => setShowAllEventsModal(true)}
                    className="ml-3 text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                  >
                    View All Events
                  </button>
                </div>
                
                {/* Events for selected date */}
                <div className="space-y-3">
                  {getEventsForDate(activeDate).length > 0 ? (
                    getEventsForDate(activeDate).map(event => (
                      <div
                        key={event.id}
                        onClick={() => openEditEventModal(event)}
                        className={`rounded-lg p-2 cursor-pointer hover:shadow-md transition-shadow ${
                          event.color === 'bg-emerald-500' ? 'bg-gray-100 border-l-4 border-gray-400' :
                          event.color === 'bg-amber-400' ? 'bg-gray-100 border-l-4 border-gray-400' :
                          'bg-gray-100 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="flex">
                          <div className={`w-8 h-8 rounded-full ${event.color} mr-2 flex items-center justify-center`}>
                            {String(event.type).toLowerCase() === 'meeting' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : String(event.type).toLowerCase() === 'work' ? (
                              <PlusCircle className="w-4 h-4 text-white" />
                            ) : (
                              <Code className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{event.title} <span className="text-xs text-gray-500">• {event.type}</span></h4>
                            <div className="text-xs text-gray-500">{event.time}</div>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              className="text-xs font-medium px-2 py-1 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 hover:border-red-300 transition transform hover:scale-[1.03] active:scale-[.98]"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm('Delete this event?')) return;
                                try {
                                  const token = window.localStorage.getItem('token');
                                  await fetch(`/api/events/${event.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                                } catch {}
                                setEvents(prev => prev.filter(ev => ev.id !== event.id));
                              }}
                            >
                              Delete
                            </button>
                            <button
                              className="text-xs font-medium px-2 py-1 rounded-lg border hover:bg-gray-50 transition transform hover:scale-[1.03] active:scale-[.98]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentEvent(event);
                                setNewEventTitle(event.title);
                                const parts = (event.time || '').split(' — ');
                                setNewEventStartTime(parts[0] || '09:00');
                                setNewEventEndTime(parts[1] || '10:00');
                                setNewEventType(event.type || 'Meeting');
                                setNewEventColor(event.color || 'bg-emerald-500');
                                setShowEditEventModal(true);
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                      No events scheduled for this date
                    </div>
                  )}
                </div>
                {/* Add Event Modal */}
                {showAddEventModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-md">
                      <h3 className="text-xl font-bold mb-4">Add New Event</h3>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title*</label>
                        <input
                          type="text"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                          placeholder="Enter event title"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={newEventStartTime}
                            onChange={(e) => setNewEventStartTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                          <input
                            type="time"
                            value={newEventEndTime}
                            onChange={(e) => setNewEventEndTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                        <select
                          value={newEventType}
                          onChange={(e) => setNewEventType(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                        >
                          <option value="meeting">Meeting</option>
                          <option value="work">Work</option>
                          <option value="development">Development</option>
                        </select>
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setNewEventColor('bg-emerald-500')}
                            className={`w-8 h-8 rounded-full bg-emerald-500 ${newEventColor === 'bg-emerald-500' ? 'ring-2 ring-offset-2 ring-emerald-500' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-amber-400')}
                            className={`w-8 h-8 rounded-full bg-amber-400 ${newEventColor === 'bg-amber-400' ? 'ring-2 ring-offset-2 ring-amber-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-rose-400')}
                            className={`w-8 h-8 rounded-full bg-rose-400 ${newEventColor === 'bg-rose-400' ? 'ring-2 ring-offset-2 ring-rose-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-blue-500')}
                            className={`w-8 h-8 rounded-full bg-blue-500 ${newEventColor === 'bg-blue-500' ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                          ></button>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setShowAddEventModal(false)}
                          className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddEvent}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                        >
                          Add Event
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Event Modal */}
                {showEditEventModal && currentEvent && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-md">
                      <h3 className="text-xl font-bold mb-4">Edit Event</h3>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title*</label>
                        <input
                          type="text"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                          placeholder="Enter event title"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={newEventStartTime}
                            onChange={(e) => setNewEventStartTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                          <input
                            type="time"
                            value={newEventEndTime}
                            onChange={(e) => setNewEventEndTime(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                        <select
                          value={newEventType}
                          onChange={(e) => setNewEventType(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                        >
                          <option value="meeting">Meeting</option>
                          <option value="work">Work</option>
                          <option value="development">Development</option>
                        </select>
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setNewEventColor('bg-emerald-500')}
                            className={`w-8 h-8 rounded-full bg-emerald-500 ${newEventColor === 'bg-emerald-500' ? 'ring-2 ring-offset-2 ring-emerald-500' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-amber-400')}
                            className={`w-8 h-8 rounded-full bg-amber-400 ${newEventColor === 'bg-amber-400' ? 'ring-2 ring-offset-2 ring-amber-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-rose-400')}
                            className={`w-8 h-8 rounded-full bg-rose-400 ${newEventColor === 'bg-rose-400' ? 'ring-2 ring-offset-2 ring-rose-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-blue-500')}
                            className={`w-8 h-8 rounded-full bg-blue-500 ${newEventColor === 'bg-blue-500' ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                          ></button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <button
                          onClick={() => handleDeleteEvent(currentEvent.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
                        >
                          Delete
                        </button>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setShowEditEventModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleEditEvent}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* All Events Modal */}
      {showAllEventsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">All Scheduled Events</h3>
              <button onClick={() => setShowAllEventsModal(false)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Close</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {events
                .slice()
                .sort((a,b) => new Date(a.date) - new Date(b.date))
                .map(ev => (
                  <div key={ev.id} className="py-3 flex items-center gap-3">
                    <span className={`inline-block w-3 h-3 rounded-full ${ev.color}`}></span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{ev.title} <span className="text-xs text-gray-500">• {ev.type}</span></div>
                      <div className="text-xs text-gray-500">{new Date(ev.date).toDateString()} • {ev.time}</div>
                    </div>
                    <div className="flex items-center gap-2 mr-3">
                      <button
                        className="text-xs font-semibold tracking-wide px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition transform hover:scale-[1.03] active:scale-[.98]"
                        onClick={() => {
                          setCurrentEvent(ev);
                          setNewEventTitle(ev.title);
                          const parts = (ev.time || '').split(' — ');
                          setNewEventStartTime(parts[0] || '09:00');
                          setNewEventEndTime(parts[1] || '10:00');
                          setNewEventType(ev.type || 'Meeting');
                          setNewEventColor(ev.color || 'bg-emerald-500');
                          setShowAllEventsModal(false);
                          setShowEditEventModal(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-semibold tracking-wide px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 hover:border-red-300 transition transform hover:scale-[1.03] active:scale-[.98]"
                        onClick={async () => {
                          if (!confirm('Delete this event?')) return;
                          try {
                            const token = window.localStorage.getItem('token');
                            await fetch(`/api/events/${ev.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                          } catch {}
                          setEvents(prev => prev.filter(x => x.id !== ev.id));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Code icon component for the calendar events
const Code = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export default Dashboard;


// ================== Reusable Components ==================

const MenuSection = ({ title, items, activeSection, setActiveSection, onLogout }) => (
  <>
    <div className="px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">
      {title}
    </div>
    <div className="space-y-1 px-3">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => {
            if (item.id === 'logout' && onLogout) {
              onLogout();
            } else {
              setActiveSection(item.id)
            }
          }}
          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
            activeSection === item.id
              ? 'bg-orange-50 text-orange-500 border-b-2 border-orange-500 shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <item.icon className={`w-5 h-5 mr-3 ${activeSection === item.id ? 'text-orange-500' : ''}`} />
          <span className="font-medium text-sm">{item.name}</span>
          {item.badge && <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">{item.badge}</span>}
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
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input type="text" placeholder="Search..."
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-60 bg-gray-50 focus:bg-white transition-all duration-200"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".csv,.xlsx,.xls"
          onChange={handleFileImport}
        />
      </div>
    </div>
  </header>
);

// Dashboard Home Content
const DashboardHome = ({ stats, recentCampaigns, activeTimer, toggleTimer, timerTime, scheduledCampaigns, onRefreshScheduled }) => (
  <>
    <div className="grid grid-cols-2 gap-x-3 gap-y-0 mb-1 w-full items-stretch">
      <div className="h-28">
        <StatCard icon={<Mail className="w-4 h-4 text-emerald-600" />} label="Total Campaigns" value={stats.total_campaigns} />
      </div>
      <div className="h-28">
        <StatCard icon={<Send className="w-4 h-4 text-teal-600" />} label="Emails Sent" value={stats.emails_sent} />
      </div>
      <div className="h-28">
        <StatCard icon={<Eye className="w-4 h-4 text-emerald-600" />} label="Open Rate" value={`${stats.open_rate}%`} />
      </div>
      <div className="h-28">
        <StatCard icon={<MousePointer className="w-4 h-4 text-teal-600" />} label="Click Rate" value={`${stats.click_rate}%`} />
      </div>
    </div>
    {/* Scheduled Campaigns */}
    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">Scheduled Campaigns</h3>
        <button onClick={onRefreshScheduled} className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50">Refresh</button>
      </div>
      <div className="divide-y">
        {scheduledCampaigns.length === 0 ? (
          <div className="text-sm text-gray-500 py-2">No scheduled campaigns</div>
        ) : (
          scheduledCampaigns.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <div className="text-sm text-gray-800">{c.name} (ID {c.id})</div>
              <button
                className="text-xs px-3 py-1.5 rounded-lg border hover:bg-red-50 text-red-700 border-red-200"
                onClick={async () => {
                  if (!confirm(`Cancel schedule for ${c.name}?`)) return;
                  try {
                    const numericId = (typeof c.id === 'string' && c.id.startsWith('#')) ? parseInt(c.id.replace('#','')) : c.id;
                    const resp = await fetch(`/api/campaigns/${numericId}/cancel-schedule`, { method: 'POST', headers: { 'Accept': 'application/json' } });
                    if (!resp.ok) throw new Error('Failed');
                    onRefreshScheduled();
                  } catch (e) {
                    alert('Failed to cancel schedule');
                  }
                }}
              >
                Cancel schedule
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  </>
);

// Stat Card
const StatCard = ({ icon, label, value }) => (
  <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 flex items-center justify-between hover:shadow-lg transition-shadow duration-200">
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
  <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6 w-full">
    <div className="flex items-center mb-4">
      {icon && <div className="mr-3">{icon}</div>}
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    </div>
    <div className="space-y-3">
      {data.length ? (
        data.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div>{item.name || item.title || `Item ${idx + 1}`}</div>
            <MoreVertical className="w-4 h-4 text-emerald-500" />
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
  <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6 w-full">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign Analytics</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} label="Open Rate" value={`${stats.open_rate || 0}%`} />
      <StatCard icon={<TrendingUp className="w-4 h-4 text-teal-600" />} label="Click Rate" value={`${stats.click_rate || 0}%`} />
      <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-500" />} label="Bounce Rate" value={`${stats.bounce_rate || 0}%`} />
    </div>
  </div>
);