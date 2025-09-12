import React, { useState } from 'react';
import { Users, Filter, CheckCircle, AlertCircle } from 'lucide-react';

const ContactCategorization = ({ contacts, onApprove, isLoading }) => {
  const [filter, setFilter] = useState('all');

  const categories = [
    { id: 'operations', name: 'Operations', color: 'bg-yellow-100 text-dark' },
    { id: 'clinical', name: 'Clinical', color: 'bg-yellow-50 text-dark' },
    { id: 'it', name: 'IT', color: 'bg-secondary text-dark border border-gray-200' },
    { id: 'research', name: 'R&D', color: 'bg-gray-100 text-dark' },
    { id: 'sales', name: 'Sales', color: 'bg-primary text-dark' },
    { id: 'executive', name: 'Executive', color: 'bg-dark text-secondary' },
    { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  const getCategoryStyle = (category) => {
    const foundCategory = categories.find(c => c.id === category.toLowerCase());
    return foundCategory ? foundCategory.color : 'bg-gray-100 text-gray-800';
  };

  const filteredContacts = filter === 'all' 
    ? contacts 
    : contacts.filter(contact => contact.category.toLowerCase() === filter);

  const contactCountByCategory = categories.map(category => ({
    ...category,
    count: contacts.filter(c => c.category.toLowerCase() === category.id).length
  }));

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-dark" />
            <h2 className="text-2xl font-bold text-gray-800">Contact Categorization</h2>
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <span className="text-sm text-gray-500 mr-2">Filter:</span>
            <div className="relative">
              <select
                className="appearance-none bg-white border border-gray-300 rounded-xl pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-primary focus:border-primary"
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <Filter className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category stats */}
      <div className="px-6 py-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Categories Distribution</h3>
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Designation
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category (Auto-detected)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{contact.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{contact.designation}</div>
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
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  {filter === 'all' ? 'No contacts found' : `No contacts found in the ${filter} category`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {contacts.length} contacts categorized
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={() => window.history.back()}
          >
            Back
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
    </div>
  );
};

export default ContactCategorization;