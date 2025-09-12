import React, { useState, useEffect } from 'react';
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
        // Use the API endpoint with proper CORS headers
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
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
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

  // Removed edit and more options handlers


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
    <div className="min-h-screen bg-dashboard-blue-light/30 w-full overflow-x-hidden">
      {showNeutrinoWorkflow ? (
        <NeutrinoCampaignWorkflow onClose={() => setShowNeutrinoWorkflow(false)} />
      ) : viewCampaignId ? (
        <CampaignDetails campaignId={viewCampaignId} onBack={() => setViewCampaignId(null)} />
      ) : (
        <>
          {/* Header */}
          <div className="bg-dashboard-blue-light/30 border-b border-gray-200 rounded-b-3xl shadow-sm w-full">
            <div className="w-full px-6 py-4 max-w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">Campaigns</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowNeutrinoWorkflow(true)}
                    className="bg-brand-yellow text-brand-dark px-6 py-2 rounded-xl font-medium transition-colors flex items-center shadow-sm hover:shadow-md"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-dashboard-blue-light/30 border-b border-gray-200 mb-6 w-full">
            <div className="w-full px-6 max-w-full">
              <div className="flex space-x-8">
                <button className="py-4 px-1 border-b-2 border-brand-yellow text-brand-dark font-medium">
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
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-80 focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                  />
                </div>
                
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-10 focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {campaigns.length > 0 ? `${(currentPage - 1) * 10 + 1}-${Math.min(currentPage * 10, totalCampaigns)} of ${totalCampaigns}` : '0-0 of 0'}
                </span>
                <div className="flex items-center space-x-1">
                  <button 
                    className={`p-1 ${currentPage > 1 ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-400 cursor-not-allowed'} rounded`}
                    onClick={() => currentPage > 1 && handlePagination(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-1 bg-brand-dark text-brand-white rounded-lg text-sm">{currentPage}</button>
                  <button 
                    className={`p-1 ${currentPage < Math.ceil(totalCampaigns / 10) ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-400 cursor-not-allowed'} rounded`}
                    onClick={() => currentPage < Math.ceil(totalCampaigns / 10) && handlePagination(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalCampaigns / 10)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-x-auto w-full">
              {selectedCampaigns.length > 0 && (
                <div className="flex justify-between items-center px-6 py-3 bg-red-50 border-b border-red-100 rounded-t-3xl">
                  <div className="text-sm text-red-700">{selectedCampaigns.length} selected</div>
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
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-green-100 border-b border-gray-200 text-sm font-medium text-gray-800 rounded-t-3xl w-full">
                <div className="col-span-1">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    onChange={handleSelectAllChange}
                    checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                  />
                </div>
                <div className="col-span-4">Campaign</div>
                <div className="col-span-1 text-center">Recipients</div>
                <div className="col-span-1 text-center">Opens</div>
                <div className="col-span-1 text-center">Clicks</div>
                <div className="col-span-1 text-center">Unsubscribed</div>
                <div className="col-span-3"></div>
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
              {!isLoading && campaigns.map((campaign) => (
                <div key={campaign.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 w-full">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedCampaigns.includes(campaign.id)}
                      onChange={() => handleCheckboxChange(campaign.id)}
                    />
                  </div>
                  
                  <div className="col-span-4">
                    <div className="flex items-center space-x-3 w-full">
                      <div className="w-2 h-2 bg-brand-yellow rounded-full flex-shrink-0"></div>
                      <div className="min-w-0 w-full">
                        <button
                          className="font-medium text-gray-900 truncate w-full text-left hover:underline"
                          onClick={() => {
                            const numericId = typeof campaign.id === 'string' && campaign.id.startsWith('#') ? parseInt(campaign.id.replace('#','')) : campaign.id;
                            setViewCampaignId(numericId);
                            window.localStorage.setItem('currentCampaignId', numericId);
                          }}
                        >
                          {campaign.name}
                        </button>
                        <div className="text-sm text-gray-500 flex items-center space-x-2 flex-wrap gap-y-1 w-full">
                          {(() => {
                            const s = (campaign.status || '').toString().toLowerCase();
                            const cls = s === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : s === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : s === 'paused'
                              ? 'bg-gray-200 text-gray-800'
                              : 'bg-gray-100 text-gray-600';
                            const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';
                            return (
                              <span className={`px-2 py-1 ${cls} text-xs rounded-full`}>{label}</span>
                            );
                          })()}
                          
                          <span>{campaign.last_edited}</span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">{campaign.id}</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 text-center text-gray-600">{campaign.recipients}</div>
                  <div className="col-span-1 text-center text-gray-600">{campaign.opens}</div>
                  <div className="col-span-1 text-center text-gray-600">{campaign.clicks}</div>
                  <div className="col-span-1 text-center text-gray-600">{campaign.unsubscribed}</div>
                  <div className="col-span-3 flex items-center justify-end space-x-2">
                    {(() => {
                      const s = (campaign.status || '').toString().toLowerCase();
                      if (s === 'draft' || s === 'paused') {
                        return (
                          <button
                            className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                            onClick={() => handleScheduleCampaign(campaign.id)}
                            title="Schedule campaign"
                          >
                            <CalendarClock className="w-4 h-4 text-emerald-600" />
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <button
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      title="Delete campaign"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Schedule Modal */}
            {scheduleModal.open && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-lg w-full max-w-md">
                  <div className="flex items-center justify-between px-5 py-3 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Schedule Campaign</h3>
                    <button className="p-2 rounded hover:bg-gray-100" onClick={() => setScheduleModal({ open: false, id: null, date: '' })}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Start date and time</label>
                      <input
                        type="datetime-local"
                        value={scheduleModal.date}
                        onChange={(e) => setScheduleModal(m => ({ ...m, date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">If left blank, next business day is used.</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t flex justify-end space-x-2">
                    <button className="px-4 py-2 rounded-xl border" onClick={() => setScheduleModal({ open: false, id: null, date: '' })}>Cancel</button>
                    <button className="px-4 py-2 rounded-xl bg-emerald-600 text-white" onClick={submitSchedule}>Schedule</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CampaignsInterface;