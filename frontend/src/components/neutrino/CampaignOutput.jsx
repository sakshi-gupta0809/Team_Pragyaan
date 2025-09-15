import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, CheckCircle, Mail, Users, Calendar, ArrowRight } from 'lucide-react';

const CampaignOutput = ({ campaignData, onDownload, isLoading }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [sendStatus, setSendStatus] = useState({ running: false, result: null, error: null });

  const triggerSendNow = async () => {
    setSendStatus({ running: true, result: null, error: null });
    try {
      const res = await fetch('http://localhost:8000/emails/process-now', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          force_send: true,
          only_initial: true  // Explicitly set to only send initial emails (step=1)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to process emails');
      setSendStatus({ running: false, result: data, error: null });
    } catch (e) {
      setSendStatus({ running: false, result: null, error: e.message });
    }
  };

  
  
  // Group emails by category with safe fallbacks
  const emailsByCategory = campaignData.emails.reduce((acc, email) => {
    const normalizedCategory = (email.category || email.recipient_category || 'Other').toString();
    if (!acc[normalizedCategory]) {
      acc[normalizedCategory] = [];
    }
    acc[normalizedCategory].push(email);
    return acc;
  }, {});
  
  const totalEmails = campaignData.emails.length;
  const totalContacts = campaignData.contacts.length;
  
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-gray-800 rounded-2xl shadow-md overflow-hidden border border-gray-700 text-white">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-orange-400" />
          <h2 className="text-2xl font-bold text-white">Campaign Summary</h2>
        </div>
      </div>
      
      <div className="p-6">
        {/* Success message */}
        <div className="bg-green-900/40 border-l-4 border-green-600 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-300" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-200">
                Your campaign has been successfully created! All emails have been scheduled according to your preferences.
              </p>
            </div>
          </div>
        </div>
        
        {/* Campaign details */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Campaign Details</h3>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Campaign Name</p>
                <p className="font-medium text-white">{campaignData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Start Date</p>
                <p className="font-medium text-white">{new Date(campaignData.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Contacts</p>
                <p className="font-medium text-white">{totalContacts}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Emails</p>
                <p className="font-medium text-white">{totalEmails}</p>
              </div>
            </div>
            
            {campaignData.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-400">Description</p>
                <p className="text-gray-200">{campaignData.description}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-teal-900/40 text-teal-300 mr-4">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Contacts</p>
                <p className="text-xl font-semibold text-white">{totalContacts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-900/40 text-yellow-300 mr-4">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Emails (scheduled)</p>
                <p className="text-xl font-semibold text-white">{totalEmails}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-900/40 text-purple-300 mr-4">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Categories</p>
                <p className="text-xl font-semibold text-white">{Object.keys(emailsByCategory).length}</p>
              </div>
            </div>
          </div>
        </div>

        

        {/* Send now */}
        <div className="mb-6 bg-gray-900 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Send Due Emails</h3>
              <p className="text-sm text-gray-400">Trigger immediate sending for emails scheduled up to now.</p>
            </div>
            <button
              onClick={triggerSendNow}
              disabled={sendStatus.running}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-orange-600 hover:bg-orange-700"
            >
              {sendStatus.running ? 'Processing...' : 'Send Now'}
            </button>
          </div>
          {sendStatus.error && (
            <div className="mt-3 text-sm text-red-400">{sendStatus.error}</div>
          )}
          {sendStatus.result && (
            <div className="mt-3 text-sm text-green-300">Processed {sendStatus.result.processed_count} emails.</div>
          )}
        </div>
        
        {/* Category breakdown */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Category Breakdown</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-orange-400 hover:text-orange-300 text-sm font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          <div className="space-y-3">
            {Object.entries(emailsByCategory).map(([category, emails]) => {
              // Determine category color
              const getCategoryStyle = (categoryName) => {
                const styles = {
                  'operations': 'bg-yellow-100 text-gray-800 border-yellow-200',
                  'clinical': 'bg-yellow-50 text-gray-800 border-yellow-100',
                  'it': 'bg-secondary text-gray-800 border-gray-200',
                  'research': 'bg-gray-100 text-gray-800 border-gray-200',
                  'sales': 'bg-primary text-gray-800 border-yellow-300',
                  'executive': 'bg-dark text-white border-gray-800',
                  'other': 'bg-gray-100 text-gray-800 border-gray-200'
                };
                
                return styles[categoryName.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
              };
              
              return (
                <div key={category} className="border border-gray-700 rounded-xl overflow-hidden">
                  <div className={`px-4 py-3 ${getCategoryStyle(category)}`}>
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{category || 'Other'}</h4>
                      <span className="text-sm">{emails.length} emails</span>
                    </div>
                  </div>
                  
                  {showDetails && (
                    <div className="p-4 bg-gray-900 text-gray-100">
                      <div className="space-y-3">
                        {emails.slice(0, 3).map((email, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex items-center text-gray-200">
                              <span className="font-medium">{email.recipient}</span>
                              <ArrowRight className="mx-2 h-3 w-3 text-gray-400" />
                              <span className="text-gray-500 truncate">{email.subject}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {(() => {
                                const scheduled = email.scheduledDate ? new Date(email.scheduledDate) : null;
                                const dateStr = scheduled && !isNaN(scheduled) ? scheduled.toLocaleDateString() : '-';
                                const dayLabel = typeof email.followUpDay === 'number' ? (email.followUpDay === 0 ? 'Initial' : `Day ${email.followUpDay}`) : 'Initial';
                                return `Scheduled: ${dateStr} (${dayLabel})`;
                              })()}
                            </div>
                          </div>
                        ))}
                        
                        {emails.length > 3 && (
                          <div className="text-xs text-gray-300">
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
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-medium text-white">Download Campaign Data</h3>
              <p className="text-sm text-gray-400 mt-1">
                Download a CSV file with all campaign details for your records or external use.
              </p>
            </div>
            <button
              onClick={onDownload}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
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
      
      {/* Actions removed per request */}
    </motion.div>
  );
};

export default CampaignOutput;