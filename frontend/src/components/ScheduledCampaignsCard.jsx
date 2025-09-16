import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, X, RefreshCw, AlertCircle } from 'lucide-react';

const ScheduledCampaignsCard = ({ campaigns = [], onRefresh, title = "Scheduled Campaigns" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCancelCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to cancel this campaign?')) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/api/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel campaign');
      }
      
      // Success - refresh the campaigns list
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error canceling campaign:', err);
      setError(err.message || 'Failed to cancel campaign. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-orange-400 mr-2" />
          <h3 className="text-lg font-medium text-white">{title}</h3>
        </div>
        {onRefresh && (
          <button 
            onClick={onRefresh} 
            disabled={isLoading}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh scheduled campaigns"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
      
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border-l-4 border-red-600 text-red-200 rounded-r-lg flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {campaigns.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            No scheduled campaigns found
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <motion.div 
                key={campaign.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-gray-700 rounded-lg p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium text-white">{campaign.name}</div>
                  {campaign.scheduled_time && (
                    <div className="text-sm text-gray-400">
                      Scheduled: {new Date(campaign.scheduled_time).toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleCancelCampaign(campaign.id)}
                  disabled={isLoading}
                  className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-300 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ScheduledCampaignsCard;