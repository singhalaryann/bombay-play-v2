"use client";
import React, { useState, useEffect } from "react";
import { Users, Target, TrendingUp, Clock } from "lucide-react";
import styles from "../../../styles/Overview.module.css";
import { useAuth } from "../../context/AuthContext";
import GetMetrics from "./GetMetrics";

const Overview = ({ selectedTime, apiDateFilter, globalDateFilter }) => {
  const { userId } = useAuth();
  
  // State for storing the metrics data
  const [metricsData, setMetricsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for storing graph metrics data to pass to GetMetrics components
  const [graphsMetricsData, setGraphsMetricsData] = useState(null);
  const [graphsLoading, setGraphsLoading] = useState(true);
  
  // Game ID constant
  const GAME_ID = "blockheads";
  
  // Cache duration: 5 minutes in milliseconds
  const CACHE_DURATION = 5 * 60 * 1000;
  
  // UPDATED: Separated metrics by aggregate type for cards
  const averageMetrics = ["dau", "classic_retention", "avg_session_length"];
  const sumMetrics = ["new_players"];
  
  // Graph metrics to request
  const graphMetricsToRequest = ["dau", "classic_retention", "new_players", "avg_session_length"];

  // UPDATED: New delta calculation formula as per mentor's requirement
  const calculateDeltaPercentage = (newValue, oldValue) => {
    if (!oldValue || oldValue === 0) {
      return { value: 0, isPositive: true };
    }
    
    // NEW FORMULA: ((old - new) / old) * 100
    const delta = ((oldValue - newValue) / oldValue) * 100;
    return {
      value: Math.abs(delta).toFixed(1),
      isPositive: delta <= 0 // Negative delta means value increased (good for business)
    };
  };
  
  // Format value for display based on metric type
  const formatValue = (metric, value) => {
    if (!value && value !== 0) return "N/A";
    
    switch (metric) {
      case "dau":
        return `${Math.round(value).toLocaleString()}`;
      case "new_players":
        return `${Math.round(value).toLocaleString()}`;
      case "avg_session_length":
        return `${Math.round(value)}`;
      case "classic_retention":
        return `${value.toFixed(1)}%`;
      default:
        return `${value}`;
    }
  };

  // UPDATED: Calculate previous period dates based on current period
  const calculatePreviousPeriod = (currentStartDate, currentEndDate) => {
    try {
      // Parse dates from DD-MM-YYYY format
      const [startDay, startMonth, startYear] = currentStartDate.split('-').map(Number);
      const [endDay, endMonth, endYear] = currentEndDate.split('-').map(Number);
      
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      
      // Calculate period length in days
      const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calculate previous period dates
      const prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - periodLength + 1);
      
      // Format back to DD-MM-YYYY
      const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };
      
      return {
        start_date: formatDate(prevStartDate),
        end_date: formatDate(prevEndDate)
      };
    } catch (err) {
      console.error('❌ Error calculating previous period:', err);
      return null;
    }
  };

  // COMPLETELY REWRITTEN: Fetch metrics data with multiple API calls for cards
  const fetchMetricsData = async () => {
    try {
      setIsLoading(true);
      setGraphsLoading(true);
      setMetricsData(null);
      setGraphsMetricsData(null);
      
      if (!apiDateFilter || !apiDateFilter.start_date || !apiDateFilter.end_date) {
        console.log('❌ Invalid date filter');
        return;
      }
      
      console.log('📅 Selected Time:', selectedTime);
      console.log('📊 Current Period:', `${apiDateFilter.start_date} to ${apiDateFilter.end_date}`);
      
      // Calculate previous period for delta
      const previousPeriod = calculatePreviousPeriod(apiDateFilter.start_date, apiDateFilter.end_date);
      if (!previousPeriod) {
        throw new Error('Failed to calculate previous period');
      }
      
      console.log('📊 Previous Period:', `${previousPeriod.start_date} to ${previousPeriod.end_date}`);
      
      // Check cache for cards data
      const cardsCacheKey = `overview_cards_cache_${JSON.stringify(apiDateFilter)}`;
      const cachedCardsData = localStorage.getItem(cardsCacheKey);
      
      let cardsData = null;
      
      if (cachedCardsData) {
        const { data, timestamp } = JSON.parse(cachedCardsData);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('✅ Loading cards from cache');
          cardsData = data;
        }
      }
      
      // Fetch cards data if not cached
      if (!cardsData) {
        console.log('🔄 Fetching fresh cards data...');
        
        // UPDATED: Make 4 API calls for cards (2 current + 2 previous)
        const apiCalls = [
          // Current period - average metrics
          {
            metrics: averageMetrics,
            date_filter: apiDateFilter,
            aggregate: "average",
            game_id: GAME_ID,
            ...(userId && { user_id: userId })
          },
          // Current period - sum metrics
          {
            metrics: sumMetrics,
            date_filter: apiDateFilter,
            aggregate: "sum",
            game_id: GAME_ID,
            ...(userId && { user_id: userId })
          },
          // Previous period - average metrics
          {
            metrics: averageMetrics,
            date_filter: { type: "between", ...previousPeriod },
            aggregate: "average",
            game_id: GAME_ID,
            ...(userId && { user_id: userId })
          },
          // Previous period - sum metrics
          {
            metrics: sumMetrics,
            date_filter: { type: "between", ...previousPeriod },
            aggregate: "sum",
            game_id: GAME_ID,
            ...(userId && { user_id: userId })
          }
        ];
        
        console.log('🚀 Making 4 API calls for cards...');
        
        // Execute all API calls in parallel
        const responses = await Promise.all(
          apiCalls.map(payload => 
            fetch('https://get-metrics-nt4chwvamq-uc.a.run.app', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
          )
        );
        
        // Check all responses are OK
        for (const response of responses) {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }
        
        // Parse all responses
        const [currentAvgData, currentSumData, prevAvgData, prevSumData] = await Promise.all(
          responses.map(r => r.json())
        );
        
        console.log('✅ All cards API calls completed');
        
        // Combine the data
        cardsData = {
          current: { average: currentAvgData, sum: currentSumData },
          previous: { average: prevAvgData, sum: prevSumData }
        };
        
        // Cache the combined data
        localStorage.setItem(cardsCacheKey, JSON.stringify({
          data: cardsData,
          timestamp: Date.now()
        }));
      }
      
      // Process the cards data
      processCardsData(cardsData);
      
      // Fetch graphs data (unchanged logic)
      const graphsCacheKey = `overview_graphs_cache_${JSON.stringify(globalDateFilter)}`;
      const cachedGraphsData = localStorage.getItem(graphsCacheKey);
      
      if (cachedGraphsData) {
        const { data, timestamp } = JSON.parse(cachedGraphsData);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('✅ Loading graphs from cache');
          setGraphsMetricsData(data);
          setGraphsLoading(false);
        } else {
          await fetchGraphsData(graphsCacheKey);
        }
      } else {
        await fetchGraphsData(graphsCacheKey);
      }
      
      setIsLoading(false);
      
    } catch (err) {
      console.error('❌ Error in fetchMetricsData:', err);
      setError(`Failed to load metrics: ${err.message}`);
      setIsLoading(false);
      setGraphsLoading(false);
    }
  };
  
  // UPDATED: New function to fetch graphs data
  const fetchGraphsData = async (cacheKey) => {
    try {
      console.log('🔄 Fetching graphs data...');
      
      const graphsResponse = await fetch('https://get-metrics-nt4chwvamq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: graphMetricsToRequest,
          date_filter: globalDateFilter,
          ...(userId && { user_id: userId }),
          game_id: GAME_ID
        })
      });
      
      if (!graphsResponse.ok) {
        throw new Error(`HTTP error! status: ${graphsResponse.status}`);
      }
      
      const graphsData = await graphsResponse.json();
      console.log('✅ Graphs data fetched');
      
      setGraphsMetricsData(graphsData);
      setGraphsLoading(false);
      
      // Cache graphs data
      localStorage.setItem(cacheKey, JSON.stringify({
        data: graphsData,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('❌ Error fetching graphs:', err);
      setGraphsLoading(false);
    }
  };
  
  // COMPLETELY REWRITTEN: Process cards data with new API response structure
  const processCardsData = (data) => {
    if (!data || !data.current || !data.previous) {
      console.log('❌ Invalid cards data structure');
      setMetricsData(null);
      return;
    }
    
    const processedMetrics = {};
    
    // Process average metrics
    if (data.current.average?.metrics && data.previous.average?.metrics) {
      data.current.average.metrics.forEach(currentMetric => {
        const metricId = currentMetric.metric_id;
        const prevMetric = data.previous.average.metrics.find(m => m.metric_id === metricId);

        // // Handle classic_retention in average section
        // if (metricId === "classic_retention") {
        //   if (currentMetric.series && prevMetric?.series) {
        //     const currentDay7 = currentMetric.series.find(s => s.name === "Day 7");
        //     const prevDay7 = prevMetric.series.find(s => s.name === "Day 7");
        //     if (currentDay7?.value !== undefined && prevDay7?.value !== undefined) {
        //       const currentValue = currentDay7.value;
        //       const previousValue = prevDay7.value;
        //       const delta = calculateDeltaPercentage(currentValue, previousValue);
        //       processedMetrics[metricId] = {
        //         title: "Classic Retention (7D)",
        //         value: formatValue(metricId, currentValue),
        //         change: `${delta.isPositive ? '+' : '-'}${delta.value}%`,
        //         isPositive: delta.isPositive,
        //         icon: Target
        //       };
        //     }
        //   }
        //   return;
        // }

        // Handle other average metrics (dau, avg_session_length)
        if (currentMetric.values?.value !== undefined && prevMetric?.values?.value !== undefined) {
          const currentValue = currentMetric.values.value;
          const previousValue = prevMetric.values.value;
          const delta = calculateDeltaPercentage(currentValue, previousValue);
          let icon;
          switch (metricId) {
            case "dau":
              icon = Users;
              break;
            case "avg_session_length":
              icon = Clock;
              break;
            default:
              icon = Target;
          }
          processedMetrics[metricId] = {
            title: metricId === "dau" ? "Average Daily Active Users" : currentMetric.name,
            value: formatValue(metricId, currentValue),
            change: `${delta.isPositive ? '+' : '-'}${delta.value}%`,
            isPositive: delta.isPositive,
            icon
          };
        }
      });
    }
    // Process sum metrics (now for new_players)
    if (data.current.sum?.metrics && data.previous.sum?.metrics) {
      data.current.sum.metrics.forEach(currentMetric => {
        const metricId = currentMetric.metric_id;
        // Handle new_players in sum section
        if (metricId === "new_players") {
          const prevMetric = data.previous.sum.metrics.find(m => m.metric_id === metricId);
          if (currentMetric.values?.value !== undefined && prevMetric?.values?.value !== undefined) {
            const currentValue = currentMetric.values.value;
            const previousValue = prevMetric.values.value;
            const delta = calculateDeltaPercentage(currentValue, previousValue);
            processedMetrics[metricId] = {
              title: currentMetric.name,
              value: formatValue(metricId, currentValue),
              change: `${delta.isPositive ? '+' : '-'}${delta.value}%`,
              isPositive: delta.isPositive,
              icon: TrendingUp
            };
          }
        }
      });
    }
    console.log('✅ Cards processed successfully');
    setMetricsData(processedMetrics);
  };

  // Fetch metrics when date filters change
  useEffect(() => {
    if (apiDateFilter && apiDateFilter.start_date && apiDateFilter.end_date) {
      console.log('🔄 Date filter changed, fetching metrics...');
      fetchMetricsData();
    }
  }, [apiDateFilter, globalDateFilter]);

  // Define order of metrics for display
  const metricOrder = ["dau", /*"classic_retention",*/ "new_players", "avg_session_length"];

  // Map of metrics for the overview cards
  const getOverviewStats = () => {
    if (!metricsData) {
      // Return loading placeholders
      return metricOrder.map(() => ({
        title: "Loading...",
        value: "...",
        change: "0%",
        isPositive: true,
        icon: Users,
      }));
    }
    
    // Return metrics in the specified order
    return metricOrder.map(metricId => {
      const metric = metricsData[metricId];
      if (!metric) {
        // Fallback for missing metrics
        let fallbackIcon;
        switch (metricId) {
          case "dau":
            fallbackIcon = Users;
            break;
          case "classic_retention":
            fallbackIcon = Target;
            break;
          case "new_players":
            fallbackIcon = TrendingUp;
            break;
          case "avg_session_length":
            fallbackIcon = Clock;
            break;
          default:
            fallbackIcon = Target;
        }
        
        return {
          title: "No Data",
          value: "N/A",
          change: "0%",
          isPositive: true,
          icon: fallbackIcon
        };
      }
      
      return metric;
    });
  };

  // Helper function to extract metrics data for specific metric
  const getMetricData = (metricId) => {
    if (!graphsMetricsData || !graphsMetricsData.metrics || !Array.isArray(graphsMetricsData.metrics)) {
      return null;
    }
    
    return graphsMetricsData.metrics.find(m => m.metric_id === metricId) || null;
  };

  // Render the overview stats
  return (
    <div className={styles.overviewContainer}>
      {/* Static line above the cards */}
      <div className={styles.latestDateObserved}>
        Latest Date observed as 31 March 2025
      </div>
      <div className={styles.statsGrid}>
        {getOverviewStats().map((stat, index) => (
          <div key={index} className={`${styles.statCard} ${isLoading ? styles.loading : ''}`}>
            <div className={styles.statHeader}>
              <h3>{stat.title}</h3>
              <stat.icon size={20} className={styles.statIcon} />
            </div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={`${styles.statChange} ${stat.isPositive ? styles.positive : styles.negative}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      {/* Section to display graphs for each metric using GetMetrics with pre-fetched data */}
      <div className={styles.overviewGraphsContainer}>
        <GetMetrics 
          selectedTime={selectedTime}
          specificMetric="dau"
          specificMetricType="line"
          readOnly={true}
          initialDateFilter={globalDateFilter}
          hideSkeletons={graphsLoading ? false : true}
          prefetchedData={getMetricData("dau")}
          isDataLoading={graphsLoading}
        />
        
        <GetMetrics 
          selectedTime={selectedTime}
          specificMetric="classic_retention"
          specificMetricType="multiline"
          readOnly={true}
          initialDateFilter={globalDateFilter}
          hideSkeletons={true}
          prefetchedData={getMetricData("classic_retention")}
          isDataLoading={graphsLoading}
        />
        
        <GetMetrics 
          selectedTime={selectedTime}
          specificMetric="new_players"
          specificMetricType="line"
          readOnly={true}
          initialDateFilter={globalDateFilter}
          hideSkeletons={true}
          prefetchedData={getMetricData("new_players")}
          isDataLoading={graphsLoading}
        />
        
        <GetMetrics 
          selectedTime={selectedTime}
          specificMetric="avg_session_length"
          specificMetricType="line"
          readOnly={true}
          initialDateFilter={globalDateFilter}
          hideSkeletons={true}
          prefetchedData={getMetricData("avg_session_length")}
          isDataLoading={graphsLoading}
        />
      </div>
    </div>
  );
};

export default Overview;