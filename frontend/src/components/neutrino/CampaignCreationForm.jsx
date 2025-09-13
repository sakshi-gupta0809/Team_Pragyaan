import React, { useState } from 'react';
import { Calendar, FileUp, Send } from 'lucide-react';

const CampaignCreationForm = ({ onSubmit, isLoading }) => {
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignType, setCampaignType] = useState('cold_outreach');
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [leadsFile, setLeadsFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload a CSV or Excel file');
      setLeadsFile(null);
      setFileName('');
      return;
    }

    setLeadsFile(file);
    setFileName(file.name);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!campaignName.trim()) {
      setError('Campaign name is required');
      return;
    }
    
    if (!campaignStartDate) {
      setError('Start date is required');
      return;
    }
    
    if (!leadsFile) {
      setError('Leads file is required');
      return;
    }
    
    const formData = new FormData();
    formData.append('name', campaignName);
    formData.append('description', campaignDescription);
    formData.append('scenario', campaignType);
    formData.append('start_date', campaignStartDate);
    formData.append('leads_file', leadsFile);
    
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Campaign</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Campaign Name */}
          <div>
            <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              id="campaignName"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
              placeholder="Q4 Product Launch"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              required
            />
          </div>
          
          {/* Campaign Description */}
          <div>
            <label htmlFor="campaignDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Description
            </label>
            <textarea
              id="campaignDescription"
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
              placeholder="Describe the purpose of this campaign..."
              value={campaignDescription}
              onChange={(e) => setCampaignDescription(e.target.value)}
            />
          </div>
          
          {/* Campaign Type */}
          <div>
            <label htmlFor="campaignType" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Type
            </label>
            <select
              id="campaignType"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
            >
              <option value="cold_outreach">Cold Outreach</option>
              <option value="conference">In Person Meet</option>
            </select>
          </div>
          
          {/* Campaign Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Start Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Calendar className="w-5 h-5 text-dark" />
              </div>
              <input
                type="date"
                id="startDate"
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-xl focus:ring-primary focus:border-primary"
                value={campaignStartDate}
                onChange={(e) => setCampaignStartDate(e.target.value)}
                required
              />
            </div>
          </div>
          
          {/* Upload Leads File */}
          <div>
            <label htmlFor="leadsFile" className="block text-sm font-medium text-gray-700 mb-1">
              Upload Leads File (CSV or Excel)
            </label>
            <div className="mt-1 flex items-center">
              <label className="w-full flex justify-center px-6 py-3 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer hover:bg-gray-50">
                <div className="space-y-1 text-center">
                  <FileUp className="mx-auto h-12 w-12 text-dark" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-dark hover:text-black">
                      <span>Upload a file</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV or Excel up to 10MB</p>
                </div>
              </label>
            </div>
            {fileName && (
              <div className="mt-2 text-sm text-gray-500">
                <p className="font-medium text-dark">Selected file: {fileName}</p>
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Create Campaign
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CampaignCreationForm;