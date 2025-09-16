import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Users, BarChart3, Settings, HelpCircle, LogOut,
  Search, Bell, Plus, Upload, TrendingUp, Eye, MousePointer, MoreVertical, Pause, Play, Square,
  Send, ChevronLeft, ChevronRight, PlusCircle, RefreshCw, ExternalLink, Clock, User, ArrowUpRight,
  Calendar, UserCircle, ChevronDown, Award, Target, TrendingDown
} from 'lucide-react';
import logoImage from '../assets/logo.png';
import ContactsPage from './ContactsPage';
import CampaignsInterface from './CampaignsInterface';
import NeutrinoCampaignWorkflow from './neutrino/NeutrinoCampaignWorkflow';
import Profile from './Profile';
import ScheduledCampaignsCard from './ScheduledCampaignsCard';

// CSS for calendar animations
const calendarAnimations = `
  @keyframes slideLeft {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(-20px); opacity: 0; }
  }
  
  @keyframes slideRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(20px); opacity: 0; }
  }
  
  @keyframes slideInLeft {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .calendar-container.slide-left {
    animation: slideLeft 0.2s forwards;
  }
  
  .calendar-container.slide-right {
    animation: slideRight 0.2s forwards;
  }
  
  .calendar-container.slide-in-left {
    animation: slideInLeft 0.2s forwards;
  }
  
  .calendar-container.slide-in-right {
    animation: slideInRight 0.2s forwards;
  }
`;

