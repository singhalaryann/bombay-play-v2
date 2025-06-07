"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import styles from "../../styles/Analytics.module.css";
import TabFilter from "../components/dashboard/TabFilter";
import { useAuth } from "../context/AuthContext";
import GetMetrics from "../components/dashboard/GetMetrics";

export default function AnalyticsPage() {
    const { userId } = useAuth();
    
    // Check localStorage for previously selected time filter
    const savedTimeFilter = localStorage.getItem(`analytics_current_filter_${userId}`);
    const [selectedTime, setSelectedTime] = useState(savedTimeFilter || "30D");
    
    // State for date filter to pass to API
    const [dateFilter, setDateFilter] = useState({ type: "last", days: 30 });

    // Helper to format dates for API
    const formatApiDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                console.error('Invalid date string:', dateStr);
                return '';
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        } catch (err) {
            console.error('Error formatting date:', err);
            return '';
        }
    };

    // Handle time filter changes with localStorage persistence
    const handleTimeFilterChange = (newTime) => {
        console.log('Analytics - Time filter changed to:', newTime);
        setSelectedTime(newTime);
        
        // Store current filter in localStorage for page reload
        localStorage.setItem(`analytics_current_filter_${userId}`, newTime);
        
        // Convert UI time filter to API date_filter format
        let apiDateFilter = { type: "last", days: 30 }; // Default
        
        switch(newTime) {
            case "Today":
                apiDateFilter = { type: "last", days: 0 };
                break;
            case "Yesterday":
                apiDateFilter = { type: "last", days: 1 };
                break;
            case "7D":
                apiDateFilter = { type: "last", days: 7 };
                break;
            case "30D":
                apiDateFilter = { type: "last", days: 30 };
                break;
            case "3M":
                apiDateFilter = { type: "last", days: 90 };
                break;
            case "6M":
                apiDateFilter = { type: "last", days: 180 };
                break;
            case "12M":
                apiDateFilter = { type: "last", days: 365 };
                break;
            default:
                // Handle custom date range if implemented
                if (newTime.includes(" - ")) {
                    // Parse date range like "Apr 1, 2025 - Apr 15, 2025"
                    const [start, end] = newTime.split(" - ");
                    apiDateFilter = { 
                        type: "between", 
                        start_date: formatApiDate(start.trim()),
                        end_date: formatApiDate(end.trim())
                    };
                } else if (newTime.startsWith("Since ")) {
                    // Parse "Since Apr 1, 2025"
                    const sinceDate = newTime.replace("Since ", "").trim();
                    apiDateFilter = { 
                        type: "since", 
                        start_date: formatApiDate(sinceDate)
                    };
                } else if (newTime.startsWith("Last ")) {
                    // Parse "Last 45 days"
                    const daysText = newTime.replace("Last ", "").replace(" days", "").trim();
                    const days = parseInt(daysText);
                    if (!isNaN(days)) {
                        apiDateFilter = { type: "last", days: days };
                    }
                }
        }
        
        console.log('Analytics - Converted to API date filter:', apiDateFilter);
        setDateFilter(apiDateFilter);
    };

    // Effect to restore filter from localStorage on page reload
    useEffect(() => {
        if (userId && savedTimeFilter) {
            console.log('Analytics - Restoring saved filter:', savedTimeFilter);
            handleTimeFilterChange(savedTimeFilter);
        }
    }, [userId, savedTimeFilter]);

    // Main render
    return (
        <div className={styles.container}>
            <Header />
            <div className={styles.mainLayout}>
                <Sidebar />
                <main className={styles.mainContent}>
                    <div className={styles.pageHeader}>
                        <h2 className={styles.pageTitle}>Analytics Dashboard</h2>
                        
                        <div className={styles.filterContainer}>
                            <TabFilter 
                                selected={selectedTime} 
                                onChange={handleTimeFilterChange}
                            />
                        </div>
                    </div>
                    
                    <GetMetrics 
                        selectedTime={selectedTime}
                        onTimeChange={handleTimeFilterChange}
                        initialDateFilter={dateFilter}
                        readOnly={true}
                    />
                </main>
            </div>
        </div>
    );
}