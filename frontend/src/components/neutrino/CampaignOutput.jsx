import React, { useState } from 'react';
import { Download, FileText, CheckCircle, Mail, Users, Calendar, ArrowRight } from 'lucide-react';

const CampaignOutput = ({ campaignData, onDownload, isLoading }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Group emails by category
  const emailsByCategory = campaignData.emails.reduce((acc, email) => {
    if (!acc[email.category]) {
      acc[email.category] = [];
    }
    acc[email.category].push(email);
    return acc;
  }, {});
  
  const totalEmails = campaignData.emails.length;
  const totalContacts = campaignData.contacts.length;
  
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-dark" />
          <h2 className="text-2xl font-bold text-gray-800">Campaign Summary</h2>
        </div>
      </div>
      
      <div className="p-6">
        {/* Success message */}
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-dark" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your campaign has been successfully created! All emails have been scheduled according to your preferences.
              </p>
            </div>
          </div>
        </div>
        
        {/* Campaign details */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Details</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Campaign Name</p>
                <p className="font-medium text-gray-900">{campaignData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">{new Date(campaignData.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Contacts</p>
                <p className="font-medium text-gray-900">{totalContacts}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Emails</p>
                <p className="font-medium text-gray-900">{totalEmails}</p>
              </div>
            </div>
            
            {campaignData.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-900">{campaignData.description}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-teal-50 text-teal-600 mr-4">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Contacts</p>
                <p className="text-xl font-semibold text-gray-900">{totalContacts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-50 text-dark mr-4">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Emails</p>
                <p className="text-xl font-semibold text-gray-900">{totalEmails}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-dark mr-4">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Categories</p>
                <p className="text-xl font-semibold text-gray-900">{Object.keys(emailsByCategory).length}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Category breakdown */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Category Breakdown</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-dark hover:text-black text-sm font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          <div className="space-y-3">
            {Object.entries(emailsByCategory).map(([category, emails]) => {
              // Determine category color
              const getCategoryStyle = (categoryName) => {
                const styles = {
                  'operations': 'bg-yellow-100 text-dark border-yellow-200',
                  'clinical': 'bg-yellow-50 text-dark border-yellow-100',
                  'it': 'bg-secondary text-dark border-gray-200',
                  'research': 'bg-gray-100 text-dark border-gray-200',
                  'sales': 'bg-primary text-dark border-yellow-300',
                  'executive': 'bg-dark text-secondary border-gray-800',
                  'other': 'bg-gray-100 text-gray-800 border-gray-200'
                };
                
                return styles[categoryName.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
              };
              
              return (
                <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className={`px-4 py-3 ${getCategoryStyle(category)}`}>
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{category}</h4>
                      <span className="text-sm">{emails.length} emails</span>
                    </div>
                  </div>
                  
                  {showDetails && (
                    <div className="p-4 bg-white">
                      <div className="space-y-3">
                        {emails.slice(0, 3).map((email, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex items-center text-gray-700">
                              <span className="font-medium">{email.recipient}</span>
                              <ArrowRight className="mx-2 h-3 w-3 text-gray-400" />
                              <span className="text-gray-500 truncate">{email.subject}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Scheduled: {new Date(email.scheduledDate).toLocaleDateString()} ({email.followUpDay === 0 ? 'Initial' : `Day ${email.followUpDay}`})
                            </div>
                          </div>
                        ))}
                        
                        {emails.length > 3 && (
                          <div className="text-xs text-dark">
                            + {emails.length - 3} more emails
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Download section */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-medium text-gray-900">Download Campaign Data</h3>
              <p className="text-sm text-gray-500 mt-1">
                Download a CSV file with all campaign details for your records or external use.
              </p>
            </div>
            <button
              onClick={onDownload}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 -ml-1 h-4 w-4" />
                  Download CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          onClick={() => window.location.href = '/campaigns'}
        >
          View All Campaigns
        </button>
      </div>
    </div>
  );
};

export default CampaignOutput;