const Dashboard = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTimer, setActiveTimer] = useState(true);
  const [timerTime, setTimerTime] = useState('01:24:08');
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  
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
  // Define categories configuration
  const categoryConfig = [
    { category: 'clinical', display: 'Clinical / Pharmacy', color: 'from-emerald-500 to-emerald-600', icon: <User className="w-4 h-4" /> },
    { category: 'it', display: 'IT / Technology', color: 'from-blue-500 to-blue-600', icon: <Settings className="w-4 h-4" /> },
    { category: 'rd', display: 'R&D / Data', color: 'from-violet-500 to-violet-600', icon: <BarChart3 className="w-4 h-4" /> },
    { category: 'operations', display: 'Operations', color: 'from-amber-500 to-amber-600', icon: <RefreshCw className="w-4 h-4" /> },
    { category: 'sales', display: 'Sales / Partnerships', color: 'from-rose-500 to-rose-600', icon: <TrendingUp className="w-4 h-4" /> },
    { category: 'executive', display: 'Executive', color: 'from-purple-500 to-purple-600', icon: <Award className="w-4 h-4" /> },
    { category: 'other', display: 'Other', color: 'from-gray-500 to-gray-600', icon: <HelpCircle className="w-4 h-4" /> }
  ];
  const [contactCategories, setContactCategories] = useState(categoryConfig.map(cat => ({ ...cat, count: 0 })));
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [liveStats, setLiveStats] = useState({ loading: false, data: null, error: null });
  const [scheduledCampaigns, setScheduledCampaigns] = useState([]);
  
  // Campaign stats for pie chart - moved inside renderContent to access in Dashboard
  const campaignStats = {
    completed: 89,
    ongoing: 45,
    awaiting: 12,
    total: stats.total_campaigns || 0
  };
  
  // Enhanced error handling
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // UI state for dark theme
  const [selectedPlatform, setSelectedPlatform] = useState('All Platforms');
  const [selectedDateRange, setSelectedDateRange] = useState('July, 2024');

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
    // Animate the transition to previous month
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.classList.add('slide-right');
      setTimeout(() => {
        setSelectedDate(newDate);
        container.classList.remove('slide-right');
        // Add the incoming animation
        container.classList.add('slide-in-right');
        // Remove it after animation completes
        setTimeout(() => {
          container.classList.remove('slide-in-right');
        }, 200);
      }, 200);
    } else {
      setSelectedDate(newDate);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    // Animate the transition to next month
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.classList.add('slide-left');
      setTimeout(() => {
        setSelectedDate(newDate);
        container.classList.remove('slide-left');
        // Add the incoming animation
        container.classList.add('slide-in-left');
        // Remove it after animation completes
        setTimeout(() => {
          container.classList.remove('slide-in-left');
        }, 200);
      }, 200);
    } else {
      setSelectedDate(newDate);
    }
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

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // Demo data if no token
          setUserProfile({
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com'
          });
          return;
        }
        
        const response = await fetch('/api/profile', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserProfile({
            first_name: data.first_name || 'User',
            last_name: data.last_name || '',
            email: data.email || ''
          });
        } else {
          // Fallback to demo data
          setUserProfile({
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com'
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to demo data
        setUserProfile({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com'
        });
      }
    };
    
    fetchUserProfile();
  }, []);
  
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
  // Fetch contact categories (mock data for now)
  const fetchContactCategories = async () => {
    setIsLoadingCategories(true);
    
    // Simulate API call with a delay
    setTimeout(() => {
      try {
        // Generate mock data with realistic counts
        const mockCategoryCounts = {
          'clinical': Math.floor(Math.random() * 20) + 10,
          'it': Math.floor(Math.random() * 15) + 5,
          'rd': Math.floor(Math.random() * 12) + 3,
          'operations': Math.floor(Math.random() * 10) + 2,
          'sales': Math.floor(Math.random() * 25) + 15,
          'executive': Math.floor(Math.random() * 8) + 2,
          'other': Math.floor(Math.random() * 10) + 5
        };
        
        // Map mock data to our category format
        const updatedCategories = categoryConfig.map(config => {
          return {
            ...config,
            count: mockCategoryCounts[config.category] || 0
          };
        });
        
        setContactCategories(updatedCategories);
        console.log('Updated contact categories with mock data:', updatedCategories);
      } catch (err) {
        console.error('Error generating mock category data:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    }, 800); // Add a slight delay to simulate network request
  };

  useEffect(() => {
    // Fetch contact categories on mount
    fetchContactCategories();
    
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
            const demoContacts = [
              { id: 1, name: "John Demo", email: "john@example.com", status: "active", category: "clinical" },
              { id: 2, name: "Jane Demo", email: "jane@example.com", status: "active", category: "it" },
              { id: 3, name: "Robert Smith", email: "robert@example.com", status: "active", category: "rd" },
              { id: 4, name: "Sarah Jones", email: "sarah@example.com", status: "active", category: "operations" },
              { id: 5, name: "Michael Brown", email: "michael@example.com", status: "active", category: "sales" },
              { id: 6, name: "Emily Davis", email: "emily@example.com", status: "active", category: "executive" },
              { id: 7, name: "David Wilson", email: "david@example.com", status: "active", category: "other" }
            ];
            
            setter(demoContacts);
            
            // Update contact categories counts
            const categoryCounts = {};
            demoContacts.forEach(contact => {
              const category = contact.category || 'other';
              categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });
            
            // Update contact categories with real counts
            setContactCategories(prevCategories =>
              prevCategories.map(cat => ({
                ...cat,
                count: categoryCounts[cat.category] || 0
              }))
            );
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
    // Define fixed mock data for the conversion chart
    const mockConversionData = [
      { date: 'Jul 4', revenue: 150, expenses: 75, profit: 30 },
      { date: 'Jul 5', revenue: 220, expenses: 120, profit: 65 },
      { date: 'Jul 6', revenue: 180, expenses: 90, profit: 45 },
      { date: 'Jul 7', revenue: 280, expenses: 150, profit: 70 },
      { date: 'Jul 8', revenue: 250, expenses: 130, profit: 55 }
    ];
    
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
        // Create campaignStats object for dashboard use based on real campaign statuses
        const campaignCounts = Array.isArray(recentCampaigns) ? recentCampaigns.reduce((acc, c) => {
          const s = (c.status || '').toString().toLowerCase();
          if (s === 'sent') acc.completed += 1;
          else if (s === 'scheduled' || s === 'active') acc.ongoing += 1;
          else if (s === 'draft' || s === 'paused') acc.awaiting += 1;
          else acc.awaiting += 1;
          return acc;
        }, { completed: 0, ongoing: 0, awaiting: 0 }) : { completed: 0, ongoing: 0, awaiting: 0 };
        const dashboardCampaignStats = {
          completed: campaignCounts.completed,
          ongoing: campaignCounts.ongoing,
          awaiting: campaignCounts.awaiting,
          total: stats.total_campaigns || (Array.isArray(recentCampaigns) ? recentCampaigns.length : 0)
        };
        
        return <DashboardHome
                  stats={stats}
                  recentCampaigns={recentCampaigns}
                  activeTimer={activeTimer}
                  toggleTimer={toggleTimer}
                  timerTime={timerTime}
                  scheduledCampaigns={scheduledCampaigns}
                  onRefreshScheduled={refreshScheduledCampaigns}
                  selectedPlatform={selectedPlatform}
                  setSelectedPlatform={setSelectedPlatform}
                  selectedDateRange={selectedDateRange}
                  setSelectedDateRange={setSelectedDateRange}
                  mockConversionData={mockConversionData}
                  campaignStats={dashboardCampaignStats}
                  emailLogs={emailLogs}
                  campaigns={recentCampaigns}
                />;
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={activeSection}
      initial={{ y: 6 }}
      animate={{ y: 0 }}
      exit={{ y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex min-h-screen bg-gray-900 text-white overflow-x-hidden"
    >
      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-900 text-green-100 border border-green-700' : 'bg-red-900 text-red-100 border border-red-700'
        }`} role="alert">
          <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${
            toast.type === 'success' ? 'bg-green-800 text-green-400' : 'bg-red-800 text-red-400'
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
              toast.type === 'success' ? 'bg-green-800 text-green-400 hover:bg-green-700 focus:ring-green-600' : 'bg-red-800 text-red-400 hover:bg-red-700 focus:ring-red-600'
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
      <div className="w-64 bg-gray-800 shadow-lg rounded-3xl m-4 border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="NeutriReach Logo" className="h-8 w-8 object-contain rounded-lg shadow-md" />
            <div>
              <motion.div
                initial={{ opacity: 0.9 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                className="font-serif text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-400 text-transparent bg-clip-text tracking-wider leading-tight shadow-sm"
              >
                NeutriReach
              </motion.div>
              <div className="text-[10px] font-sans text-gray-400 tracking-wide uppercase">AI-Powered Platform</div>
            </div>
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
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-gray-700"
          >
            <div className="text-lg font-semibold text-white mb-1">Log out?</div>
            <div className="text-gray-400 mb-6">You will need to log in again to access the dashboard.</div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700">Cancel</button>
              <button onClick={() => { setShowLogoutConfirm(false); onLogout && onLogout(); }} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">Log out</button>
            </div>
          </motion.div>
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 w-full overflow-x-auto">
        <motion.div
          initial={{ y: 8 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-gray-800 rounded-3xl p-6 h-full w-full border border-gray-700"
        >
          <DashboardHeader
            activeTimer={activeTimer}
            toggleTimer={toggleTimer}
            timerTime={timerTime}
            setShowNewCampaignModal={setShowNewCampaignModal}
            setIsImporting={setIsImporting}
            fileInputRef={fileInputRef}
            setShowAddContactModal={setShowAddContactModal}
            handleFileImport={handleFileImport}
            userProfile={userProfile}
          />

          <div className="mb-6 w-full">
            <h1 className="text-2xl font-bold text-white mb-1">{getPageTitle()}</h1>
            <p className="text-gray-400 text-base">{getPageDescription()}</p>
          </div>

          {/* Content Grid */}
          <motion.div
            transition={{ staggerChildren: 0.05 }}
            className="flex flex-wrap"
          >
            {/* Left content */}
            <div className={`${activeSection === 'campaigns' || activeSection === 'contacts' || activeSection === 'neutrino' ? 'w-full' : 'w-3/5 pr-6'}`}>
              {/* New Campaign Modal */}
              {showNewCampaignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 rounded-2xl p-6 shadow-lg w-full max-w-md border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-white">Create New Campaign</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Campaign Name</label>
                      <input
                        type="text"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter campaign name"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
                      <textarea
                        value={newCampaignDescription}
                        onChange={(e) => setNewCampaignDescription(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter campaign description"
                        rows="3"
                      ></textarea>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowNewCampaignModal(false)}
                        className="px-4 py-2 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCampaign}
                        disabled={isLoading}
                        className={`px-4 py-2 bg-orange-500 text-white rounded-xl ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'} flex items-center justify-center`}
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
                  <div className="bg-gray-800 rounded-2xl p-6 shadow-lg w-full max-w-md border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-white">Add New Contact</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Campaign</label>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        {recentCampaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id} className="bg-gray-800">{campaign.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Name*</label>
                      <input
                        type="text"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter contact name"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Email*</label>
                      <input
                        type="email"
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter contact email"
                        required
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn URL (optional)</label>
                      <input
                        type="url"
                        value={newContactLinkedIn}
                        onChange={(e) => setNewContactLinkedIn(e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Enter LinkedIn profile URL"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowAddContactModal(false)}
                        className="px-4 py-2 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddContact}
                        disabled={isLoading}
                        className={`px-4 py-2 bg-orange-500 text-white rounded-xl ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'} flex items-center justify-center`}
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
              <motion.div initial={{ y: 6 }} animate={{ y: 0 }} transition={{ duration: 0.2 }}>
                {renderContent()}
              </motion.div>
              
              {/* Add calendar animation styles */}
              <style>{calendarAnimations}</style>
            </div>

            {/* Right Content (Calendar) - Reduced size */}
            {activeSection === 'dashboard' && (
              <div className="w-1/3 flex-shrink-0 ml-4 md:ml-6 lg:ml-8">
                {/* Date Header */}
                <motion.div
                  className="mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center">
                    <motion.div
                      key={`${selectedDate.getMonth()}-${selectedDate.getFullYear()}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-2xl font-bold text-white">
                        {formatDate(selectedDate).month}, {formatDate(selectedDate).day} <span className="font-normal text-gray-400">{formatDate(selectedDate).dayName}</span>
                      </h2>
                    </motion.div>
                    <div className="flex">
                      <motion.button
                        onClick={goToPreviousMonth}
                        className="p-1.5 text-gray-400 hover:text-white"
                        whileHover={{ scale: 1.2, x: -2 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={goToNextMonth}
                        className="p-1.5 text-gray-400 hover:text-white"
                        whileHover={{ scale: 1.2, x: 2 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Calendar */}
                <div className="mb-6 calendar-container">
                  {/* Days of week */}
                  <motion.div
                    className="grid grid-cols-7 mb-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {weekDays.map((day, index) => (
                      <motion.div
                        key={index}
                        className="text-center text-xs text-gray-400 py-1.5"
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        {day}
                      </motion.div>
                    ))}
                  </motion.div>
                  {/* Calendar grid */}
                  <motion.div
                    className="grid grid-cols-7 gap-1.5"
                    key={`${selectedDate.getMonth()}-${selectedDate.getFullYear()}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatePresence mode="wait">
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
                        const dayEvents = getEventsForDate(dayDate);
                        // Highlight selected day
                        let highlight = false;
                        let highlightColor = '';
                        // Check if this is the active date
                        const isSelectedDate =
                          activeDate.getDate() === i &&
                          activeDate.getMonth() === selectedDate.getMonth() &&
                          activeDate.getFullYear() === selectedDate.getFullYear();
                        
                        // Get the first event color for the day (if any)
                        const firstEventColor = dayEvents.length > 0 ? dayEvents[0].color : null;
                        
                        if (isSelectedDate) {
                          highlight = true;
                          // Use a more vibrant color for selected date
                          highlightColor = 'bg-purple-600';
                        } else if (isCurrentMonth && i === currentDate.getDate()) {
                          // Highlight current day if viewing current month
                          highlight = true;
                          highlightColor = 'bg-orange-500';
                        } else if (dayHasEvents && firstEventColor) {
                          // Use event color for days with events
                          highlight = true;
                          highlightColor = firstEventColor;
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
                        const row = Math.floor(index / 7);
                        const col = index % 7;
                        // Create date object for this day (only for current month days)
                        let dayDate = null;
                        let dayHasEvents = false;
                        let firstEventColor = null;
                        if (day.currentMonth) {
                          dayDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.day);
                          const dayEvents = getEventsForDate(dayDate);
                          dayHasEvents = dayEvents.length > 0;
                          firstEventColor = dayHasEvents ? dayEvents[0].color : null;
                        }
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 0.05 * (row + col/2),
                              duration: 0.2,
                              type: "spring",
                              stiffness: 200,
                              damping: 20
                            }}
                            onClick={() => {
                              if (day.currentMonth) {
                                // Set the active date to this day
                                const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day.day);
                                setActiveDate(newDate);
                              }
                            }}
                            className={`text-center py-1 ${
                              !day.currentMonth ? 'text-gray-500' : 'cursor-pointer hover:bg-gray-700 rounded-lg'
                            }`}
                            whileHover={day.currentMonth ? { scale: 1.05, transition: { duration: 0.2 } } : {}}
                          >
                            <div className="relative">
                              {day.highlight ? (
                                <motion.div
                                  className={`w-7 h-7 rounded-full ${day.highlightColor} text-white mx-auto flex items-center justify-center`}
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                  {day.day}
                                </motion.div>
                              ) : (
                                <div className="w-7 h-7 mx-auto flex items-center justify-center text-white">
                                  {day.day}
                                </div>
                              )}
                              {/* Event indicator dot - color based on event type */}
                              {day.currentMonth && dayHasEvents && (
                                <motion.div
                                  className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 ${
                                    firstEventColor || 'bg-orange-500'
                                  } rounded-full`}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.3, duration: 0.2 }}
                                ></motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      });
                    })()}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Selected Date Information */}
                <div className="mt-4 mb-3">
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">
                    Events for {formatDate(activeDate).month} {formatDate(activeDate).day}, {formatDate(activeDate).year}
                  </h3>
                  {/* Add Event Button */}
                  <button
                    onClick={() => setShowAddEventModal(true)}
                    className="flex items-center text-sm text-orange-400 hover:text-orange-300 mb-3"
                  >
                    <motion.div
                      whileHover={{ rotate: 90 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                    </motion.div>
                    Add Event
                  </button>
                  <motion.button
                    onClick={() => setShowAllEventsModal(true)}
                    className="ml-3 text-sm px-3 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-300"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    View All Events
                  </motion.button>
                </div>
                 {/* Events for selected date */}
                <motion.div
                  className="space-y-3"
                  initial={{ y: 5 }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {getEventsForDate(activeDate).length > 0 ? (
                    getEventsForDate(activeDate).map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ x: -20 }}
                        animate={{ x: 0 }}
                        transition={{
                          delay: 0.2 + index * 0.1,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                          borderLeftWidth: "6px"
                        }}
                        onClick={() => openEditEventModal(event)}
                        className={`rounded-lg p-2 cursor-pointer transition-all duration-300 ${
                          event.color === 'bg-emerald-500' ? 'bg-gray-700 border-l-4 border-emerald-500' :
                          event.color === 'bg-amber-400' ? 'bg-gray-700 border-l-4 border-amber-400' :
                          event.color === 'bg-rose-400' ? 'bg-gray-700 border-l-4 border-rose-400' :
                          event.color === 'bg-blue-500' ? 'bg-gray-700 border-l-4 border-blue-500' :
                          event.color === 'bg-purple-500' ? 'bg-gray-700 border-l-4 border-purple-500' :
                          'bg-gray-700 border-l-4 border-orange-500'
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
                            <h4 className="font-medium text-white">{event.title} <span className="text-xs text-gray-400">• {event.type}</span></h4>
                            <div className="text-xs text-gray-400">{event.time}</div>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              className="text-xs font-medium px-2 py-1 rounded-lg border border-red-700 text-red-300 bg-gray-800 hover:bg-red-900/30 hover:border-red-600 transition transform hover:scale-[1.03] active:scale-[.98]"
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
                              className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 transition transform hover:scale-[1.03] active:scale-[.98]"
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
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 bg-gray-700 rounded-lg border border-gray-600">
                      No events scheduled for this date
                    </div>
                  )}
                </motion.div>
                {/* Contact Categories Section */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-300">Contact Categories</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchContactCategories}
                      className="text-xs px-2 py-1 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-300 flex items-center"
                    >
                      {isLoadingCategories ? (
                        <>
                          <svg className="animate-spin w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Refresh
                        </>
                      )}
                    </motion.button>
                  </div>
                  
                  {/* Category Bars */}
                  <div className="space-y-3">
                    {contactCategories.map((category, index) => (
                      <motion.div
                        key={category.category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.1 + (index * 0.05),
                          type: "spring",
                          stiffness: 100,
                          damping: 15
                        }}
                        className="relative"
                      >
                        <div className="flex items-center mb-1 justify-between">
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-md bg-gradient-to-r ${category.color} flex items-center justify-center text-white mr-2`}>
                              {category.icon}
                            </div>
                            <span className="text-xs text-gray-300 font-medium">{category.display}</span>
                          </div>
                          <span className="text-xs font-bold text-white">{category.count}</span>
                        </div>
                        
                        <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (category.count / 20) * 100)}%` }}
                            transition={{
                              delay: 0.2 + (index * 0.05),
                              type: "spring",
                              stiffness: 50,
                              damping: 15
                            }}
                            className={`h-full bg-gradient-to-r ${category.color} relative`}
                          >
                            <motion.div
                              className="absolute inset-0 opacity-30"
                              initial={{ backgroundPosition: "0% 0%" }}
                              animate={{
                                backgroundPosition: ["0% 0%", "100% 100%"]
                              }}
                              transition={{
                                duration: 8,
                                repeat: Infinity,
                                repeatType: "reverse"
                              }}
                              style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)'
                              }}
                            ></motion.div>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Total Contacts */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                    className="mt-3 text-xs text-gray-400 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1 text-gray-500" />
                      <span>Total Contacts:</span>
                    </div>
                    <span className="font-bold text-white">
                      {contactCategories.reduce((sum, cat) => sum + cat.count, 0)}
                    </span>
                  </motion.div>
                </div>

               

                {/* Add Event Modal */}
                {showAddEventModal && (
                  <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="bg-gray-800 rounded-2xl p-6 shadow-lg w-full max-w-md border border-gray-700"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                      <h3 className="text-xl font-bold mb-4 text-white">Add New Event</h3>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Event Title*</label>
                        <input
                          type="text"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Enter event title"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={newEventStartTime}
                            onChange={(e) => setNewEventStartTime(e.target.value)}
                            className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                          <input
                            type="time"
                            value={newEventEndTime}
                            onChange={(e) => setNewEventEndTime(e.target.value)}
                            className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Event Type</label>
                        <select
                          value={newEventType}
                          onChange={(e) => setNewEventType(e.target.value)}
                          className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="meeting">Meeting</option>
                          <option value="work">Work</option>
                          <option value="development">Development</option>
                        </select>
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setNewEventColor('bg-emerald-500')}
                            className={`w-8 h-8 rounded-full bg-emerald-500 ${newEventColor === 'bg-emerald-500' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-emerald-500' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-amber-400')}
                            className={`w-8 h-8 rounded-full bg-amber-400 ${newEventColor === 'bg-amber-400' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-amber-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-rose-400')}
                            className={`w-8 h-8 rounded-full bg-rose-400 ${newEventColor === 'bg-rose-400' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-rose-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-blue-500')}
                            className={`w-8 h-8 rounded-full bg-blue-500 ${newEventColor === 'bg-blue-500' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500' : ''}`}
                          ></button>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <motion.button
                          onClick={() => setShowAddEventModal(false)}
                          className="px-4 py-2 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-700"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          onClick={handleAddEvent}
                          className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
                          whileHover={{ scale: 1.05, backgroundColor: '#ea580c' }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Add Event
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* Edit Event Modal */}
                {showEditEventModal && currentEvent && (
                  <motion.div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="bg-gray-800 rounded-2xl p-6 shadow-lg w-full max-w-md border border-gray-700"
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                      <motion.h3
                        className="text-xl font-bold mb-4 text-white"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        Edit Event
                      </motion.h3>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Event Title*</label>
                        <input
                          type="text"
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Enter event title"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={newEventStartTime}
                            onChange={(e) => setNewEventStartTime(e.target.value)}
                            className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                          <input
                            type="time"
                            value={newEventEndTime}
                            onChange={(e) => setNewEventEndTime(e.target.value)}
                            className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Event Type</label>
                        <select
                          value={newEventType}
                          onChange={(e) => setNewEventType(e.target.value)}
                          className="w-full p-2 border border-gray-600 rounded-xl bg-gray-700 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="meeting">Meeting</option>
                          <option value="work">Work</option>
                          <option value="development">Development</option>
                        </select>
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setNewEventColor('bg-emerald-500')}
                            className={`w-8 h-8 rounded-full bg-emerald-500 ${newEventColor === 'bg-emerald-500' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-emerald-500' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-amber-400')}
                            className={`w-8 h-8 rounded-full bg-amber-400 ${newEventColor === 'bg-amber-400' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-amber-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-rose-400')}
                            className={`w-8 h-8 rounded-full bg-rose-400 ${newEventColor === 'bg-rose-400' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-rose-400' : ''}`}
                          ></button>
                          <button
                            onClick={() => setNewEventColor('bg-blue-500')}
                            className={`w-8 h-8 rounded-full bg-blue-500 ${newEventColor === 'bg-blue-500' ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500' : ''}`}
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
                          <motion.button
                            onClick={() => setShowEditEventModal(false)}
                            className="px-4 py-2 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-700"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            onClick={handleEditEvent}
                            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
                            whileHover={{ scale: 1.05, backgroundColor: '#ea580c' }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Update
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            )}
            
            {/* Only render Pie Chart on Dashboard page */}
            {activeSection === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                className="bg-gray-800 rounded-2xl p-6 mt-6 relative overflow-hidden"
              >
                {/* Background decoration */}
                <motion.div
                  className="absolute -right-16 -top-16 w-32 h-32 bg-orange-500/10 rounded-full blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                ></motion.div>
                
              

             
                 

                
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* All Events Modal */}
      {showAllEventsModal && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: .98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: .98 }}
            transition={{ duration: .2, type: "spring", stiffness: 300, damping: 25 }}
            className="bg-gray-800 rounded-2xl p-6 shadow-lg w-full max-w-2xl border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <motion.h3
                className="text-xl font-bold text-white"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                All Scheduled Events
              </motion.h3>
              <motion.button
                onClick={() => setShowAllEventsModal(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-700">
              {events
                .slice()
                .sort((a,b) => new Date(a.date) - new Date(b.date))
                .map((ev, index) => (
                  <motion.div
                    key={ev.id}
                    className="py-3 flex items-center gap-3 border-b border-gray-700 last:border-b-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index, duration: 0.2 }}
                    whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.3)', borderRadius: '0.5rem' }}
                  >
                    <motion.span
                      className={`inline-block w-3 h-3 rounded-full ${ev.color}`}
                      whileHover={{ scale: 1.5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    ></motion.span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{ev.title} <span className="text-xs text-gray-400">• {ev.type}</span></div>
                      <div className="text-xs text-gray-400">{new Date(ev.date).toDateString()} • {ev.time}</div>
                    </div>
                    <div className="flex items-center gap-2 mr-3">
                      <motion.button
                        className="text-xs font-semibold tracking-wide px-2.5 py-1.5 rounded-lg border border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700"
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(75, 85, 99, 0.8)' }}
                        whileTap={{ scale: 0.95 }}
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
                      </motion.button>
                      <motion.button
                        className="text-xs font-semibold tracking-wide px-2.5 py-1.5 rounded-lg border border-red-700 text-red-300 bg-gray-800 hover:bg-red-900/30 hover:border-red-600"
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(153, 27, 27, 0.3)' }}
                        whileTap={{ scale: 0.95 }}
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
                      </motion.button>
                    </div>
                  </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
    </AnimatePresence>
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
              ? 'bg-orange-900/30 text-orange-400 border-l-2 border-orange-500'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <item.icon className={`w-5 h-5 mr-3 ${activeSection === item.id ? 'text-orange-400' : 'text-gray-400'}`} />
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
  handleFileImport,
  userProfile
}) => {
  // Get user's first name from the userProfile
  const userName = userProfile?.first_name || 'User';
  
  return (
  <header className="bg-gray-800 shadow-sm border-b border-gray-700">
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-white">
            Hi <span className="text-orange-500">{userName}</span>, welcome back!
          </h2>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 bg-gray-700 rounded-full text-gray-400 hover:text-white">
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
};

// Dashboard Home Content
const DashboardHome = ({
  stats,
  recentCampaigns,
  activeTimer,
  toggleTimer,
  timerTime,
  scheduledCampaigns,
  onRefreshScheduled,
  selectedPlatform,
  setSelectedPlatform,
  selectedDateRange,
  setSelectedDateRange,
  campaignStats,
  emailLogs,
  campaigns,
  mockConversionData
}) => {
  // Mock data for the dashboard
  const metrics = {
    activeCampaigns: stats.total_campaigns || 0,
    emailsDelivered: stats.emails_sent || 0,
    totalSubscribers: stats.total_contacts || 0,
    campaignsChange: 12.5,
    emailsChange: 8.2,
    subscribersChange: 18.7
  };

  // Build conversion data from real logs: delivered, opens, clicks per day (last 5 days)
  // Use mock data from props if available, otherwise generate it from email logs
  const conversionData = mockConversionData || (() => {
    try {
      const logs = Array.isArray(emailLogs) ? emailLogs : [];
      const byDay = new Map();
      const toKey = (d) => new Date(d).toISOString().slice(0,10);
      logs.forEach(l => {
        const key = toKey(l.sent_at || l.created_at || new Date());
        if (!byDay.has(key)) byDay.set(key, { delivered: 0, opens: 0, clicks: 0 });
        const entry = byDay.get(key);
        entry.delivered += 1;
        if (l.opened) entry.opens += 1;
        if (l.clicked) entry.clicks += 1;
      });
      // Take last 5 days chronologically
      const keys = Array.from(byDay.keys()).sort().slice(-5);
      if (keys.length === 0) return [
        { date: 'Jul 4', revenue: 150, expenses: 75, profit: 30 },
        { date: 'Jul 5', revenue: 220, expenses: 120, profit: 65 },
        { date: 'Jul 6', revenue: 180, expenses: 90, profit: 45 },
        { date: 'Jul 7', revenue: 280, expenses: 150, profit: 70 },
        { date: 'Jul 8', revenue: 250, expenses: 130, profit: 55 }
      ];
      return keys.map(k => {
        const { delivered, opens, clicks } = byDay.get(k);
        // Map: revenue->delivered, expenses->opens, profit->clicks
        return { date: new Date(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), revenue: delivered, expenses: opens, profit: clicks };
      });
    } catch {
      return [
        { date: 'Jul 4', revenue: 150, expenses: 75, profit: 30 },
        { date: 'Jul 5', revenue: 220, expenses: 120, profit: 65 },
        { date: 'Jul 6', revenue: 180, expenses: 90, profit: 45 },
        { date: 'Jul 7', revenue: 280, expenses: 150, profit: 70 },
        { date: 'Jul 8', revenue: 250, expenses: 130, profit: 55 }
      ];
    }
  })();

  // Use the campaignStats prop passed from parent
  // No need to redefine it here

  return (
    <>
      {/* Header with date and platform selector */}
     

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Active Campaigns */}
        <div className="bg-gray-800 rounded-2xl p-6 border-l-4 border-orange-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Active Campaigns</div>
              <div className="text-3xl font-bold">{(metrics.activeCampaigns || 0).toLocaleString()}</div>
            </div>
            <div className="flex items-center text-green-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+{metrics.campaignsChange}%</span>
            </div>
          </div>
        </div>

        {/* Emails Delivered */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Emails Delivered</div>
              <div className="text-3xl font-bold">{(metrics.emailsDelivered || 0).toLocaleString()}</div>
            </div>
            <div className="flex items-center text-green-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+{metrics.emailsChange}%</span>
            </div>
          </div>
        </div>

        {/* Total Subscribers */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Total subscribers</div>
              <div className="text-3xl font-bold">{(metrics.totalSubscribers || 0).toLocaleString()}</div>
            </div>
            <div className="flex items-center text-green-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm">+{metrics.subscribersChange}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full mb-8">
        {/* Conversion Chart */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Conversion</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{selectedDateRange}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative h-64">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
             
            </div>

            {/* Chart bars */}
            <div className="ml-8 h-full flex items-end justify-between space-x-4">
              {conversionData.map((data, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  {/* Stacked bars */}
                  <div className="relative flex flex-col items-center" style={{ height: '200px' }}>
                    {/* Clicks (purple with stripes) */}
                    <motion.div
                      initial={{ height: 0, opacity: 0, scale: 0.9 }}
                      animate={{
                        height: `${(data.profit / 100) * 200}px`,
                        opacity: 1,
                        scale: 1
                      }}
                      whileHover={{
                        scale: 1.05,
                        filter: "brightness(1.2)"
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                        delay: index * 0.1,
                        mass: 0.8
                      }}
                      className="w-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t relative overflow-hidden cursor-pointer"
                    >
                      <motion.div
                        className="absolute inset-0 opacity-50"
                        initial={{ backgroundPosition: "0% 0%" }}
                        animate={{
                          backgroundPosition: ["0% 0%", "100% 100%"]
                        }}
                        transition={{
                          duration: 10,
                          repeat: Infinity,
                          repeatType: "reverse"
                        }}
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)'
                        }}
                      ></motion.div>
                      <motion.div
                        initial={{ y: -20 }}
                        whileHover={{ y: 0 }}
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                      >
                        Clicks: {data.profit}
                      </motion.div>
                    </motion.div>
                    {/* Opens (red/orange) */}
                    <motion.div
                      initial={{ height: 0, opacity: 0, scale: 0.9 }}
                      animate={{
                        height: `${(data.expenses / 100) * 200}px`,
                        opacity: 1,
                        scale: 1
                      }}
                      whileHover={{
                        scale: 1.05,
                        filter: "brightness(1.2)"
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 15,
                        delay: index * 0.1 + 0.2,
                        mass: 0.8
                      }}
                      className="w-8 bg-gradient-to-r from-red-500 to-orange-500 cursor-pointer"
                    >
                      <motion.div
                        initial={{ y: -20 }}
                        whileHover={{ y: 0 }}
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                      >
                        Opens: {data.expenses}
                      </motion.div>
                    </motion.div>
                    {/* Delivered (yellow) */}
                    <motion.div
                      initial={{ height: 0, opacity: 0, scale: 0.9 }}
                      animate={{
                        height: `${(Math.max(0, data.revenue - data.expenses - data.profit) / 100) * 200}px`,
                        opacity: 1,
                        scale: 1
                      }}
                      whileHover={{
                        scale: 1.05,
                        filter: "brightness(1.2)"
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 15,
                        delay: index * 0.1 + 0.4,
                        mass: 0.8
                      }}
                      className="w-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-b cursor-pointer"
                    >
                      <motion.div
                        initial={{ y: -20 }}
                        whileHover={{ y: 0 }}
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
                      >
                        Delivered: {Math.max(0, data.revenue - data.expenses - data.profit)}
                      </motion.div>
                    </motion.div>
                  </div>
                  <motion.span
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    transition={{
                      delay: index * 0.1 + 0.2,
                      duration: 0.3
                    }}
                    className="text-xs text-gray-400"
                  >
                    {data.date}
                  </motion.span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart legend and metrics */}
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{
              delay: 0.8,
              type: "spring",
              stiffness: 100,
              damping: 20
            }}
            className="mt-6 grid grid-cols-3 gap-4 text-sm"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="flex items-center mb-1">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, type: "spring" }}
                  className="w-3 h-3 bg-yellow-500 rounded mr-2"
                ></motion.div>
                <span className="text-gray-400">Emails Delivered</span>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="text-lg font-semibold"
              >
                {(metrics.emailsDelivered || 0).toLocaleString()}
              </motion.div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="flex items-center mb-1">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.0, type: "spring" }}
                  className="w-3 h-3 bg-orange-500 rounded mr-2"
                ></motion.div>
                <span className="text-gray-400">Opens</span>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="text-lg font-semibold"
              >
                {(stats.open_rate || 0).toLocaleString()}%
              </motion.div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="flex items-center mb-1">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.1, type: "spring" }}
                  className="w-3 h-3 bg-purple-500 rounded mr-2"
                ></motion.div>
                <span className="text-gray-400">Clicks</span>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-lg font-semibold"
              >
                {(stats.click_rate || 0).toLocaleString()}%
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Success message */}
          <motion.div
            initial={{ x: -20 }}
            animate={{ x: 0 }}
            transition={{
              delay: 1.3,
              type: "spring",
              stiffness: 100,
              damping: 20
            }}
            className="mt-4 flex items-center bg-gray-700/50 rounded-lg p-3"
          >
            <motion.div
              initial={{ rotate: -45, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{
                delay: 1.4,
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
            >
              <Award className="w-5 h-5 text-green-400 mr-2" />
            </motion.div>
            <span className="text-sm text-gray-300">
              July, 5 is the most profitable day in this month. <span className="text-green-400 font-medium">Good job!</span>
            </span>
          </motion.div>
        </div>
      </div>
      
      
      
      {/* Scheduled Campaigns Card - Now placed under the chart */}
      <div className="w-full mb-8">
        <ScheduledCampaignsCard
          campaigns={scheduledCampaigns.map(c => ({
            id: c.id,
            name: c.name,
            scheduled_time: c.scheduled_time || new Date().toISOString()
          }))}
          onRefresh={onRefreshScheduled}
          title="Scheduled Campaigns"
        />
      </div>
    </>
  );
};

// Stat Card
const StatCard = ({ icon, label, value }) => (
  <motion.div
    initial={{ y: 20 }}
    animate={{ y: 0 }}
    transition={{
      type: "spring",
      stiffness: 100,
      damping: 20
    }}
    whileHover={{
      scale: 1.03,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
      borderColor: "rgba(239, 127, 26, 0.4)"
    }}
    className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between transition-all duration-300"
  >
    <div className="flex items-center space-x-2">
      <motion.div
        whileHover={{ rotate: 10, scale: 1.1 }}
        className="p-1.5 bg-gray-700 rounded-lg text-gray-300"
      >
        {icon}
      </motion.div>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-white"
        >
          {value}
        </motion.div>
      </div>
    </div>
  </motion.div>
);

// Section Card
const SectionCard = ({ title, data, icon }) => (
  <div className="bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-700 mb-6 w-full">
    <div className="flex items-center mb-4">
      {icon && <div className="mr-3 text-gray-300">{icon}</div>}
      <h2 className="text-2xl font-bold text-white">{title}</h2>
    </div>
    <div className="space-y-3">
      {data.length ? (
        data.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors">
            <div className="text-white">{item.name || item.title || `Item ${idx + 1}`}</div>
            <MoreVertical className="w-4 h-4 text-orange-400" />
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
  <motion.div
    initial={{ y: 20 }}
    animate={{ y: 0 }}
    transition={{
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay: 0.2
    }}
    className="bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-700 mb-6 w-full relative overflow-hidden"
  >
    {/* Background decoration */}
    <motion.div
      className="absolute -left-16 -bottom-16 w-32 h-32 bg-teal-500/10 rounded-full blur-xl"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.1, 0.2, 0.1]
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        repeatType: "reverse"
      }}
    ></motion.div>
    
    <motion.h2
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-2xl font-bold text-white mb-4"
    >
      Campaign Analytics
    </motion.h2>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      <StatCard icon={<TrendingUp className="w-4 h-4 text-orange-400" />} label="Open Rate" value={`${stats.open_rate || 0}%`} />
      <StatCard icon={<TrendingUp className="w-4 h-4 text-teal-400" />} label="Click Rate" value={`${stats.click_rate || 0}%`} />
      <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-400" />} label="Bounce Rate" value={`${stats.bounce_rate || 0}%`} />
    </div>
  </motion.div>
)