
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Sparkles, Trash2, CalendarClock, X } from 'lucide-react';
import NeutrinoCampaignWorkflow from './neutrino/NeutrinoCampaignWorkflow';
import CampaignDetails from './CampaignDetails';

const CampaignsInterface = () => {
  const [showNeutrinoWorkflow, setShowNeutrinoWorkflow] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All statuses');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [viewCampaignId, setViewCampaignId] = useState(null);
  const [scheduleModal, setScheduleModal] = useState({ open: false, id: null, date: '' });

  const statusOptions = ['All statuses', 'Draft', 'Sent', 'Scheduled', 'Paused'];

  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoading(true);
      try {
        const url = `http://localhost:8000/api/campaigns/paginated/?page=${currentPage}&page_size=10&status=${selectedStatus !== 'All statuses' ? selectedStatus.toLowerCase() : ''}&search=${searchQuery}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data.campaigns);
          setTotalCampaigns(data.total);
        } else {
          console.error('Failed to fetch campaigns:', await response.text());
          setCampaigns([]);
          setTotalCampaigns(0);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        setCampaigns([]);
        setTotalCampaigns(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, [currentPage, selectedStatus, searchQuery]);

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleCheckboxChange = (campaignId) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      } else {
        return [...prev, campaignId];
      }
    });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      setSelectedCampaigns(campaigns.map(campaign => campaign.id));
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    try {
      const numericId = typeof campaignId === 'string' && campaignId.startsWith('#') ? parseInt(campaignId.replace('#','')) : campaignId;
      if (!window.confirm('Are you sure you want to delete this campaign? This cannot be undone.')) return;
      const res = await fetch(`/api/campaigns/${numericId}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete campaign');
      }
      setCampaigns(prev => prev.filter(c => {
        const idVal = typeof c.id === 'string' && c.id.startsWith('#') ? parseInt(c.id.replace('#','')) : c.id;
        return idVal !== numericId;
      }));
      setSelectedCampaigns(prev => prev.filter(id => id !== numericId && id !== `#${numericId}`));
    } catch (e) {
      console.error('Delete failed:', e);
      alert('Failed to delete campaign.');
    }
  };

  const handlePagination = (page) => {
    setCurrentPage(page);
  };

  const handleScheduleCampaign = (campaignId) => {
    const numericId = typeof campaignId === 'string' && campaignId.startsWith('#') ? parseInt(campaignId.replace('#','')) : campaignId;
    setScheduleModal({ open: true, id: numericId, date: '' });
  };

  const submitSchedule = async () => {
    if (!scheduleModal.id) return;
    try {
      const query = scheduleModal.date ? `?start_date=${encodeURIComponent(scheduleModal.date)}` : '';
      const res = await fetch(`/scheduler/schedule-campaign/${scheduleModal.id}${query}`, { method: 'POST', headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(await res.text());
      setCampaigns(prev => prev.map(c => {
        const idVal = typeof c.id === 'string' && c.id.startsWith('#') ? parseInt(c.id.replace('#','')) : c.id;
        return idVal === scheduleModal.id ? { ...c, status: 'scheduled' } : c;
      }));
      setScheduleModal({ open: false, id: null, date: '' });
    } catch (e) {
      alert('Failed to schedule campaign');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false}>
      {showNeutrinoWorkflow ? (
        <motion.div key="neutrino" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
          <NeutrinoCampaignWorkflow onClose={() => setShowNeutrinoWorkflow(false)} />
        </motion.div>
      ) : viewCampaignId ? (
        <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
          <CampaignDetails campaignId={viewCampaignId} onBack={() => setViewCampaignId(null)} />
        </motion.div>
      ) : (
        <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
          {/* Header */}
          <motion.div className="bg-gray-800 border-b border-gray-700 rounded-b-3xl shadow-sm w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}>
            <div className="w-full px-6 py-4 max-w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-semibold">Campaigns</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowNeutrinoWorkflow(true)}
                    className="bg-orange-500 text-white px-6 py-2 rounded-xl font-medium transition-colors flex items-center shadow-sm hover:shadow-md hover:bg-orange-600"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Campaign
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <div className="bg-gray-800 border-b border-gray-700 mb-6 w-full">
            <div className="w-full px-6 max-w-full">
              <div className="flex space-x-8">
                <button className="py-4 px-1 border-b-2 border-orange-500 text-white font-medium">
                  Email
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full px-6 pb-6 max-w-full">
            {/* Search and Filter Bar */}
            <div className="flex items-center justify-between mb-6 w-full">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for a campaign"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10 pr-4 py-2 border border-gray-600 rounded-xl w-80 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-700 text-white"
                  />
                </div>
                
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    className="appearance-none bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 pr-10 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status} className="bg-gray-800">{status}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {campaigns.length > 0 ? `${(currentPage - 1) * 10 + 1}-${Math.min(currentPage * 10, totalCampaigns)} of ${totalCampaigns}` : '0-0 of 0'}
                </span>
                <div className="flex items-center space-x-1">
                  <button 
                    className={`p-1 ${currentPage > 1 ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-600 cursor-not-allowed'} rounded`}
                    onClick={() => currentPage > 1 && handlePagination(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">{currentPage}</button>
                  <button 
                    className={`p-1 ${currentPage < Math.ceil(totalCampaigns / 10) ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-600 cursor-not-allowed'} rounded`}
                    onClick={() => currentPage < Math.ceil(totalCampaigns / 10) && handlePagination(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalCampaigns / 10)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign Table */}
            <motion.div className="bg-gray-800 rounded-3xl shadow-sm border border-gray-700 overflow-x-auto w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}>
              {selectedCampaigns.length > 0 && (
                <div className="flex justify-between items-center px-6 py-3 bg-red-900/30 border-b border-red-800/30 rounded-t-3xl">
                  <div className="text-sm text-red-300">{selectedCampaigns.length} selected</div>
                  <button
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    onClick={async () => {
                      const ids = selectedCampaigns.map(id => typeof id === 'string' && id.startsWith('#') ? parseInt(id.replace('#','')) : id);
                      if (!window.confirm(`Delete ${ids.length} selected campaign(s)? This cannot be undone.`)) return;
                      try {
                        const res = await fetch('/api/campaigns/bulk-delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                          body: JSON.stringify({ ids })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.detail || 'Bulk delete failed');
                        setCampaigns(prev => prev.filter(c => {
                          const numericId = typeof c.id === 'string' && c.id.startsWith('#') ? parseInt(c.id.replace('#','')) : c.id;
                          return !ids.includes(numericId);
                        }));
                        setSelectedCampaigns([]);
                      } catch (e) {
                        alert('Failed to bulk delete campaigns');
                      }
                    }}
                  >
                    Delete Selected
                  </button>
                </div>
              )}
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-6 py-5 bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600 text-sm font-semibold tracking-wide text-gray-200 rounded-t-3xl w-full shadow-sm">
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    className="rounded border-gray-500 bg-gray-800 h-4 w-4 shadow-sm cursor-pointer"
                    onChange={handleSelectAllChange}
                    checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                  />
                </div>
                <div className="col-span-4 flex items-center">
                  <span className="border-b-2 border-orange-500 pb-1">Campaign</span>
                </div>
                <div className="col-span-1 text-center px-0.5">
                  <span className="bg-gray-700/70 px-0.5 py-1 rounded-lg inline-block w-full text-xs">Rcpt</span>
                </div>
                <div className="col-span-1 text-center px-0.5">
                  <span className="bg-emerald-900/30 text-emerald-300 px-0.5 py-1 rounded-lg inline-block w-full text-xs">Opens</span>
                </div>
                <div className="col-span-1 text-center px-0.5">
                  <span className="bg-amber-900/30 text-amber-300 px-0.5 py-1 rounded-lg inline-block w-full text-xs">Clicks</span>
                </div>
                <div className="col-span-1 text-center px-0.5">
                  <span className="bg-red-900/30 text-red-300 px-0.5 py-1 rounded-lg inline-block w-full text-xs">Unsub</span>
                </div>
                <div className="col-span-3 text-right pr-2">
                  <span className="text-gray-400 text-xs">Actions</span>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="px-6 py-8 text-center text-gray-500">
                  Loading campaigns...
                </div>
              )}

              {/* Empty State */}
              {!isLoading && campaigns.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No campaigns found.
                </div>
              )}

              {/* Campaign Rows */}
              {!isLoading && campaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-3 px-6 py-5 border-b border-gray-700 hover:bg-gray-700/70 hover:shadow-md transition-all duration-200 w-full"
                >
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-500 bg-gray-800"
                      checked={selectedCampaigns.includes(campaign.id)}
                      onChange={() => handleCheckboxChange(campaign.id)}
                    />
                  </div>
                  
                  <div className="col-span-4">
                    <div className="flex items-center space-x-3 w-full">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <div className="min-w-0 w-full">
                        <button
                          className="font-medium text-white truncate w-full text-left hover:underline"
                          onClick={() => {
                            const numericId = typeof campaign.id === 'string' && campaign.id.startsWith('#') ? parseInt(campaign.id.replace('#','')) : campaign.id;
                            setViewCampaignId(numericId);
                            window.localStorage.setItem('currentCampaignId', numericId);
                          }}
                        >
                          {campaign.name}
                        </button>
                        <div className="text-sm text-gray-400 flex items-center space-x-2 flex-wrap gap-y-1 w-full">
                          {(() => {
                            const s = (campaign.status || '').toString().toLowerCase();
                            const cls = s === 'sent'
                              ? 'bg-green-900/30 text-green-300'
                              : s === 'scheduled'
                              ? 'bg-orange-900/30 text-orange-300'
                              : s === 'draft'
                              ? 'bg-yellow-900/30 text-yellow-300'
                              : s === 'paused'
                              ? 'bg-gray-600 text-gray-300'
                              : 'bg-gray-700 text-gray-400';
                            const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
                            return (
                              <span className={`px-2 py-1 ${cls} text-xs rounded-full`}>{label}</span>
                            );
                          })()}
                          
                          <span>{campaign.last_edited}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{campaign.id}</div>
                      </div>
                    </div>
                  </div>
<div className="col-span-1 text-center px-1">
  <motion.div
    className="bg-gray-700/50 px-1 py-1.5 rounded-xl shadow-sm font-medium text-gray-300 inline-flex justify-center w-full"
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    {campaign.recipients}
  </motion.div>
</div>
<div className="col-span-1 text-center px-1">
  <motion.div
    className="bg-emerald-900/20 px-1 py-1.5 rounded-xl shadow-sm font-medium text-emerald-400 inline-flex justify-center w-full"
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    {campaign.opens}
  </motion.div>
</div>
<div className="col-span-1 text-center px-1">
  <motion.div
    className="bg-amber-900/20 px-1 py-1.5 rounded-xl shadow-sm font-medium text-amber-400 inline-flex justify-center w-full"
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    {campaign.clicks}
  </motion.div>
</div>
<div className="col-span-1 text-center px-1">
  <motion.div
    className="bg-red-900/20 px-1 py-1.5 rounded-xl shadow-sm font-medium text-red-400 inline-flex justify-center w-full"
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    {campaign.unsubscribed}
  </motion.div>
</div>
                  <div className="col-span-3 flex items-center justify-end space-x-3">
                    {(() => {
                      const s = (campaign.status || '').toString().toLowerCase();
                      if (s === 'draft' || s === 'paused') {
                        return (
                          <motion.button
                            className="p-2 bg-gray-700/70 hover:bg-orange-900/40 rounded-lg transition-colors shadow-sm"
                            onClick={() => handleScheduleCampaign(campaign.id)}
                            title="Schedule campaign"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CalendarClock className="w-4 h-4 text-orange-400" />
                          </motion.button>
                        );
                      }
                      return null;
                    })()}
                    <motion.button
                      className="p-2 bg-gray-700/70 hover:bg-red-900/40 rounded-lg transition-colors shadow-sm"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      title="Delete campaign"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            {/* Schedule Modal */}
            {scheduleModal.open && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-2xl shadow-lg w-full max-w-md border border-gray-700">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Schedule Campaign</h3>
                    <button className="p-2 rounded hover:bg-gray-700" onClick={() => setScheduleModal({ open: false, id: null, date: '' })}>
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Start date and time</label>
                      <input
                        type="datetime-local"
                        value={scheduleModal.date}
                        onChange={(e) => setScheduleModal(m => ({ ...m, date: e.target.value }))}
                        className="w-full border border-gray-600 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">If left blank, next business day is used.</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-700 flex justify-end space-x-2">
                    <button className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700" onClick={() => setScheduleModal({ open: false, id: null, date: '' })}>Cancel</button>
                    <button className="px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600" onClick={submitSchedule}>Schedule</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default CampaignsInterface;
