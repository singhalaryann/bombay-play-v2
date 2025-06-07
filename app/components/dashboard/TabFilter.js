'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../../../styles/TabFilter.module.css';

// Update/d to accept readOnly prop for displaying filter in disabled state
const TabFilter = ({ selected, onChange, disabled, readOnly }) => {
  // Early return with simplified read-only view if in readOnly mode
  if (readOnly) {
    return (
      <div className={styles.filterWrapper}>
        <div className={styles.dropdown}>
          <div className={`${styles.dropdownToggle} ${styles.readOnly}`}>
            <Calendar size={16} className={styles.calendarIcon} />
            {selected}
          </div>
        </div>
      </div>
    );
  }  const [isOpen, setIsOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dropdownRef = useRef(null);
  const filters = ["Today", "Yesterday", "3D", "7D", "30D", "Custom"]; // Changed: Moved "3D" before "7D" for logical chronological order  // Current date for default selection
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // State for active tab in custom date picker
  const [activeTab, setActiveTab] = useState('fixed');
  
  // States for all date selection modes
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sinceDate, setSinceDate] = useState('');
  const [lastValue, setLastValue] = useState('');
  
  // States for manual text input in fields
  const [startInputValue, setStartInputValue] = useState('');
  const [endInputValue, setEndInputValue] = useState('');
  const [sinceInputValue, setSinceInputValue] = useState('');
  
  // Date for calendar display
  const [displayedMonth, setDisplayedMonth] = useState(currentMonth);
  const [displayedYear, setDisplayedYear] = useState(currentYear);
  const [selectedDates, setSelectedDates] = useState([]);
  const [hoverDate, setHoverDate] = useState(null);
  
  // Calculate days difference for Last tab
  const calculateDaysDifference = (selectedDay, selectedMonth, selectedYear) => {
    const selectedDate = new Date(selectedYear, selectedMonth, selectedDay);
    const todayDate = new Date(currentYear, currentMonth, currentDay);
    
    // Calculate difference in days
    const diffTime = Math.abs(todayDate - selectedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Navigate to previous month
  const goToPrevMonth = () => {
    setDisplayedMonth(prevMonth => {
      if (prevMonth === 0) {
        setDisplayedYear(prevYear => prevYear - 1);
        return 11;
      } else {
        return prevMonth - 1;
      }
    });
  };
  
  // Navigate to next month - only allow up to current month
  const goToNextMonth = () => {
    // Only allow navigation up to current month and year
    if ((displayedMonth < currentMonth && displayedYear === currentYear) || 
        displayedYear < currentYear) {
      setDisplayedMonth(prevMonth => {
        if (prevMonth === 11) {
          setDisplayedYear(prevYear => prevYear + 1);
          return 0;
        } else {
          return prevMonth + 1;
        }
      });
    }
  };
  
  // Generate calendar dates for the displayed month
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Calculate days to display in calendar
  const daysInMonth = getDaysInMonth(displayedMonth, displayedYear);
  const firstDayOfMonth = getFirstDayOfMonth(displayedMonth, displayedYear);
  
  // Format a date for display or input value
  const formatDate = (day, month, year) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  // Format date for display in input field
  const formatDisplayDate = (date) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const month = dateObj.toLocaleString('default', { month: 'short' });
    return `${month} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
  };
  
  // Get month name
  const getMonthName = (month) => {
    return new Date(2000, month, 1).toLocaleString('default', { month: 'long' });
  };
  
  // Handle date selection from calendar
  const handleDateSelect = (day) => {
    const dateString = formatDate(day, displayedMonth, displayedYear);
    
    // Check if the selected date is in the future
    const selectedDate = new Date(displayedYear, displayedMonth, day);
    const todayDate = new Date(currentYear, currentMonth, currentDay);
    
    // Don't allow future date selection
    if (selectedDate > todayDate) {
      return;
    }
    
    if (activeTab === 'fixed') {
      // If no dates are selected, set as start date
      if (!startDate && !endDate) {
        setStartDate(dateString);
        setStartInputValue(formatDisplayDate(dateString));
        setSelectedDates([day]);
      }
      // If only one date is selected, set the other date
      else if (startDate && !endDate) {
        const startDateObj = new Date(startDate);
        const selectedDateObj = new Date(dateString);
        
        if (selectedDateObj >= startDateObj) {
          setEndDate(dateString);
          setEndInputValue(formatDisplayDate(dateString));
          setSelectedDates(prev => [...prev, day]);
        } else {
          // If selected date is before start date, swap them
          setEndDate(startDate);
          setEndInputValue(formatDisplayDate(startDate));
          setStartDate(dateString);
          setStartInputValue(formatDisplayDate(dateString));
          setSelectedDates([day, new Date(startDate).getDate()]);
        }
      }
      // If both dates are selected, allow editing either one
      else if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const selectedDateObj = new Date(dateString);
        
        // If selected date is closer to start date, update start date
        if (Math.abs(selectedDateObj - startDateObj) < Math.abs(selectedDateObj - endDateObj)) {
          if (selectedDateObj <= endDateObj) {
            setStartDate(dateString);
            setStartInputValue(formatDisplayDate(dateString));
            setSelectedDates([day, new Date(endDate).getDate()]);
          } else {
            // If selected date is after end date, swap them
            setStartDate(endDate);
            setStartInputValue(formatDisplayDate(endDate));
            setEndDate(dateString);
            setEndInputValue(formatDisplayDate(dateString));
            setSelectedDates([new Date(endDate).getDate(), day]);
          }
        } else {
          if (selectedDateObj >= startDateObj) {
            setEndDate(dateString);
            setEndInputValue(formatDisplayDate(dateString));
            setSelectedDates([new Date(startDate).getDate(), day]);
          } else {
            // If selected date is before start date, swap them
            setEndDate(startDate);
            setEndInputValue(formatDisplayDate(startDate));
            setStartDate(dateString);
            setStartInputValue(formatDisplayDate(dateString));
            setSelectedDates([day, new Date(startDate).getDate()]);
          }
        }
      }
    } 
    else if (activeTab === 'since') {
      setSinceDate(dateString);
      setSinceInputValue(formatDisplayDate(dateString));
      setSelectedDates([day]);
    } 
    else if (activeTab === 'last') {
      // For Last tab, calculate days difference from today
      const daysDiff = calculateDaysDifference(day, displayedMonth, displayedYear);
      setLastValue(daysDiff.toString());
      setSelectedDates([day]);
    }
  };
  
  // Handle mouse hover on calendar dates for range selection
  const handleDateHover = (day) => {
    setHoverDate(day);
  };
  
  // Check if a date is in the selected range
  const isInRange = (day) => {
    if (activeTab === 'fixed' && startDate && endDate) {
      // For Fixed tab with start and end date selected
      const startDay = new Date(startDate).getDate();
      const endDay = new Date(endDate).getDate();
      
      // For range within same month
      if (displayedMonth === new Date(startDate).getMonth() && 
          displayedMonth === new Date(endDate).getMonth() &&
          displayedYear === new Date(startDate).getFullYear() &&
          displayedYear === new Date(endDate).getFullYear()) {
        const min = Math.min(startDay, endDay);
        const max = Math.max(startDay, endDay);
        return day > min && day < max;
      }
      
      // For range across different months
      if (displayedMonth === new Date(startDate).getMonth() && 
          displayedYear === new Date(startDate).getFullYear()) {
        return day > startDay;
      } else if (displayedMonth === new Date(endDate).getMonth() && 
                displayedYear === new Date(endDate).getFullYear()) {
        return day < endDay;
      } else if (displayedMonth > new Date(startDate).getMonth() && 
                displayedMonth < new Date(endDate).getMonth() &&
                displayedYear === new Date(startDate).getFullYear()) {
        return true;
      }
    }
    
    if (activeTab === 'fixed' && startDate && !endDate && hoverDate) {
      // For Fixed tab with start date selected and hovering for end date
      const startDay = new Date(startDate).getDate();
      const min = Math.min(startDay, hoverDate);
      const max = Math.max(startDay, hoverDate);
      return day > min && day < max;
    }
    
    if (activeTab === 'since') {
      // For hover state - when we're just hovering on a day
      if (!sinceDate && hoverDate) {
        const hoverDate_obj = new Date(displayedYear, displayedMonth, hoverDate);
        const currentDate_obj = new Date(currentYear, currentMonth, currentDay);
        const displayedDate_obj = new Date(displayedYear, displayedMonth, day);
        
        // Don't highlight future dates
        if (displayedDate_obj > currentDate_obj) {
          return false;
        }
        
        // Highlight if date is between hoverDate and current date
        return displayedDate_obj > hoverDate_obj && displayedDate_obj <= currentDate_obj;
      }
      // For selected value
      else if (sinceDate) {
        const sinceDay = new Date(sinceDate).getDate();
        const sinceMonth = new Date(sinceDate).getMonth();
        const sinceYear = new Date(sinceDate).getFullYear();
        const sinceDate_obj = new Date(sinceYear, sinceMonth, sinceDay);
        const currentDate_obj = new Date(currentYear, currentMonth, currentDay);
        const displayedDate_obj = new Date(displayedYear, displayedMonth, day);
        
        // Don't highlight future dates
        if (displayedDate_obj > currentDate_obj) {
          return false;
        }
        
        // Highlight if date is between sinceDate and current date
        return displayedDate_obj > sinceDate_obj && displayedDate_obj <= currentDate_obj;
      }
    }
    if (activeTab === 'last') {
      // For hover state - when we're just hovering on a day
      if (!lastValue && hoverDate) {
        const daysDiff = calculateDaysDifference(hoverDate, displayedMonth, displayedYear);
        if (daysDiff > 0) {
          const tempLastDate = calculateLastDate(daysDiff);
          const tempLastDateObj = new Date(tempLastDate);
          const currentDate_obj = new Date(currentYear, currentMonth, currentDay);
          const displayedDate_obj = new Date(displayedYear, displayedMonth, day);
          
          // Don't highlight future dates
          if (displayedDate_obj > currentDate_obj) {
            return false;
          }
          
          // Highlight if date is between tempLastDate and current date
          return displayedDate_obj > tempLastDateObj && displayedDate_obj <= currentDate_obj;
        }
      }
      // For selected value
      else if (lastValue) {
        const days = parseInt(lastValue);
        if (!isNaN(days) && days > 0) {
          const lastDate = calculateLastDate(days);
          const lastDateObj = new Date(lastDate);
          const currentDate_obj = new Date(currentYear, currentMonth, currentDay);
          const displayedDate_obj = new Date(displayedYear, displayedMonth, day);
          
          // Don't highlight future dates
          if (displayedDate_obj > currentDate_obj) {
            return false;
          }
          
          // Highlight if date is between lastDate and current date
          return displayedDate_obj > lastDateObj && displayedDate_obj <= currentDate_obj;
        }
      }
    }
    
    return false;
  };  
  
  // Handle tab changes in custom date picker
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Reset selections when changing tabs
    setSelectedDates([]);
    
    // If switching to fixed tab, clear dates
    if (tab === 'fixed') {
      setStartDate('');
      setEndDate('');
      setStartInputValue('');
      setEndInputValue('');
    } 
    // If switching to since tab, clear date
    else if (tab === 'since') {
      setSinceDate('');
      setSinceInputValue('');
    }
    // If switching to last tab, clear value
    else if (tab === 'last') {
      setLastValue('');
    }
  };
  
  // Apply date selection based on active tab
  const applyCustomDate = () => {
    let dateString = '';
    
    if (activeTab === 'fixed') {
      if (startDate && endDate) {
        dateString = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
      } else if (startDate) {
        dateString = formatDisplayDate(startDate);
      }
    } else if (activeTab === 'since') {
      if (sinceDate) {
        dateString = `Since ${formatDisplayDate(sinceDate)}`;
      }
    } else if (activeTab === 'last') {
      if (lastValue) {
        dateString = `Last ${lastValue} days`;
      }
    }
    
    if (dateString) {
      onChange(dateString);
      setShowDatePicker(false);
      setIsOpen(false);
    }
  };
  
  // Handle time filter option click
  const handleTimeChange = (filter) => {
    if (filter === "Custom") {
      setShowDatePicker(true);
      return;
    }
    
    onChange(filter);
    setIsOpen(false);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowDatePicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Generate calendar view
  const renderCalendar = () => {
    const days = [];
    const daysInPrevMonth = new Date(displayedYear, displayedMonth, 0).getDate();
    
    // Adjust for Sunday as first day (0 is Sunday in JS)
    const dayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    // Add days from previous month (if needed)
    for (let i = dayOffset; i > 0; i--) {
      days.push(
        <button 
          key={`prev-${i}`} 
          className={`${styles.calendarDateBtn} ${styles.disabled}`}
          disabled
        >
          {daysInPrevMonth - i + 1}
        </button>
      );
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === currentDay && 
                      displayedMonth === currentMonth && 
                      displayedYear === currentYear;
      
      let isSelected = false;
      
      // For fixed tab, check both start and end dates
      if (activeTab === 'fixed') {
        if (startDate && displayedMonth === new Date(startDate).getMonth() && 
            displayedYear === new Date(startDate).getFullYear() && 
            i === new Date(startDate).getDate()) {
          isSelected = true;
        }
        if (endDate && displayedMonth === new Date(endDate).getMonth() && 
            displayedYear === new Date(endDate).getFullYear() && 
            i === new Date(endDate).getDate()) {
          isSelected = true;
        }
      }
      // For since tab, check since date
      else if (activeTab === 'since') {
        if (sinceDate && displayedMonth === new Date(sinceDate).getMonth() && 
            displayedYear === new Date(sinceDate).getFullYear() && 
            i === new Date(sinceDate).getDate()) {
          isSelected = true;
        }
      }
      // For last tab, check selected date
      else if (activeTab === 'last') {
        if (selectedDates.includes(i) && 
            displayedMonth === currentMonth && 
            displayedYear === currentYear) {
          isSelected = true;
        }
      }
      
      // Determine if the date is in range (for highlighting)
      const isInRangeDay = isInRange(i);
      
      // Determine if the date is in the future (should be disabled)
      const isDateInFuture = (displayedYear > currentYear) || 
                             (displayedYear === currentYear && displayedMonth > currentMonth) ||
                             (displayedYear === currentYear && displayedMonth === currentMonth && i > currentDay);
      
      days.push(
        <button 
          key={i}
          className={`
            ${styles.calendarDateBtn} 
            ${isToday ? styles.today : ''} 
            ${isSelected ? styles.selected : ''} 
            ${isInRangeDay ? styles.inRange : ''}
            ${isDateInFuture ? styles.disabled : ''}
          `}
          onClick={() => !isDateInFuture && handleDateSelect(i)}
          onMouseEnter={() => !isDateInFuture && handleDateHover(i)}
          onMouseLeave={() => setHoverDate(null)}
          disabled={isDateInFuture}
        >
          {i}
        </button>
      );
    }
    
    // Fill remaining grid spaces with next month
    const totalCells = Math.ceil((dayOffset + daysInMonth) / 7) * 7;
    for (let i = 1; i <= totalCells - (dayOffset + daysInMonth); i++) {
      days.push(
        <button 
          key={`next-${i}`} 
          className={`${styles.calendarDateBtn} ${styles.disabled}`}
          disabled
        >
          {i}
        </button>
      );
    }
    
    return days;
  };
  
  // Parse date string from input field
  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    
    // Try to parse the date string in format "MMM D, YYYY"
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const month = months[parts[0]];
      const day = parseInt(parts[1].replace(',', ''));
      const year = parseInt(parts[2]);
      
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        const date = new Date(year, month, day);
        if (date.toString() !== 'Invalid Date') {
          return formatDate(date.getDate(), date.getMonth(), date.getFullYear());
        }
      }
    }
    return null;
  };

  // Handle start date input with improved empty input handling
  const handleStartDateInput = (e) => {
    const inputValue = e.target.value;
    setStartInputValue(inputValue);
    
    if (inputValue === '') {
      // Clear the date when input is empty
      setStartDate('');
      if (startDate) {
        // Remove this date from selectedDates if it exists
        const startDay = new Date(startDate).getDate();
        setSelectedDates(prevDates => prevDates.filter(date => date !== startDay));
      }
    } else {
      const parsedDate = parseDateString(inputValue);
      if (parsedDate) {
        setStartDate(parsedDate);
        // Update selected dates if needed
        const newDay = new Date(parsedDate).getDate();
        if (!selectedDates.includes(newDay)) {
          if (endDate) {
            // If end date exists, keep it in selectedDates
            const endDay = new Date(endDate).getDate();
            setSelectedDates([newDay, endDay]);
          } else {
            setSelectedDates([newDay]);
          }
        }
      }
    }
  };
  
  // Handle end date input with improved empty input handling
  const handleEndDateInput = (e) => {
    const inputValue = e.target.value;
    setEndInputValue(inputValue);
    
    if (inputValue === '') {
      // Clear the date when input is empty
      setEndDate('');
      if (endDate) {
        // Remove this date from selectedDates if it exists
        const endDay = new Date(endDate).getDate();
        setSelectedDates(prevDates => prevDates.filter(date => date !== endDay));
      }
    } else {
      const parsedDate = parseDateString(inputValue);
      if (parsedDate) {
        setEndDate(parsedDate);
        // Update selected dates if needed
        const newDay = new Date(parsedDate).getDate();
        if (!selectedDates.includes(newDay)) {
          if (startDate) {
            // If start date exists, keep it in selectedDates
            const startDay = new Date(startDate).getDate();
            setSelectedDates([startDay, newDay]);
          } else {
            setSelectedDates([newDay]);
          }
        }
      }
    }
  };
  
  // Handle since date input with improved empty input handling
  const handleSinceDateInput = (e) => {
    const inputValue = e.target.value;
    setSinceInputValue(inputValue);
    
    if (inputValue === '') {
      // Clear the date when input is empty
      setSinceDate('');
      setSelectedDates([]);
    } else {
      const parsedDate = parseDateString(inputValue);
      if (parsedDate) {
        setSinceDate(parsedDate);
        // Update selected date
        const newDay = new Date(parsedDate).getDate();
        setSelectedDates([newDay]);
      }
    }
  };
  
  // Calculate date for Last tab
  const calculateLastDate = (days) => {
    const today = new Date();
    const lastDate = new Date(today);
    lastDate.setDate(today.getDate() - days);
    return formatDate(lastDate.getDate(), lastDate.getMonth(), lastDate.getFullYear());
  };

  // Handle Last value input with improved empty input handling
  const handleLastValueInput = (e) => {
    const value = e.target.value;
    
    // Always update the input value state
    setLastValue(value);
    
    // If the input is empty, clear selected dates
    if (value === '') {
      setSelectedDates([]);
      return;
    }
    
    // Only process if the value is a valid number
    if (/^\d+$/.test(value)) {
      const days = parseInt(value);
      if (!isNaN(days) && days > 0) {
        const lastDate = calculateLastDate(days);
        const lastDay = new Date(lastDate).getDate();
        const lastMonth = new Date(lastDate).getMonth();
        const lastYear = new Date(lastDate).getFullYear();
        
        // Only update selected dates if the date is in the current view
        if (lastMonth === displayedMonth && lastYear === displayedYear) {
          setSelectedDates([lastDay]);
        } else {
          setSelectedDates([]);
        }
      }
    }
  };
  
  return (
    <div className={styles.filterWrapper} ref={dropdownRef}>
      <div className={styles.dropdown}>
        <button
          className={styles.dropdownToggle}
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          <Calendar size={16} className={styles.calendarIcon} />
          <span className={styles.dateText}>{selected}</span>
          <ChevronDown size={16} />
        </button>
        
        {isOpen && (
          <div className={styles.dropdownMenu}>
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => handleTimeChange(filter)}
                className={`${styles.dropdownItem} ${
                  filter === selected ? styles.active : ""
                }`}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        )}
        
        {/* Custom date picker with tabs */}
        {showDatePicker && (
          <div className={styles.datePickerContainer}>
            {/* Tab navigation */}
            <div className={styles.datePickerTabs}>
              <button 
                className={`${styles.datePickerTab} ${activeTab === 'fixed' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('fixed')}
              >
                Fixed
              </button>
              <button 
                className={`${styles.datePickerTab} ${activeTab === 'since' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('since')}
              >
                Since
              </button>
              <button 
                className={`${styles.datePickerTab} ${activeTab === 'last' ? styles.activeTab : ''}`}
                onClick={() => handleTabChange('last')}
              >
                Last
              </button>
            </div>
            
            {/* Fixed date range tab content */}
            {activeTab === 'fixed' && (
              <div className={styles.tabContent}>
                <div className={styles.dateInputs}>
                  <div className={styles.dateInputGroup}>
                    <label>Start</label>
                    <input
                      type="text"
                      placeholder="Date"
                      value={startInputValue}
                      onChange={handleStartDateInput}
                      className={styles.dateInput}
                    />
                  </div>
                  <div className={styles.dateInputGroup}>
                    <label>End</label>
                    <input
                      type="text"
                      placeholder="Date"
                      value={endInputValue}
                      onChange={handleEndDateInput}
                      className={styles.dateInput}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Since tab content */}
            {activeTab === 'since' && (
              <div className={styles.tabContent}>
                <div className={styles.dateInputs}>
                  <input
                    type="text"
                    placeholder="Since date (e.g. Apr 2, 2025)"
                    value={sinceInputValue}
                    onChange={handleSinceDateInput}
                    className={`${styles.dateInput}`}
                  />
                </div>
              </div>
            )}
            
            {/* Last tab content */}
            {activeTab === 'last' && (
              <div className={styles.tabContent}>
                <div className={styles.lastInputs}>
                  <input
                    type="text"
                    value={lastValue}
                    placeholder="Enter number of days"
                    onChange={handleLastValueInput}
                    className={`${styles.lastValueInput}`}
                  />
                  <div className={styles.lastUnitFixed}>
                    days
                  </div>
                </div>
              </div>
            )}
            
            {/* Calendar display */}
            <div className={styles.calendarView}>
              <div className={styles.calendarHeader}>
                <div className={styles.calendarDays}>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
              
              <div className={styles.calendarMonth}>
                <div className={styles.calendarMonthHeader}>
                  <button 
                    className={styles.monthNavButton}
                    onClick={goToPrevMonth}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {getMonthName(displayedMonth)} {displayedYear}
                  <button 
                    className={styles.monthNavButton}
                    onClick={goToNextMonth}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className={styles.calendarDates}>
                  {renderCalendar()}
                </div>
              </div>
            </div>
            
            <div className={styles.datePickerActions}>
              <div className={styles.rightActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowDatePicker(false)}
                >
                  Cancel
                </button>
                <button
                  className={styles.applyButton}
                  onClick={applyCustomDate}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabFilter;