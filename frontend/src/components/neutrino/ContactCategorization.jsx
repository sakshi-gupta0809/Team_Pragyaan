import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Filter, CheckCircle, AlertCircle } from 'lucide-react';

const ContactCategorization = ({ contacts, onApprove, isLoading }) => {
  const [filter, setFilter] = useState('all');

  const categories = [
    { id: 'operations', name: 'Operations', color: 'bg-teal-900/30 text-teal-300 border border-teal-800/40' },
    { id: 'clinical', name: 'Clinical', color: 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/40' },
    { id: 'it', name: 'IT', color: 'bg-cyan-900/30 text-cyan-300 border border-cyan-800/40' },
    { id: 'research', name: 'R&D', color: 'bg-indigo-900/30 text-indigo-300 border border-indigo-800/40' },
    { id: 'sales', name: 'Sales', color: 'bg-orange-900/30 text-orange-300 border border-orange-800/40' },
    { id: 'executive', name: 'Executive', color: 'bg-gray-700 text-gray-200 border border-gray-600' },
    { id: 'other', name: 'Other', color: 'bg-gray-700 text-gray-300 border border-gray-600' }
  ];

  const getCategoryStyle = (category) => {
    const foundCategory = categories.find(c => c.id === (category || '').toLowerCase());
    return foundCategory ? foundCategory.color : 'bg-gray-700 text-gray-300 border border-gray-600';
  };

  const filteredContacts = filter === 'all' 
    ? contacts 
    : contacts.filter(contact => contact.category.toLowerCase() === filter);

  const contactCountByCategory = categories.map(category => ({
    ...category,
    count: contacts.filter(c => c.category.toLowerCase() === category.id).length
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-gray-800 text-white rounded-2xl shadow-md overflow-hidden border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-orange-400" />
            <h2 className="text-2xl font-bold text-white">Contact Categorization</h2>
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <span className="text-sm text-gray-400 mr-2">Filter:</span>
            <div className="relative">
              <select
                className="appearance-none bg-gray-800 border border-gray-600 rounded-xl pl-3 pr-10 py-2 text-sm text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({contactCountByCategory.find(c => c.id === category.id)?.count || 0})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <Filter className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category stats */}
      <div className="px-6 py-4 bg-gray-900 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Categories Distribution</h3>
        <div className="flex flex-wrap gap-2">
          {contactCountByCategory.map(category => (
            <div 
              key={category.id}
              className={`px-3 py-1 rounded-full text-xs font-medium ${category.color} cursor-pointer`}
              onClick={() => setFilter(category.id === filter ? 'all' : category.id)}
            >
              {category.name}: {category.count}
            </div>
          ))}
        </div>
      </div>

      {/* Contacts table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Designation
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Category (Auto-detected)
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact, index) => (
                <tr key={index} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{contact.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{contact.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{contact.designation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryStyle(contact.category)}`}>
                      {contact.category}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-400">
                  {filter === 'all' ? 'No contacts found' : `No contacts found in the ${filter} category`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {contacts.length} contacts categorized
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-600 shadow-sm text-sm font-medium rounded-xl text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            onClick={() => window.history.back()}
          >
            Back
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            onClick={onApprove}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 -ml-1 h-4 w-4" />
                Approve Categorization
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ContactCategorization;