"use client";
import React, { useState, useEffect } from "react";
import styles from "../../../styles/ExperimentContent.module.css";
import ExperimentGraphDisplay from "../experiment/ExperimentGraphDisplay";
import LoadingAnimation from "../common/LoadingAnimation";
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

export default function ExperimentContent({ userId }) {
  // Cache duration: 5 minutes in milliseconds
  const CACHE_DURATION = 5 * 60 * 1000;
  const [experimentData, setExperimentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // New states for graph handling
  const [selectedGraphs, setSelectedGraphs] = useState(null);
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [loadingGraphs, setLoadingGraphs] = useState(false);
  // ADDED: New state for skeleton loading
  const [isInitialRender, setIsInitialRender] = useState(true);
  // ADDED: New state to track if we're still loading experiments progressively
  const [loadingProgressively, setLoadingProgressively] = useState(false);

  // Existing useEffect for initial data fetch
  useEffect(() => {
    let isSubscribed = true;
    const fetchExperiments = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setIsInitialRender(false);
        // Check cache first
        const cachedData = localStorage.getItem(`experiments_cache_${userId}`);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            const loadStart = performance.now();
            console.log('🔄 Loading experiments from cache...');
            setExperimentData(data);
            const loadEnd = performance.now();
            console.log(`✅ Cache load completed in ${((loadEnd - loadStart) / 1000).toFixed(2)} seconds`);
            setLoading(false);
            return;
          } else {
            console.log('🕒 Cache expired, fetching fresh data...');
          }
        } else {
          console.log('💭 No cache found, fetching fresh data...');
        }

        // First API call - Get experiment IDs
        const firstApiStart = performance.now();
        console.log('🔄 API Call 1: Fetching experiment IDs...');
        const userExperimentsResponse = await fetch(
          "https://get-user-experiments-q54hzgyghq-uc.a.run.app",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          }
        );
        if (!isSubscribed) return;
        if (!userExperimentsResponse.ok) {
          throw new Error("Failed to fetch user experiments");
        }
        const userExperiments = await userExperimentsResponse.json();
        const firstApiEnd = performance.now();
        console.log(`✅ API Call 1 completed in ${((firstApiEnd - firstApiStart) / 1000).toFixed(2)} seconds`);
        
        if (!isSubscribed) return;
        if (!userExperiments.experiment_ids?.length) {
          setExperimentData([]);
          setLoading(false);
          return;
        }

        // CHANGED: Initialize experimentData as empty array and start showing UI
        setExperimentData([]);
        setLoading(false);
        // CHANGED: Set flag to indicate we're loading progressively
        setLoadingProgressively(true);

        // CHANGED: Second API call - Get experiment details progressively
        const secondApiStart = performance.now();
        console.log(`🔄 API Call 2: Fetching details for ${userExperiments.experiment_ids.length} experiments progressively...`);
        
        // CHANGED: Process each experiment individually instead of waiting for all
        const experimentCache = [];
        for (const id of userExperiments.experiment_ids) {
          if (!isSubscribed) break;
          
          try {
            console.log(`🔄 Fetching experiment ${id}...`);
            const response = await fetch("https://get-experiment-q54hzgyghq-uc.a.run.app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ experiment_id: id }),
            });
            
            if (!response.ok) {
              console.error(`Failed to fetch experiment ${id}`);
              continue;
            }
            
            const result = await response.json();
            const experiment = result.experiment;
            
            // CHANGED: Filter and immediately add each valid experiment to state
            if (experiment && (experiment.status === "active" || experiment.status === "complete")) {
              setExperimentData(prevData => [...prevData, experiment]);
              experimentCache.push(experiment);
              console.log(`✅ Experiment ${id} loaded and displayed`);
            }
          } catch (err) {
            console.error(`❌ Error fetching experiment ${id}:`, err);
          }
        }

        // CHANGED: Store all experiments in cache after loading
        try {
          localStorage.setItem(`experiments_cache_${userId}`, JSON.stringify({
            data: experimentCache,
            timestamp: Date.now()
          }));
          console.log('💾 All experiments cached successfully');
        } catch (error) {
          console.error('❌ Error caching experiments:', error);
        }

        const secondApiEnd = performance.now();
        console.log(`✅ API Call 2 completed in ${((secondApiEnd - secondApiStart) / 1000).toFixed(2)} seconds`);
        console.log(`⏱️ Total API time: ${((secondApiEnd - firstApiStart) / 1000).toFixed(2)} seconds`);
        
        // CHANGED: Signal that progressive loading is complete
        setLoadingProgressively(false);
        setError(null);
      } catch (err) {
        if (isSubscribed) {
          console.error("❌ Error fetching experiments:", err);
          setError("Failed to load experiments");
          // CHANGED: Ensure we reset progressive loading flag on error
          setLoadingProgressively(false);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchExperiments();
    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  // Modified handleExperimentClick to include timing
  const handleExperimentClick = async (experimentId) => {
    console.log("🖱️ Experiment clicked:", experimentId);
    // Toggle graphs if clicking same experiment
    if (selectedExperimentId === experimentId) {
      setSelectedGraphs(null);
      setSelectedExperimentId(null);
      return;
    }
    setLoadingGraphs(true);
    setSelectedExperimentId(experimentId);
    try {
      // Check cache first
      const cachedGraphs = localStorage.getItem(`experiment_graphs_${experimentId}`);
      if (cachedGraphs) {
        const { data, timestamp } = JSON.parse(cachedGraphs);
        if (Date.now() - timestamp < CACHE_DURATION) {
          const loadStart = performance.now();
          console.log('🔄 Loading graphs from cache...');
          setSelectedGraphs(data);
          const loadEnd = performance.now();
          console.log(`✅ Graph cache load completed in ${((loadEnd - loadStart) / 1000).toFixed(2)} seconds`);
          setLoadingGraphs(false);
          return;
        } else {
          console.log('🕒 Graph cache expired, fetching fresh data...');
        }
      } else {
        console.log('💭 No graph cache found, fetching fresh data...');
      }
      // Fetch from API
      const apiStart = performance.now();
      console.log('🔄 API Call: Fetching graph data...');
      const response = await fetch(
        "https://get-experiment-q54hzgyghq-uc.a.run.app",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ experiment_id: experimentId }),
        }
      );
      const data = await response.json();
      const apiEnd = performance.now();
      console.log(`✅ Graph API call completed in ${((apiEnd - apiStart) / 1000).toFixed(2)} seconds`);
      // Cache the graphs data
      try {
        localStorage.setItem(`experiment_graphs_${experimentId}`, JSON.stringify({
          data: data.experiment.graphs,
          timestamp: Date.now()
        }));
        console.log('💾 Graph data cached successfully');
      } catch (error) {
        console.error('❌ Error caching graph data:', error);
      }
      setSelectedGraphs(data.experiment.graphs);
    } catch (err) {
      console.error("❌ Error fetching experiment graphs:", err);
    } finally {
      setLoadingGraphs(false);
    }
  };

  // ADDED: Render skeleton placeholders while loading
  const renderSkeletonContent = () => {
    return (
      <div className={styles.experimentSection}>
        {[1, 2, 3].map((index) => (
          <div key={index} className={`${styles.bundleContainer} ${styles.skeletonContainer}`}>
            <div className={styles.bundleTitle}>
              <div className={styles.titleWrapper}>
                <div className={`${styles.skeletonText} ${styles.skeletonTitle}`}></div>
              </div>
              <div className={`${styles.clickIndicator} ${styles.skeletonButton}`}>
                <BarChart3 size={16} className="text-white opacity-30" />
                <div className={styles.skeletonButtonText}></div>
                <ChevronDown size={16} className="text-white opacity-30" />
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.bundleTable}>
                <thead>
                  <tr className={styles.headerRow}>
                    <th>Test Group</th>
                    <th className={styles.skeletonHeader}></th>
                    <th className={styles.skeletonHeader}></th>
                  </tr>
                </thead>
                <tbody className={styles.glassEffect}>
                  <tr>
                    <td className={styles.groupCell}>Control</td>
                    <td className={`${styles.valueCell} ${styles.skeletonCell}`}></td>
                    <td className={`${styles.valueCell} ${styles.skeletonCell}`}></td>
                  </tr>
                  <tr>
                    <td className={styles.groupCell}>Variant A</td>
                    <td className={`${styles.valueCell} ${styles.skeletonCell}`}></td>
                    <td className={`${styles.valueCell} ${styles.skeletonCell}`}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // UPDATED: Modified loading handler to show skeleton content
  if (isInitialRender) {
    return renderSkeletonContent();
  }
  
  if (loading) {
    return renderSkeletonContent();
  }
  
  if (error)
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
    
  // CHANGED: Added progressive loading indicator
  const isStillLoading = loadingProgressively && experimentData.length === 0;
  
  if (isStillLoading) {
    return renderSkeletonContent();
  }

  if (experimentData.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyMessage}>
          No active or completed experiments found
        </div>
      </div>
    );
  }

  // Existing helper functions
  const getUniqueStatNames = (experiment) => {
    if (!experiment?.result) return [];
    const allStats = [];
    if (experiment.result.control) {
      allStats.push(...experiment.result.control.map((stat) => stat.name));
    }
    if (experiment.result.variant) {
      allStats.push(...experiment.result.variant.map((stat) => stat.name));
    }
    return [...new Set(allStats)];
  };

  const renderGroupRow = (groupName, metrics, statNames) => {
    if (!metrics) return null;
    return (
      <tr>
        <td className={styles.groupCell}>{groupName}</td>
        {statNames.map((statName) => {
          const stat = metrics.find((m) => m.name === statName);
          return (
            <td key={statName} className={styles.valueCell}>
              {stat ? `${stat.value} ${stat.unit}` : "-"}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className={styles.experimentSection}>
      {/* Render experiment tables */}
      {experimentData.map((experiment) => {
        const statNames = getUniqueStatNames(experiment);
        return (
// Remove the onClick from the container and add it only to the button
<div
  key={experiment._id}
  className={styles.bundleContainer}
  // Removed onClick handler from here
  style={{ cursor: "default" }} // Changed cursor to default since the whole container is no longer clickable
>
  <div className={styles.bundleTitle}>
    <div className={styles.titleWrapper}>
      <span className={styles.titleText}>{experiment.label}</span>
    </div>
    {/* Added onClick handler to the button only */}
    <div 
      className={styles.clickIndicator}
      onClick={(e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        handleExperimentClick(experiment._id);
      }}
      style={{ cursor: "pointer" }} // Add cursor pointer to indicate this is clickable
    >
      <BarChart3 size={16} className="text-white opacity-60" />
      <span>Click to view graphs</span>
      {selectedExperimentId === experiment._id ? (
        <ChevronUp size={16} className="text-white opacity-100" />
      ) : (
        <ChevronDown size={16} className="text-white opacity-100" />
      )}
    </div>
  </div>

            <div className={styles.tableWrapper}>
              <table className={styles.bundleTable}>
                <thead>
                  <tr className={styles.headerRow}>
                    <th>Test Group</th>
                    {statNames.map((statName) => (
                      <th key={statName}>{statName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={styles.glassEffect}>
                  {experiment.result?.control &&
                    renderGroupRow(
                      "Control",
                      experiment.result.control,
                      statNames
                    )}
                  {experiment.result?.variant &&
                    renderGroupRow(
                      "Variant A",
                      experiment.result.variant,
                      statNames
                    )}
                </tbody>
              </table>
            </div>
            {/* Graph section */}
            {selectedExperimentId === experiment._id && (
              <div className={styles.graphsContainer}>
                <div className={styles.graphContent}>
                  {loadingGraphs || !selectedGraphs ? (
                    <LoadingAnimation />
                  ) : (
                    <ExperimentGraphDisplay graphs={selectedGraphs} />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* CHANGED: Just show the loading animation at the bottom when progressively loading */}
      {loadingProgressively && (
        <div className={styles.centeredLoader}>
          <LoadingAnimation />
        </div>
      )}
    </div>
  );
}