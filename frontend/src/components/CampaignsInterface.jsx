import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Edit2, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

const CampaignsInterface = () => {
  const [selectedStatus, setSelectedStatus] = useState('All statuses');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);

  const statusOptions = ['All statuses', 'Draft', 'Sent', 'Scheduled', 'Paused'];

  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoading(true);
      try {
        // Use the API endpoint
        const url = `http://localhost:8000/api/campaigns/paginated/?page=${currentPage}&page_size=10&status=${selectedStatus !== 'All statuses' ? selectedStatus.toLowerCase() : ''}&search=${searchQuery}`;
        const response = await fetch(url);
        
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

  const handleEditCampaign = (campaignId) => {
    console.log('Edit campaign:', campaignId);
    // Navigate to campaign edit page
  };

  const handleMoreOptions = (campaignId) => {
    console.log('More options for campaign:', campaignId);
    // Show dropdown with more options
  };

  const handleCreateCampaign = () => {
    console.log('Create new campaign');
    // Navigate to campaign creation page or show modal
  };

  const handleCreateFolder = () => {
    console.log('Create folder');
    // Show folder creation modal
  };

  const handlePagination = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Campaigns</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleCreateFolder}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create folder
              </button>
              <button 
                onClick={handleCreateCampaign}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create campaign
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium">
              Email
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filter Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for a campaign"
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={handleStatusChange}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{currentPage}</button>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
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
            <div key={campaign.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50">
              <div className="col-span-1">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300"
                  checked={selectedCampaigns.includes(campaign.id)}
                  onChange={() => handleCheckboxChange(campaign.id)}
                />
              </div>
              
              <div className="col-span-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-900">{campaign.name}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {campaign.status}
                      </span>
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
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => handleEditCampaign(campaign.id)}
                >
                  <Edit2 className="w-4 h-4 text-blue-600" />
                </button>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => handleMoreOptions(campaign.id)}
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CampaignsInterface;