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
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
          
        </div>
        <p className="text-sm text-gray-500 mt-1">Name your campaign, set a start date, and upload your leads file. You can fine‑tune templates and scheduling next.</p>
      </div>
      
      {error && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campaign Name */}
          <div className="col-span-1">
            <label htmlFor="campaignName" className="block text-sm font-medium text-gray-800 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              id="campaignName"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="Q4 Product Launch"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-gray-500">Keep it short and descriptive.</p>
          </div>
          
          {/* Campaign Description */}
          <div className="col-span-1">
            <label htmlFor="campaignDescription" className="block text-sm font-medium text-gray-800 mb-1">
              Campaign Description
            </label>
            <textarea
              id="campaignDescription"
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              placeholder="Describe the purpose of this campaign..."
              value={campaignDescription}
              onChange={(e) => setCampaignDescription(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Optional, but helpful for your team.</p>
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
          <div className="col-span-1">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-800 mb-1">
              Campaign Start Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Calendar className="w-5 h-5 text-dark" />
              </div>
              <input
                type="date"
                id="startDate"
                className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                value={campaignStartDate}
                onChange={(e) => setCampaignStartDate(e.target.value)}
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Choose when to kick off sending.</p>
          </div>
          
          {/* Upload Leads File */}
          <div className="col-span-1 md:col-span-2">
            <label htmlFor="leadsFile" className="block text-sm font-medium text-gray-800 mb-1">
              Upload Leads File (CSV or Excel)
            </label>
            <div className="mt-1">
              <label className="group w-full flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 transition">
                <FileUp className="mx-auto h-10 w-10 text-gray-500 group-hover:text-gray-700" />
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Click to upload</span> or drag and drop
                </div>
                <p className="text-xs text-gray-500">CSV or Excel up to 10MB</p>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
              </label>
              {fileName && (
                <div className="mt-3 flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
                  <div className="text-sm text-gray-700 truncate">
                    <span className="font-medium">Selected:</span> {fileName}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLeadsFile(null); setFileName(''); }}
                    className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition"
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