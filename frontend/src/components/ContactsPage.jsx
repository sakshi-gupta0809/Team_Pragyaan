import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, ExternalLink, Trash2, Plus, X, ChevronDown } from 'lucide-react';

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [totalContacts, setTotalContacts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactInfo, setNewContactInfo] = useState({
    name: '',
    email: '',
    linkedin: '',
    company: '',
    designation: ''
  });

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Fetch contacts based on filters and pagination
  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
        if (selectedCampaign) params.append('campaign_id', selectedCampaign);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        params.append('page', currentPage);
        params.append('page_size', pageSize);

        const response = await fetch(`http://localhost:8000/api/contacts?${params.toString()}`, {
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
          setTotalContacts(data.total || 0);
          setCurrentPage(data.page || 1);
        } else {
          throw new Error(`Failed to fetch contacts: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
        const errorMessage = err.message.includes('Failed to fetch')
          ? 'Unable to connect to the server. Please check if the server is running and the database is configured correctly.'
          : 'Failed to load contacts. Please try again later.';
        setError(errorMessage);
        setContacts([]);
        setTotalContacts(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [debouncedSearchTerm, selectedCampaign, selectedStatus, currentPage, pageSize]);

  // Fetch campaigns for dropdown
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/campaigns', {
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data || []);
        } else {
          throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setCampaigns([]);
      }
    };

    fetchCampaigns();
  }, []);

  // Handle pagination
  const goToNextPage = () => {
    const totalPages = Math.ceil(totalContacts / pageSize);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalContacts / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalContacts);

  const deleteContact = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      setDeletingId(contactId);
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete contact');
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setTotalContacts(prev => Math.max(0, prev - 1));
    } catch (e) {
      alert('Failed to delete contact');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddContact = async () => {
    if (!newContactInfo.name || !newContactInfo.email) {
      alert('Name and email are required');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newContactInfo)
      });
      
      if (response.ok) {
        const newContact = await response.json();
        setContacts(prev => [newContact, ...prev]);
        setTotalContacts(prev => prev + 1);
        setNewContactInfo({
          name: '',
          email: '',
          linkedin: '',
          company: '',
          designation: ''
        });
        setShowAddContactModal(false);
      } else {
        throw new Error('Failed to add contact');
      }
    } catch (err) {
      alert('Failed to add contact. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key="contacts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
          {/* Header */}
          <motion.div className="bg-gray-800 border-b border-gray-700 rounded-b-3xl shadow-sm w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}>
            <div className="w-full px-6 py-4 max-w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-semibold">Contacts</h1>
                </div>
                <div className="flex items-center space-x-4">
               
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <div className="bg-gray-800 border-b border-gray-700 mb-6 w-full">
            <div className="w-full px-6 max-w-full">
              <div className="flex space-x-8">
                <button className="py-4 px-1 border-b-2 border-orange-500 text-white font-medium">
                  All Contacts
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full px-6 pb-6 max-w-full">
            {/* Search and Filter Bar */}
            <div className="flex items-center justify-between mb-6 w-full">
              <div className="flex items-center space-x-4 flex-wrap gap-4">
                {/* Search box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    className="pl-10 pr-4 py-2 border border-gray-600 rounded-xl w-80 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-700 text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Campaign dropdown */}
                <div className="relative">
                  <select
                    className="appearance-none bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 pr-10 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                  >
                    <option value="">All Campaigns</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id} className="bg-gray-800">
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                {/* Status dropdown */}
                <div className="relative">
                  <select
                    className="appearance-none bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 pr-10 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="subscribed">Subscribed</option>
                    <option value="unsubscribed">Unsubscribed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {totalContacts > 0 ? `${startRecord}-${endRecord} of ${totalContacts}` : '0-0 of 0'}
                </span>
                <div className="flex items-center space-x-1">
                  <button 
                    className={`p-1 ${currentPage > 1 ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-600 cursor-not-allowed'} rounded`}
                    onClick={goToPreviousPage}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">{currentPage}</button>
                  <button 
                    className={`p-1 ${currentPage < totalPages ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-600 cursor-not-allowed'} rounded`}
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Contacts Table */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }} className="bg-gray-800 rounded-3xl shadow-sm overflow-hidden border border-gray-700 w-full">
              {/* Loading State */}
              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-400">{error}</div>
              ) : contacts.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p className="text-lg font-medium">No contacts found</p>
                  <p className="mt-1">Try adjusting your filters or add new contacts</p>
                </div>
              ) : (
                <div
                  className="overflow-x-auto w-full custom-scrollbar"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#4b5563 #1f2937'
                  }}
                >
                  <div className="min-w-[1200px]">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-3 px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600 text-sm font-semibold tracking-wide text-gray-200 rounded-t-3xl w-full shadow-sm">
                      <div className="col-span-1 text-center">
                        <span className="border-b-2 border-orange-500 pb-1">ID</span>
                      </div>
                      <div className="col-span-1">
                        <span className="border-b-2 border-orange-500 pb-1">Name</span>
                      </div>
                      <div className="col-span-2">
                        <span className="border-b-2 border-orange-500 pb-1">Email</span>
                      </div>
                      <div className="col-span-1">
                        <span className="border-b-2 border-orange-500 pb-1">Campaign</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="bg-gray-700/70 px-2 py-1 rounded-lg inline-block w-full text-xs">Status</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="bg-emerald-900/30 text-emerald-300 px-2 py-1 rounded-lg inline-block w-full text-xs">LinkedIn</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="border-b-2 border-orange-500 pb-1">Job</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="border-b-2 border-orange-500 pb-1">Company</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="bg-amber-900/30 text-amber-300 px-2 py-1 rounded-lg inline-block w-full text-xs">Category</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="bg-orange-900/30 text-orange-300 px-2 py-1 rounded-lg inline-block w-full text-xs">Last Contact</span>
                      </div>
                      <div className="col-span-1 text-right pr-2">
                        <span className="text-gray-400 text-xs">Actions</span>
                      </div>
                    </div>
                    {/* Contact Rows */}
                    {contacts.map((contact, index) => (
                      <motion.div
                        key={contact.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.05 }}
                        className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-700 hover:bg-gray-700/70 hover:shadow-md transition-all duration-200 w-full"
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <div className="text-sm text-gray-400">{contact.id}</div>
                        </div>
                        
                        <div className="col-span-1">
                          <div className="flex items-center space-x-2 w-full">
                            <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                            <div className="min-w-0 w-full">
                              <div className="font-medium text-white truncate w-full">{contact.name}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-span-2">
                          <div className="text-sm text-gray-400 truncate w-full">{contact.email}</div>
                        </div>
                        
                        <div className="col-span-1">
                          <div className="text-sm text-gray-400 truncate w-full">{contact.campaign_name || 'No Campaign'}</div>
                        </div>
                        
                        <div className="col-span-1 text-center">
                          <motion.div
                            className={`px-2 py-1 rounded-xl shadow-sm font-medium inline-flex justify-center w-full text-xs ${
                              contact.unsubscribed
                                ? "bg-red-900/20 text-red-400"
                                : "bg-emerald-900/20 text-emerald-400"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            {contact.unsubscribed ? 'Unsub' : 'Active'}
                          </motion.div>
                        </div>
                        
                        <div className="col-span-1 text-center">
                          <motion.div
                            className="bg-emerald-900/20 px-2 py-1 rounded-xl shadow-sm font-medium text-emerald-400 inline-flex justify-center w-full"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            {contact.linkedin_url ? (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 flex items-center justify-center w-full"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              '-'
                            )}
                          </motion.div>
                        </div>
                        
                        <div className="col-span-1 text-center">
                          <div className="text-sm text-gray-400 truncate w-full">{contact.designation || '-'}</div>
                        </div>
                        
                        <div className="col-span-1 text-center">
                          <div className="text-sm text-gray-400 truncate w-full">{contact.company || '-'}</div>
                        </div>
                        
                        <div className="col-span-1 text-center">
                          <motion.div
                            className="bg-amber-900/20 px-2 py-1 rounded-xl shadow-sm font-medium text-amber-400 inline-flex justify-center w-full"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            {contact.category || '-'}
                          </motion.div>
                        </div>
                        
                        <div className="col-span-1 text-center">
                          <motion.div
                            className="bg-orange-900/20 px-2 py-1 rounded-xl shadow-sm font-medium text-orange-400 inline-flex justify-center w-full"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            {contact.last_contacted ? new Date(contact.last_contacted).toLocaleDateString() : 'Never'}
                          </motion.div>
                        </div>
                        
                        <div className="col-span-1 flex items-center justify-end">
                          <motion.button
                            className="p-1.5 bg-gray-700/70 hover:bg-red-900/40 rounded-lg transition-colors shadow-sm"
                            title="Delete contact"
                            onClick={() => deleteContact(contact.id)}
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                            disabled={deletingId === contact.id}
                          >
                            <Trash2 className={`w-4 h-4 ${deletingId === contact.id ? 'text-gray-600' : 'text-red-400'}`} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      
    </div>
  );
};

export default ContactsPage;