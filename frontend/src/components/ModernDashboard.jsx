import React, { useState, useEffect } from 'react';
// Using native Date methods instead of external dependencies
import {
  Search, Bell, Mail, BarChart3, Users, Calendar, ChevronLeft, ChevronRight,
  PlusCircle, RefreshCw, ExternalLink, Clock, User, ArrowUpRight
} from 'lucide-react';

const ModernDashboard = () => {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    earnings: 2890,
    totalBalance: '2M',
    bookings: 24,
    demographics: 20
  });
  
  // Navigation items
  const navItems = [
    { name: 'Overview', active: true, icon: BarChart3 },
    { name: 'Reports', active: false, icon: Mail }
  ];

  // Days of week
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Format date for display
  const formatDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
      day: date.getDate(),
      month: months[date.getMonth()],
      year: date.getFullYear(),
      dayName: days[date.getDay()]
    };
  };
  
  // Get current month days
  const getDaysInMonth = () => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const days = [];
    while (date.getMonth() === selectedDate.getMonth()) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  // Dummy events data
  useEffect(() => {
    setEvents([
      {
        id: 1,
        title: 'Award Show Discussion',
        time: '09:00 AM — 10:00 AM',
        type: 'meeting',
        color: 'bg-emerald-500'
      },
      {
        id: 2,
        title: 'New Branding work Ave',
        time: '11:00 AM — 12:30 PM',
        type: 'work',
        color: 'bg-amber-400'
      },
      {
        id: 3,
        title: 'Development Discussion',
        time: '12:00 PM — 03:30 PM',
        type: 'development',
        color: 'bg-rose-400'
      }
    ]);
  }, []);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  // Active bookings data
  const activeBookings = [
    {
      id: 1,
      title: 'Award Ceremony',
      time: '12:30 - 15:45',
      participants: [
        { initials: 'JD', bgColor: 'bg-blue-500' },
        { initials: 'AM', bgColor: 'bg-green-500' },
        { initials: 'RK', bgColor: 'bg-red-500' }
      ],
      type: 'team',
      status: 'active'
    },
    {
      id: 2,
      title: 'Design Discussion',
      time: '16:30 - 20:00',
      participants: [
        { initials: 'SM', bgColor: 'bg-purple-500' },
        { initials: 'TG', bgColor: 'bg-yellow-500' }
      ],
      type: 'meeting',
      status: 'active'
    }
  ];
  
  return (
    <div className="flex min-h-screen bg-emerald-50">
      {/* Sidebar */}
      <div className="w-64 bg-white rounded-3xl m-4 p-6 flex flex-col">
        <div className="flex items-center mb-10">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mr-4">
            <div className="w-6 h-8 bg-white rounded-r-full"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold">Main Dashboard</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mb-8">
          {navItems.map((item, index) => (
            <button 
              key={index}
              className={`flex items-center w-full p-3 mb-2 rounded-xl text-left ${
                item.active 
                  ? 'text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button className="px-4 py-2 border-b-2 border-emerald-500 text-emerald-600 font-medium">
              Booking
            </button>
            <button className="px-4 py-2 text-gray-500">
              Amenities
            </button>
            <button className="px-4 py-2 text-gray-500">
              Customization
            </button>
            <button className="px-4 py-2 text-gray-500">
              Locality
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500">Today's Earning</div>
            <div className="text-xl font-bold">${stats.earnings}</div>
            <div className="mt-2">
              <svg width="100%" height="30" viewBox="0 0 100 30" className="text-emerald-500">
                <path d="M0,15 L10,10 L20,20 L30,5 L40,15 L50,10 L60,20 L70,15 L80,5 L90,10 L100,15" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" />
              </svg>
            </div>
          </div>
          
          <div className="bg-amber-400 p-4 rounded-xl shadow-sm">
            <div className="text-white text-sm">Demographics</div>
            <div className="text-4xl font-bold text-white mt-2">{stats.demographics}</div>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-xl shadow-sm col-span-2">
            <div className="mb-1 text-sm text-gray-500">Today's Bookings</div>
            <div className="text-2xl font-bold">{stats.bookings}</div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 col-span-2">
            <div className="text-sm text-gray-500">Total Balance</div>
            <div className="text-xl font-bold">${stats.totalBalance}</div>
          </div>
        </div>

        {/* Promo Card */}
        <div className="bg-teal-800 p-5 rounded-xl text-white relative overflow-hidden mt-auto">
          <div className="relative z-10">
            <div className="text-lg font-bold mb-1">20% OFF</div>
            <div className="text-xs mb-3">On your first booking</div>
            <div className="bg-white text-teal-800 text-xs py-1 px-3 rounded-full inline-block font-bold">
              NEWBIE20
            </div>
            <div className="text-xs mt-1">COPY CODE</div>
          </div>
          <div className="absolute right-3 bottom-3">
            <div className="flex">
              <div className="w-20 h-32 bg-teal-700 rounded-xl"></div>
              <div className="w-6 h-32 bg-teal-600 rounded-xl ml-2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-3xl p-6 h-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-72">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search Rooms" 
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Mail className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center ml-4">
                <div className="mr-3 text-right">
                  <div className="font-medium">Thomas Gepsan</div>
                  <div className="text-xs text-gray-500">Super Admin</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                  TG
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="flex">
            {/* Left content */}
            <div className="w-3/5 pr-6">
              <h2 className="text-2xl font-bold mb-6">Manage</h2>
              
              {/* Building Image */}
              <div className="rounded-xl overflow-hidden h-48 mb-6 bg-gradient-to-r from-emerald-400 to-teal-500 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-xl font-bold">Office Building</div>
                </div>
                <div className="absolute top-3 right-3 bg-white p-1 rounded-full">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              
              {/* Design Meetings Card */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6 shadow-sm">
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium">Design Meetings</h3>
                  <span className="text-sm text-gray-500">11 Min Left</span>
                </div>
                <div className="flex mt-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white -mr-2 flex items-center justify-center text-white text-xs font-bold">JD</div>
                  <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white -mr-2 flex items-center justify-center text-white text-xs font-bold">AM</div>
                  <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold">+5</div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-4 flex justify-between items-center">
                Active Bookings
                <button className="text-sm text-emerald-600 flex items-center">
                  Check All <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </h2>
              
              {/* Active Bookings */}
              <div className="space-y-4">
                {activeBookings.map(booking => (
                  <div key={booking.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{booking.title}</h3>
                      <div className="text-sm text-gray-500">{booking.time}</div>
                      <div className="flex mt-2 space-x-2">
                        <span className="bg-amber-100 text-amber-600 text-xs px-2 py-1 rounded-full">Team</span>
                        <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-1 rounded-full">Meeting</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex mr-4">
                        {booking.participants.map((participant, idx) => (
                          <div key={idx} className={`w-8 h-8 rounded-full ${participant.bgColor} border-2 border-white -mr-2 flex items-center justify-center text-white text-xs font-bold`}>{participant.initials}</div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right Content (Calendar) */}
            <div className="w-2/5">
              {/* Date Header */}
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-bold">
                      {formatDate(selectedDate).month}, {formatDate(selectedDate).day} <span className="font-normal text-gray-500">{formatDate(selectedDate).dayName}</span>
                    </h2>
                  </div>
                  <div className="flex">
                    <button
                      onClick={goToPreviousMonth}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={goToNextMonth}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Calendar */}
              <div className="mb-8">
                {/* Days of week */}
                <div className="grid grid-cols-7 mb-2">
                  {weekDays.map((day, index) => (
                    <div key={index} className="text-center text-sm text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    // Get first day of the month
                    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                    // Get day of the week for first day (0-6, where 0 is Sunday)
                    const firstDayOfWeek = firstDay.getDay();
                    // Get days in current month
                    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                    // Get days in previous month
                    const daysInPrevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate();
                    
                    // Create array of all calendar cells
                    const calendarDays = [];
                    
                    // Add previous month days
                    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
                      calendarDays.push({
                        day: daysInPrevMonth - i,
                        currentMonth: false,
                        highlight: false
                      });
                    }
                    
                    // Add current month days
                    const currentDate = new Date();
                    const isCurrentMonth = currentDate.getMonth() === selectedDate.getMonth() &&
                                          currentDate.getFullYear() === selectedDate.getFullYear();
                    
                    for (let i = 1; i <= daysInMonth; i++) {
                      // Highlight special days (for demo)
                      let highlight = false;
                      let highlightColor = '';
                      
                      if (i === 10) {
                        highlight = true;
                        highlightColor = 'bg-emerald-600';
                      } else if (i === 12) {
                        highlight = true;
                        highlightColor = 'bg-emerald-800';
                      } else if (i === 20) {
                        highlight = true;
                        highlightColor = 'bg-orange-400';
                      } else if (i === 21) {
                        highlight = true;
                        highlightColor = 'bg-amber-300';
                      } else if (isCurrentMonth && i === currentDate.getDate()) {
                        // Highlight current day if viewing current month
                        highlight = true;
                        highlightColor = 'bg-blue-500';
                      }
                      
                      calendarDays.push({
                        day: i,
                        currentMonth: true,
                        highlight,
                        highlightColor
                      });
                    }
                    
                    // Add next month days to fill the grid
                    const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
                    const nextMonthDays = totalCells - calendarDays.length;
                    
                    for (let i = 1; i <= nextMonthDays; i++) {
                      calendarDays.push({
                        day: i,
                        currentMonth: false,
                        highlight: false
                      });
                    }
                    
                    // Render calendar cells
                    return calendarDays.map((day, index) => (
                      <div
                        key={index}
                        className={`text-center py-2 ${
                          !day.currentMonth ? 'text-gray-300' : ''
                        }`}
                      >
                        {day.highlight ? (
                          <div className={`w-8 h-8 rounded-full ${day.highlightColor} text-white mx-auto flex items-center justify-center`}>
                            {day.day}
                          </div>
                        ) : (
                          day.day
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              
              {/* Timeline */}
              <div className="mt-6">
                <div className="relative">
                  {/* Time markers */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                    <div>08:00</div>
                    <div>08:30</div>
                    <div>09:00</div>
                    <div>09:30</div>
                    <div>10:00</div>
                    <div>10:30</div>
                    <div>11:00</div>
                    <div>11:30</div>
                  </div>
                  
                  {/* Events */}
                  <div className="ml-12 space-y-4">
                    {events.map(event => (
                      <div 
                        key={event.id} 
                        className={`rounded-lg p-3 ${event.color === 'bg-emerald-500' ? 'bg-emerald-100 border-l-4 border-emerald-500' : 
                                     event.color === 'bg-amber-400' ? 'bg-amber-100 border-l-4 border-amber-400' : 
                                     'bg-rose-100 border-l-4 border-rose-400'}`}
                      >
                        <div className="flex">
                          <div className={`w-8 h-8 rounded-full ${event.color} mr-2 flex items-center justify-center`}>
                            {event.type === 'meeting' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : event.type === 'work' ? (
                              <PlusCircle className="w-4 h-4 text-white" />
                            ) : (
                              <Code className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <div className="text-xs text-gray-500">{event.time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dummy Code component since it's not imported from lucide-react
const Code = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

export default ModernDashboard;