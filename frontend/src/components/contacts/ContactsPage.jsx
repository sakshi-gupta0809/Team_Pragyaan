// frontend/src/components/Contacts/ContactsPage.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios"; // or import your src/api/axios.js instance

function StatusLabel({ unsubscribed }) {
  if (unsubscribed) {
    return <span className="text-sm px-2 py-1 rounded-full bg-red-100 text-red-700">Unsubscribed</span>;
  }
  return <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-700">Subscribed</span>;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchContacts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // debounce
    const t = setTimeout(() => fetchContacts(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, campaignId, status]);

  useEffect(() => {
    fetchContacts(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function fetchCampaigns() {
    try {
      const res = await axios.get("/api/campaigns");
      setCampaigns(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchContacts(requestPage = page) {
    setLoading(true);
    try {
      const params = { page: requestPage, page_size: pageSize };
      if (search) params.search = search;
      if (campaignId) params.campaign_id = campaignId;
      if (status && status !== "all") params.status = status;

      const res = await axios.get("/api/contacts", { params });
      const data = res.data;
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(data.page || requestPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Contacts</h2>

      <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
               placeholder="Search by name or email..." className="border rounded px-3 py-2 w-full md:w-80" />

        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2">
          <option value="all">All</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>

        <div className="ml-auto text-sm text-gray-600">{total} contacts</div>
      </div>

      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LinkedIn</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y">
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center">Loading...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">No contacts found.</td></tr>
            ) : (
              contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{c.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c.email}</td>
                  <td className="px-6 py-4 text-sm">{c.campaign_name || "-"}</td>
                  <td className="px-6 py-4 text-sm"><StatusLabel unsubscribed={c.unsubscribed} /></td>
                  <td className="px-6 py-4 text-sm">
                    {c.linkedin_url ? <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">Open</a> : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border">Previous</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded border">Next</button>
        </div>
      </div>
    </div>
  );
}
