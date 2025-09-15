import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Mail, Eye, MousePointer, X, RefreshCw, Wand2, Trash2 } from 'lucide-react';

const CampaignDetails = ({ campaignId, onBack }) => {
  // Add your component logic here
  const [campaign, setCampaign] = useState({ loading: false, data: null, error: null });
  const [stats, setStats] = useState({ loading: false, data: null, error: null });
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contacts, setContacts] = useState({ loading: false, data: [], page: 1, total: 0, error: null });
  const [templates, setTemplates] = useState({ loading: false, data: [], error: null, saving: false });

  const fetchStats = async () => {
    setStats(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`http://localhost:8000/campaigns/${campaignId}/stats`, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load stats');
      setStats({ loading: false, data, error: null });
    } catch (e) {
      setStats({ loading: false, data: null, error: e.message });
    }
  };

  const fetchContacts = async (page = 1) => {
    setContacts(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`http://localhost:8000/api/contacts/?campaign_id=${campaignId}&page=${page}&page_size=20`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load contacts');
      setContacts({ loading: false, data: data.contacts || [], page: data.page || page, total: data.total || 0, error: null });
    } catch (e) {
      setContacts({ loading: false, data: [], page: 1, total: 0, error: e.message });
    }
  };

  // Fetch campaign details
  const fetchCampaign = async () => {
    setCampaign(c => ({ ...c, loading: true, error: null }));
    try {
      const res = await fetch(`http://localhost:8000/api/campaigns/${campaignId}`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load campaign');
      setCampaign({ loading: false, data, error: null });
    } catch (e) {
      setCampaign({ loading: false, data: null, error: e.message });
    }
  };

  useEffect(() => {
    fetchCampaign();
    fetchStats();
    // load current templates from DB
    const loadTemplates = async () => {
      setTemplates(s => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(`http://localhost:8000/campaigns/${campaignId}/templates/`, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to load templates');
        const mapped = (data || []).map(t => ({
          id: t.id,
          categoryId: t.category || 'other',
          subject: t.subject || '',
          body: t.body || '',
          step: t.step || 1
        }));
        setTemplates({ loading: false, data: mapped, error: null, saving: false });
      } catch (e) {
        setTemplates({ loading: false, data: [], error: e.message, saving: false });
      }
    };
    loadTemplates();
  }, [campaignId]);

  const StatCard = ({ icon, label, value }) => (
    <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-xl bg-gray-700">{icon}</div>
        <div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-xl font-semibold text-white">{value}</div>
        </div>
      </div>
    </div>
  );

  const DonutChart = ({ opens = 0, clicks = 0, unsubscribed = 0, total = 0 }) => {
    const safeTotal = total > 0 ? total : 1;
    const openPct = Math.min(100, Math.round((opens / safeTotal) * 100));
    const clickPct = Math.min(100, Math.round((clicks / safeTotal) * 100));
    const unsubPct = Math.min(100, Math.round((unsubscribed / safeTotal) * 100));
    const circumference = 2 * Math.PI * 42;
    const seg = (pct) => (pct / 100) * circumference;
    const gaps = 4;
    return (
      <svg width="140" height="140" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" stroke="#F3F4F6" strokeWidth="12" fill="none" />
        <g transform="rotate(-90 50 50)">
          <circle cx="50" cy="50" r="42" stroke="#10B981" strokeWidth="12" fill="none"
            strokeDasharray={`${seg(openPct)} ${circumference - seg(openPct)}`} strokeLinecap="round" />
          <circle cx="50" cy="50" r="42" stroke="#F59E0B" strokeWidth="12" fill="none"
            strokeDasharray={`${seg(clickPct)} ${circumference - seg(clickPct)}`} strokeDashoffset={-(seg(openPct) + gaps)} strokeLinecap="round" />
          <circle cx="50" cy="50" r="42" stroke="#EF4444" strokeWidth="12" fill="none"
            strokeDasharray={`${seg(unsubPct)} ${circumference - seg(unsubPct)}`} strokeDashoffset={-(seg(openPct) + seg(clickPct) + 2 * gaps)} strokeLinecap="round" />
        </g>
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#F9FAFB">{total}</text>
      </svg>
    );
  };

  const BarGraph = ({ opens = 0, clicks = 0, unsubscribed = 0, total = 0 }) => {
    const maxValue = Math.max(opens, clicks, unsubscribed, 1);
    const getHeight = (value) => Math.max(5, (value / maxValue) * 100);
    
    return (
      <div className="w-full flex items-end justify-around h-52 mt-4">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="w-16 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg shadow-lg relative overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: `${getHeight(opens)}%` }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.1
            }}
          >
            <div className="absolute inset-0 bg-white opacity-20 rounded-t-lg
              animate-pulse" style={{ animationDuration: '3s' }}></div>
          </motion.div>
          <div className="mt-2 text-sm font-medium text-gray-300">Opens</div>
          <div className="text-lg font-bold text-emerald-400">{opens}</div>
        </motion.div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.div
            className="w-16 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg shadow-lg relative overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: `${getHeight(clicks)}%` }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.2
            }}
          >
            <div className="absolute inset-0 bg-white opacity-20 rounded-t-lg
              animate-pulse" style={{ animationDuration: '3s' }}></div>
          </motion.div>
          <div className="mt-2 text-sm font-medium text-gray-300">Clicks</div>
          <div className="text-lg font-bold text-amber-400">{clicks}</div>
        </motion.div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <motion.div
            className="w-16 bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg shadow-lg relative overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: `${getHeight(unsubscribed)}%` }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.3
            }}
          >
            <div className="absolute inset-0 bg-white opacity-20 rounded-t-lg
              animate-pulse" style={{ animationDuration: '3s' }}></div>
          </motion.div>
          <div className="mt-2 text-sm font-medium text-gray-300">Unsubscribed</div>
          <div className="text-lg font-bold text-red-400">{unsubscribed}</div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white w-full">
      <div className="bg-gray-800 border-b border-gray-700 rounded-b-3xl shadow-sm w-full mb-6">
        <div className="w-full px-6 py-4 max-w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={onBack} className="text-white hover:text-orange-300 font-medium flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
              </button>
              {campaign.data && (
                <h1 className="ml-6 text-xl font-semibold text-white">{campaign.data.name}</h1>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={fetchCampaign} disabled={campaign.loading} className="text-sm px-3 py-1 rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" /> {campaign.loading ? 'Loading...' : 'Refresh Campaign'}
              </button>
              <button onClick={fetchStats} disabled={stats.loading} className="text-sm px-3 py-1 rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" /> {stats.loading ? 'Refreshing...' : 'Refresh Stats'}
              </button>
            </div>
          </div>
  
          {campaign.data && (
            <div className="bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-700 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">Campaign Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400">Campaign Name</div>
                    <div className="text-white font-medium">{campaign.data.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Category</div>
                    <div className="text-white">
                      {campaign.data.category ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/30 text-indigo-300">
                          {campaign.data.category}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Status</div>
                    <div className="text-white">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        campaign.data.status === 'sent' ? 'bg-green-900/30 text-green-300' :
                        campaign.data.status === 'scheduled' ? 'bg-orange-900/30 text-orange-300' :
                        campaign.data.status === 'draft' ? 'bg-yellow-900/30 text-yellow-300' :
                        campaign.data.status === 'paused' ? 'bg-gray-600 text-gray-300' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {campaign.data.status ? campaign.data.status.charAt(0).toUpperCase() + campaign.data.status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  {campaign.data.scheduled_time && (
                    <div>
                      <div className="text-sm text-gray-400">Scheduled Time</div>
                      <div className="text-white">{campaign.data.scheduled_time}</div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400">Created</div>
                    <div className="text-white">{campaign.data.created_at || 'Not available'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Last Updated</div>
                    <div className="text-white">{campaign.data.last_edited || 'Not available'}</div>
                  </div>
                  {campaign.data.send_time && (
                    <div>
                      <div className="text-sm text-gray-400">Sent Time</div>
                      <div className="text-white">{campaign.data.send_time}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-400">Campaign ID</div>
                    <div className="text-white font-mono text-sm">{campaign.data.id}</div>
                  </div>
                </div>
              </div>
  
              <div className="mt-4">
                <div className="text-sm text-gray-400 mb-1">Description</div>
                <div className="relative">
                  <textarea
                    className="w-full text-white bg-gray-700 p-3 rounded-lg text-sm border border-gray-600 min-h-[80px]"
                    placeholder="Add a campaign description..."
                    value={campaign.data.description || ''}
                    onChange={async (e) => {
                      // Update description locally first
                      setCampaign(c => ({
                        ...c,
                        data: { ...c.data, description: e.target.value }
                      }));
                      
                      try {
                        // Update the description in the database
                        const res = await fetch(`http://localhost:8000/api/campaigns/${campaignId}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                          },
                          body: JSON.stringify({ description: e.target.value })
                        });
                        
                        if (!res.ok) {
                          throw new Error('Failed to update description');
                        }
                        
                        console.log('Description updated successfully');
                      } catch (err) {
                        console.error('Failed to update description:', err);
                      }
                    }}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                    {campaign.data.description ? campaign.data.description.length : 0}/500
                  </div>
                </div>
              </div>
              
              {campaign.data.tags && campaign.data.tags.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-400 mb-1">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {campaign.data.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
  
          {campaign.data && (
            <div className="mt-3 flex items-center space-x-3">
              <div className={`px-2 py-1 text-xs rounded-full ${
                campaign.data.status === 'sent' ? 'bg-green-900/30 text-green-300' :
                campaign.data.status === 'scheduled' ? 'bg-orange-900/30 text-orange-300' :
                campaign.data.status === 'draft' ? 'bg-yellow-900/30 text-yellow-300' :
                campaign.data.status === 'paused' ? 'bg-gray-600 text-gray-300' :
                'bg-gray-700 text-gray-400'
              }`}>
                {campaign.data.status ? campaign.data.status.charAt(0).toUpperCase() + campaign.data.status.slice(1) : 'Unknown'}
              </div>
              <div className="text-sm text-gray-400">ID: {campaign.data.id}</div>
              {campaign.data.last_edited && (
                <div className="text-sm text-gray-400">Last edited: {campaign.data.last_edited}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {campaign.error && (
        <div className="w-full px-6 py-3 bg-red-900/30 text-red-300 mb-4 rounded-lg">
          Error loading campaign: {campaign.error}
        </div>
      )}

      <div className="w-full px-6 pb-6 max-w-full">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-6 items-stretch">
          <div className="h-28">
            <StatCard icon={<Users className="h-5 w-5 text-gray-300" />} label="Recipients" value={stats.data ? stats.data.recipients : 0} />
          </div>
          <div className="h-28">
            <StatCard icon={<Mail className="h-5 w-5 text-gray-300" />} label="Emails Sent" value={stats.data ? stats.data.emails_sent : 0} />
          </div>
          <div className="h-28">
            <StatCard icon={<Eye className="h-5 w-5 text-emerald-400" />} label="Open Rate" value={stats.data ? `${stats.data.open_rate}%` : '0%'} />
          </div>
          <div className="h-28">
            <StatCard icon={<MousePointer className="h-5 w-5 text-amber-400" />} label="Click Rate" value={stats.data ? `${stats.data.click_rate}%` : '0%'} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-700 mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Engagement Overview</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex items-center space-x-6">
            <DonutChart
              opens={stats.data?.opens || 0}
              clicks={stats.data?.clicks || 0}
              unsubscribed={stats.data?.unsubscribed || 0}
              total={stats.data?.recipients || 0}
            />
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> <span>Opens</span> <span className="ml-auto font-medium">{stats.data?.opens || 0}</span></div>
              <div className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> <span>Clicks</span> <span className="ml-auto font-medium">{stats.data?.clicks || 0}</span></div>
              <div className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> <span>Unsubscribed</span> <span className="ml-auto font-medium">{stats.data?.unsubscribed || 0}</span></div>
            </div>
          </div>
          
          <motion.div
            className="bg-gray-700 rounded-xl p-4 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h4 className="text-md font-medium text-gray-300 mb-3">Engagement Metrics</h4>
            <BarGraph
              opens={stats.data?.opens || 0}
              clicks={stats.data?.clicks || 0}
              unsubscribed={stats.data?.unsubscribed || 0}
              total={stats.data?.recipients || 0}
            />
          </motion.div>
        </div>
      </div>

        <div className="bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-white">Templates</h3>
          <button
            onClick={async () => {
              // reload templates
              try {
                setTemplates(s => ({ ...s, loading: true }));
                const res = await fetch(`http://localhost:8000/campaigns/${campaignId}/templates/`, { headers: { 'Accept': 'application/json' } });
                const data = await res.json();
                const mapped = (data || []).map(t => ({
                  id: t.id,
                  categoryId: t.category || 'other',
                  subject: t.subject || '',
                  body: t.body || '',
                  step: t.step || 1
                }));
                setTemplates({ loading: false, data: mapped, error: null, saving: false });
              } catch (e) {
                setTemplates(s => ({ ...s, loading: false, error: 'Failed to reload templates' }));
              }
            }}
            className="text-sm px-3 py-1 rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white"
          >
            {templates.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {templates.error && <div className="text-sm text-red-600 mb-2">{templates.error}</div>}
        {(!templates.loading && (!templates.data || templates.data.length === 0)) && (
          <div className="mb-4 p-4 border border-dashed border-gray-600 rounded-xl bg-gray-700">
            <div className="text-sm text-gray-300 mb-2">No templates saved yet for this campaign.</div>
            <div className="text-xs text-gray-400 mb-3">Generate starter templates from categories and then customize them.</div>
            <button
              onClick={async () => {
                try {
                  setTemplates(s => ({ ...s, loading: true }));
                  const res = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignId}/categories/approve`, { method: 'POST', headers: { 'Accept': 'application/json' } });
                  const data = await res.json();
                  if (data && data.templates) {
                    setTemplates({
                      loading: false,
                      data: data.templates.map(t => ({
                        categoryId: t.categoryId,
                        subject: t.subject,
                        body: t.body,
                        step: t.step || 1
                      })),
                      error: null,
                      saving: false
                    });
                  } else {
                    setTemplates(s => ({ ...s, loading: false }));
                  }
                } catch (e) {
                  setTemplates(s => ({ ...s, loading: false, error: 'Failed to generate templates' }));
                }
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm"
            >
              Generate Initial Templates
            </button>
          </div>
        )}
        {/* Group templates by initial and follow-ups */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-white mb-2">Initial Emails</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.data
              .filter(tpl => !tpl.step || tpl.step === 1)
              .map((tpl, idx) => (
                <div key={idx} className="border border-gray-700 rounded-xl p-4 border-l-4 border-l-blue-500 bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-400 mr-2">Category</div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300">Initial Email</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs px-2 py-0.5 rounded-full bg-gray-700/70 text-gray-300">{tpl.categoryId}</div>
                  {tpl.id && (
                    <button
                      title="Delete template"
                      className="p-1 rounded hover:bg-red-900/30"
                      onClick={async () => {
                        if (!window.confirm('Delete this template?')) return;
                        try {
                          const res = await fetch(`/api/templates/${tpl.id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                          if (!res.ok) throw new Error('Failed to delete template');
                          setTemplates(s => ({ ...s, data: s.data.filter((_, i) => i !== idx) }));
                        } catch (e) {
                          alert('Failed to delete template');
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
              <input
                className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 mb-2 text-sm"
                placeholder="Subject"
                value={tpl.subject}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemplates(s => ({ ...s, data: s.data.map((t, i) => i === idx ? { ...t, subject: val } : t) }));
                }}
              />
              <textarea
                className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm h-32"
                placeholder="Body"
                value={tpl.body}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemplates(s => ({ ...s, data: s.data.map((t, i) => i === idx ? { ...t, body: val } : t) }));
                }}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={async () => {
                    // regenerate this category via backend
                    try {
                      const res = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignId}/categories/${tpl.categoryId}/regenerate`, {
                        method: 'POST',
                        headers: { 'Accept': 'application/json' }
                      });
                      const data = await res.json();
                      if (data?.template) {
                        setTemplates(s => ({ ...s, data: s.data.map((t, i) => i === idx ? { ...t, subject: data.template.subject, body: data.template.body } : t) }));
                      }
                    } catch (e) {}
                  }}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white flex items-center"
                >
                  <Wand2 className="w-3 h-3 mr-1" /> Regenerate
                </button>
                <button
                  onClick={async () => {
                    // Set local loading state for this button
                    const loadingButton = document.getElementById(`follow-up-btn-${idx}`);
                    if (loadingButton) {
                      loadingButton.disabled = true;
                      loadingButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...';
                    }
                    
                    try {
                      // First get the current template to use as reference
                      const templateData = {
                        categoryId: tpl.categoryId,
                        subject: tpl.subject,
                        body: tpl.body
                      };
                      
                      // Call the follow-up generation API with the template data
                      const res = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignId}/generate-followups/`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        body: JSON.stringify({ template: templateData })
                      });
                      
                      if (!res.ok) throw new Error('Failed to generate follow-up');
                      
                      // Refresh templates after generating follow-up
                      const templatesRes = await fetch(`http://localhost:8000/campaigns/${campaignId}/templates/`, {
                        headers: { 'Accept': 'application/json' }
                      });
                      const templatesData = await templatesRes.json();
                      const mapped = (templatesData || []).map(t => ({
                        id: t.id,
                        categoryId: t.category || 'other',
                        subject: t.subject || '',
                        body: t.body || '',
                        step: t.step || 1
                      }));
                      setTemplates({ loading: false, data: mapped, error: null, saving: false });
                      
                      // Show success message
                      const msgEl = document.createElement('div');
                      msgEl.className = 'text-xs text-green-600 mt-1';
                      msgEl.innerHTML = 'Follow-up generated successfully!';
                      const parentDiv = loadingButton ? loadingButton.parentElement : null;
                      if (parentDiv) {
                        parentDiv.appendChild(msgEl);
                        setTimeout(() => {
                          if (parentDiv.contains(msgEl)) {
                            parentDiv.removeChild(msgEl);
                          }
                        }, 3000);
                      }
                      
                    } catch (e) {
                      // Create and show error message
                      setTemplates(s => ({ ...s, error: `Failed to generate follow-up: ${e.message}` }));
                      
                      // Show error message under the button
                      const msgEl = document.createElement('div');
                      msgEl.className = 'text-xs text-red-600 mt-1';
                      msgEl.innerHTML = `Error: ${e.message}`;
                      const parentDiv = loadingButton ? loadingButton.parentElement : null;
                      if (parentDiv) {
                        parentDiv.appendChild(msgEl);
                        setTimeout(() => {
                          if (parentDiv.contains(msgEl)) {
                            parentDiv.removeChild(msgEl);
                          }
                        }, 5000);
                      }
                    } finally {
                      // Reset button state
                      if (loadingButton) {
                        loadingButton.disabled = false;
                        loadingButton.innerHTML = '<svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg> Generate Follow-up';
                      }
                    }
                  }}
                  id={`follow-up-btn-${idx}`}
                  className="px-3 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 flex items-center"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Generate Follow-up
                </button>
              </div>
                </div>
              ))}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-md font-medium text-white mb-2">Follow-up Emails</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.data
              .filter(tpl => tpl.step && tpl.step > 1)
              .sort((a, b) => a.id - b.id) // Sort by ID to ensure consistent order
              .map((tpl, idx) => (
                <div key={idx} className="border border-gray-700 rounded-xl p-4 border-l-4 border-l-amber-500 bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-400 mr-2">Category</div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-300">
                        Follow-up #{idx + 1}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs px-2 py-0.5 rounded-full bg-gray-700/70 text-gray-300">{tpl.categoryId}</div>
                      {tpl.id && (
                        <button
                          title="Delete template"
                          className="p-1 rounded hover:bg-red-900/30"
                          onClick={async () => {
                            if (!window.confirm('Delete this template?')) return;
                            try {
                              const res = await fetch(`/api/templates/${tpl.id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                              if (!res.ok) throw new Error('Failed to delete template');
                              setTemplates(s => ({ ...s, data: s.data.filter(t => t.id !== tpl.id) }));
                            } catch (e) {
                              alert('Failed to delete template');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 mb-2 text-sm"
                    placeholder="Subject"
                    value={tpl.subject}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTemplates(s => ({ ...s, data: s.data.map((t) => t.id === tpl.id ? { ...t, subject: val } : t) }));
                    }}
                  />
                  <textarea
                    className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm h-32"
                    placeholder="Body"
                    value={tpl.body}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTemplates(s => ({ ...s, data: s.data.map((t) => t.id === tpl.id ? { ...t, body: val } : t) }));
                    }}
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={async () => {
                        // regenerate this category via backend
                        try {
                          const res = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignId}/categories/${tpl.categoryId}/regenerate`, {
                            method: 'POST',
                            headers: { 'Accept': 'application/json' }
                          });
                          const data = await res.json();
                          if (data?.template) {
                            setTemplates(s => ({ ...s, data: s.data.map((t) => t.id === tpl.id ? { ...t, subject: data.template.subject, body: data.template.body } : t) }));
                          }
                        } catch (e) {}
                      }}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white flex items-center"
                    >
                      <Wand2 className="w-3 h-3 mr-1" /> Regenerate
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button
            onClick={async () => {
              try {
                setTemplates(s => ({ ...s, saving: true }));
                const res = await fetch(`http://localhost:8000/api/neutrino/campaigns/${campaignId}/templates`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                  body: JSON.stringify({ templates: templates.data })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Failed to save templates');
              } catch (e) {
                setTemplates(s => ({ ...s, error: e.message }));
              } finally {
                setTemplates(s => ({ ...s, saving: false }));
              }
            }}
            disabled={templates.saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
          >
            {templates.saving ? 'Saving...' : 'Save Templates'}
          </button>
        </div>
      </div>

        <div className="bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-white">Contacts</h3>
          <button
            onClick={() => { setContactsOpen(true); fetchContacts(1); }}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-xl hover:bg-orange-600"
          >
            View Contacts
          </button>
        </div>
        <p className="text-sm text-gray-400">Open the contacts panel to see recipients, subscription status, and details.</p>
      </div>
      </div>

      {contactsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
          <div className="w-full max-w-xl bg-gray-800 h-full shadow-xl flex flex-col border-l border-gray-700 text-white">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h4 className="text-lg font-semibold">Campaign Contacts</h4>
              <button onClick={() => setContactsOpen(false)} className="p-2 rounded-lg hover:bg-gray-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {contacts.error && <div className="text-sm text-red-600 mb-2">{contacts.error}</div>}
              {contacts.loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.data.map(c => (
                      <tr key={c.id} className="border-t border-gray-700">
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4">{c.email}</td>
                        <td className="py-2">
                          {c.unsubscribed ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-300">Unsubscribed</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/30 text-emerald-300">Subscribed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">Total: {contacts.total}</div>
              <div className="space-x-2">
                <button onClick={() => fetchContacts(Math.max(1, (contacts.page || 1) - 1))} className="px-3 py-1 rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white">Prev</button>
                <button onClick={() => fetchContacts((contacts.page || 1) + 1)} className="px-3 py-1 rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-white">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;


