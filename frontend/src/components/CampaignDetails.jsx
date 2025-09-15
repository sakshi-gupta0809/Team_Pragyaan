import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, Mail, Eye, MousePointer, X, RefreshCw, Wand2, Trash2 } from 'lucide-react';

const CampaignDetails = ({ campaignId, onBack }) => {
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

  useEffect(() => {
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
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-xl bg-gray-50">{icon}</div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-xl font-semibold text-gray-900">{value}</div>
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
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#111827">{total}</text>
      </svg>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900 font-medium flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns
        </button>
        <button onClick={fetchStats} disabled={stats.loading} className="text-sm px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center">
          <RefreshCw className="w-4 h-4 mr-2" /> {stats.loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0 mb-3 items-stretch">
        <div className="h-28">
          <StatCard icon={<Users className="h-5 w-5 text-teal-600" />} label="Recipients" value={stats.data ? stats.data.recipients : 0} />
        </div>
        <div className="h-28">
          <StatCard icon={<Mail className="h-5 w-5 text-emerald-600" />} label="Emails Sent" value={stats.data ? stats.data.emails_sent : 0} />
        </div>
        <div className="h-28">
          <StatCard icon={<Eye className="h-5 w-5 text-emerald-600" />} label="Open Rate" value={stats.data ? `${stats.data.open_rate}%` : '0%'} />
        </div>
        <div className="h-28">
          <StatCard icon={<MousePointer className="h-5 w-5 text-yellow-600" />} label="Click Rate" value={stats.data ? `${stats.data.click_rate}%` : '0%'} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Overview</h3>
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
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Templates</h3>
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
            className="text-sm px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            {templates.loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {templates.error && <div className="text-sm text-red-600 mb-2">{templates.error}</div>}
        {(!templates.loading && (!templates.data || templates.data.length === 0)) && (
          <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50">
            <div className="text-sm text-gray-700 mb-2">No templates saved yet for this campaign.</div>
            <div className="text-xs text-gray-500 mb-3">Generate starter templates from categories and then customize them.</div>
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
              className="px-4 py-2 bg-black text-white rounded-xl hover:bg-opacity-90 text-sm"
            >
              Generate Initial Templates
            </button>
          </div>
        )}
        {/* Group templates by initial and follow-ups */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-800 mb-2">Initial Emails</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.data
              .filter(tpl => !tpl.step || tpl.step === 1)
              .map((tpl, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-500 mr-2">Category</div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Initial Email</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{tpl.categoryId}</div>
                  {tpl.id && (
                    <button
                      title="Delete template"
                      className="p-1 rounded hover:bg-red-50"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 text-sm"
                placeholder="Subject"
                value={tpl.subject}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemplates(s => ({ ...s, data: s.data.map((t, i) => i === idx ? { ...t, subject: val } : t) }));
                }}
              />
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32"
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
                  className="px-3 py-1 text-xs rounded-lg border hover:bg-gray-50 flex items-center"
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
                  className="px-3 py-1 text-xs rounded-lg bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 flex items-center"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Generate Follow-up
                </button>
              </div>
                </div>
              ))}
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-800 mb-2">Follow-up Emails</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.data
              .filter(tpl => tpl.step && tpl.step > 1)
              .sort((a, b) => a.id - b.id) // Sort by ID to ensure consistent order
              .map((tpl, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-500 mr-2">Category</div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Follow-up #{idx + 1}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{tpl.categoryId}</div>
                      {tpl.id && (
                        <button
                          title="Delete template"
                          className="p-1 rounded hover:bg-red-50"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 text-sm"
                    placeholder="Subject"
                    value={tpl.subject}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTemplates(s => ({ ...s, data: s.data.map((t) => t.id === tpl.id ? { ...t, subject: val } : t) }));
                    }}
                  />
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-32"
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
                      className="px-3 py-1 text-xs rounded-lg border hover:bg-gray-50 flex items-center"
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
            className="px-4 py-2 bg-black text-white rounded-xl hover:bg-opacity-90"
          >
            {templates.saving ? 'Saving...' : 'Save Templates'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
          <button
            onClick={() => { setContactsOpen(true); fetchContacts(1); }}
            className="px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-opacity-90"
          >
            View Contacts
          </button>
        </div>
        <p className="text-sm text-gray-500">Open the contacts panel to see recipients, subscription status, and details.</p>
      </div>

      {contactsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
          <div className="w-full max-w-xl bg-white h-full shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="text-lg font-semibold">Campaign Contacts</h4>
              <button onClick={() => setContactsOpen(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {contacts.error && <div className="text-sm text-red-600 mb-2">{contacts.error}</div>}
              {contacts.loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.data.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="py-2 pr-4">{c.name}</td>
                        <td className="py-2 pr-4">{c.email}</td>
                        <td className="py-2">
                          {c.unsubscribed ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Unsubscribed</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">Subscribed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">Total: {contacts.total}</div>
              <div className="space-x-2">
                <button onClick={() => fetchContacts(Math.max(1, (contacts.page || 1) - 1))} className="px-3 py-1 rounded-lg border">Prev</button>
                <button onClick={() => fetchContacts((contacts.page || 1) + 1)} className="px-3 py-1 rounded-lg border">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;


