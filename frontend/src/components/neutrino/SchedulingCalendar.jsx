import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Info, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

const SchedulingCalendar = ({ campaignStart, categories, onScheduleApprove, isLoading }) => {
  const [followUpDays, setFollowUpDays] = useState([0, 2, 5, 9, 14]);
  const [scheduleData, setScheduleData] = useState([]);
  const [view, setView] = useState('timeline'); // 'timeline' or 'calendar'
  
  // Calculate schedule data based on campaign start and follow-up days
  useEffect(() => {
    if (!campaignStart) return;
    
    const startDate = new Date(campaignStart);
    const schedule = [];
    
    // For each category and follow-up day, calculate the send date
    categories.forEach(category => {
      followUpDays.forEach(days => {
        const sendDate = new Date(startDate);
        sendDate.setDate(startDate.getDate() + days);
        
        // Skip weekends and adjust for US holidays (simplified approach)
        while (isWeekend(sendDate) || isUSHoliday(sendDate)) {
          sendDate.setDate(sendDate.getDate() + 1);
        }
        
        schedule.push({
          category,
          followUpDay: days,
          sendDate,
          description: days === 0 ? 'Initial email' : `Follow-up #${followUpDays.indexOf(days)}`
        });
      });
    });
    
    // Sort by date
    schedule.sort((a, b) => a.sendDate - b.sendDate);
    setScheduleData(schedule);
  }, [campaignStart, categories, followUpDays]);
  
  // Check if date is a weekend
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };
  
  // Simplified US holiday check - in production, use a proper holiday library
  const isUSHoliday = (date) => {
    // This is a simplified implementation - in production use a proper holiday library
    const month = date.getMonth();
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Check for some major US holidays (simplified)
    // New Year's Day
    if (month === 0 && day === 1) return true;
    
    // Independence Day
    if (month === 6 && day === 4) return true;
    
    // Christmas
    if (month === 11 && day === 25) return true;
    
    // Memorial Day (last Monday in May)
    if (month === 4 && date.getDay() === 1) {
      const lastDay = new Date(year, 5, 0).getDate();
      if (day + 7 > lastDay) return true;
    }
    
    // Labor Day (first Monday in September)
    if (month === 8 && date.getDay() === 1 && day <= 7) return true;
    
    // Thanksgiving (fourth Thursday in November)
    if (month === 10 && date.getDay() === 4 && day > 21 && day < 29) return true;
    
    return false;
  };
  
  // Format date for display
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Group schedule data by date for calendar view
  const scheduleByDate = scheduleData.reduce((acc, item) => {
    const dateKey = item.sendDate.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});
  
  // Generate calendar dates (simplified - just show next 3 weeks)
  const calendarDates = [];
  if (campaignStart) {
    const startDate = new Date(campaignStart);
    for (let i = 0; i < 21; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      calendarDates.push(date);
    }
  }
  
  // Get category style
  const getCategoryStyle = (category) => {
    const styles = {
      'operations': 'bg-teal-100 text-teal-800',
      'clinical': 'bg-emerald-100 text-emerald-800',
      'it': 'bg-cyan-100 text-cyan-800',
      'research': 'bg-indigo-100 text-indigo-800',
      'sales': 'bg-amber-100 text-amber-800',
      'executive': 'bg-rose-100 text-rose-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    
    return styles[category.id.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-800">Email Schedule</h2>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                view === 'timeline'
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setView('timeline')}
            >
              Timeline
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                view === 'calendar'
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>
      
      {/* Follow-up days configuration */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Follow-up sequence:</span>
          <div className="flex flex-wrap gap-2">
            {followUpDays.map((day, index) => (
              <div key={index} className="flex items-center text-sm">
                <span className="px-2 py-1 bg-white border border-gray-300 rounded-md">
                  {day === 0 ? 'Day 0' : `Day ${day}`}
                </span>
                {index < followUpDays.length - 1 && (
                  <ArrowRight className="mx-1 h-3 w-3 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-start">
          <Info className="h-4 w-4 text-primary mt-0.5 mr-1.5 flex-shrink-0" />
          <p className="text-xs text-gray-500">
            The system automatically skips weekends and US holidays. All emails will be sent during business hours (9am-5pm).
          </p>
        </div>
      </div>
      
      {/* Timeline View */}
      {view === 'timeline' && (
        <div className="p-6">
          <div className="relative">
            {/* Timeline */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {scheduleData.map((item, index) => (
              <div key={index} className="flex mb-6 relative">
                {/* Timeline dot */}
                <div className="absolute left-8 w-4 h-4 rounded-full bg-white border-2 border-primary transform -translate-x-1/2"></div>
                
                {/* Date indicator */}
                <div className="flex-none w-16 text-right mr-8 text-sm text-gray-500 font-medium">
                  Day {item.followUpDay}
                </div>
                
                {/* Content */}
                <div className="flex-grow pl-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{item.description}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryStyle(item.category)}`}>
                        {item.category.name}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Calendar className="mr-1.5 h-4 w-4" />
                      {formatDate(item.sendDate)}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="mr-1.5 h-4 w-4" />
                      Between 9:00 AM - 5:00 PM (recipient's local time)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="p-6">
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div key={index} className="bg-gray-100 p-2 text-center text-xs font-medium text-gray-700">
                {day}
              </div>
            ))}
            
            {/* Calendar grid */}
            {calendarDates.map((date, index) => {
              const dateKey = date.toISOString().split('T')[0];
              const dayEvents = scheduleByDate[dateKey] || [];
              const isWeekendDay = isWeekend(date);
              const isHoliday = isUSHoliday(date);
              
              return (
                <div 
                  key={index}
                  className={`bg-white min-h-[100px] p-2 ${
                    isWeekendDay || isHoliday 
                      ? 'bg-gray-50' 
                      : ''
                  }`}
                >
                  <div className="text-right">
                    <span className={`text-xs font-medium ${
                      isWeekendDay || isHoliday 
                        ? 'text-gray-400' 
                        : date.getDate() === new Date().getDate() && 
                          date.getMonth() === new Date().getMonth() &&
                          date.getFullYear() === new Date().getFullYear()
                          ? 'bg-primary text-dark rounded-full w-6 h-6 flex items-center justify-center'
                          : 'text-gray-700'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>
                  
                  {isHoliday && (
                    <div className="mt-1 px-1.5 py-0.5 bg-red-50 text-red-800 text-xs rounded">
                      Holiday
                    </div>
                  )}
                  
                  {/* Events for this day */}
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((event, eventIndex) => (
                      <div 
                        key={eventIndex}
                        className={`px-1.5 py-0.5 rounded text-xs font-medium truncate ${getCategoryStyle(event.category)}`}
                        title={`${event.category.name}: ${event.description}`}
                      >
                        {event.category.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {scheduleData.length} emails scheduled across {categories.length} categories
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-secondary bg-dark hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={onScheduleApprove}
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
                Approve Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulingCalendar;