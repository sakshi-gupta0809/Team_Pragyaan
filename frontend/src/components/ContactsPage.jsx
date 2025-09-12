import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

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

  return (
    <div className="px-4 py-4 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="text-emerald-700 mt-1">Manage your contacts and subscribers</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search name or email..."
              className="pl-10 w-full rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Campaign dropdown */}
          <div>
            <select
              className="w-full rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              <option value="">All Campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status dropdown */}
          <div>
            <select
              className="w-full rounded-xl border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden w-full">
        <div className="p-4 border-b border-gray-200 bg-gray-50 text-sm text-gray-500">
          <p>Scroll horizontally to view all contact information.</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-medium">No contacts found</p>
            <p className="mt-1">Try adjusting your filters or add new contacts</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-12 bg-green-100 rounded-tl-xl">
                    ID
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-32 bg-green-100">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-48 bg-green-100">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-32 bg-green-100">
                    Campaign
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-24 bg-green-100">
                    Subscription
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-24 bg-green-100">
                    LinkedIn
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-28 bg-green-100">
                    Designation
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-28 bg-green-100">
                    Company
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-24 bg-green-100">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-28 bg-green-100">
                    Last Contacted
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider w-24 bg-green-100 rounded-tr-xl">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{contact.id}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{contact.name}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-[180px]">{contact.email}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-[120px]">{contact.campaign_name || 'No Campaign'}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {contact.unsubscribed ? (
                        <span className="px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Unsub
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {contact.linkedin_url ? (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-800 flex items-center"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 truncate max-w-[100px]">
                      {contact.designation || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 truncate max-w-[100px]">
                      {contact.company || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 truncate max-w-[80px]">
                      {contact.category || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {contact.last_contacted ? new Date(contact.last_contacted).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {contact.status || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                currentPage >= totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{totalContacts > 0 ? startRecord : 0}</span> to{' '}
                <span className="font-medium">{endRecord}</span> of{' '}
                <span className="font-medium">{totalContacts}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 ${
                    currentPage === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="bg-green-100 border-green-200 text-gray-800 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 ${
                    currentPage >= totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;