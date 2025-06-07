'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import styles from '../../../styles/GraphDisplay.module.css';
import { RotateCcw } from 'lucide-react';

const COLORS = ['#82FF83', '#FF6B6B', '#94A3B8', '#FFB86C'];

// Add this after the COLORS constant
const formatValue = (value) => {
  if (typeof value !== 'number') return value;
  return Number.isInteger(value) ? value : value.toFixed(2);
};

/** Tooltip for bar charts */
const CustomTooltip = ({ active, payload, label, valueUnit, y_label, x_label }) => {
  if (active && payload && payload.length) {
    // Get actual category name from payload
    let displayLabel = label;
    if (payload[0] && payload[0].payload && payload[0].payload.name) {
      displayLabel = payload[0].payload.name;
    }
    
    // Use the x_label and y_label (from props) or provide defaults
    const xAxisLabel = x_label || "Category";
    const yAxisLabel = y_label || "Value";
    
    return (
      <div className={styles.customTooltip}>
        <p>{`${xAxisLabel}: ${displayLabel}`}</p>
        <p>{`${yAxisLabel}: ${formatValue(payload[0].value)}${valueUnit ? ` ${valueUnit}` : ''}`}</p>
      </div>
    );
  }
  return null;
};

/** Tooltip for pie charts */
const CustomPieTooltip = ({ active, payload }) => {
 if (active && payload && payload.length) {
   return (
     <div className={styles.customTooltip}>
       <p className={styles.tooltipLabel}>{payload[0].name}</p>
       <p className={styles.tooltipValue}>
         {`${formatValue(payload[0].value)}${payload[0].payload.unit ? ` ${payload[0].payload.unit}` : ''}`}
       </p>
     </div>
   );
 }
 return null;
};

// Tooltip for line charts - UPDATED to not try formatting all values as dates
const LineTooltip = ({ active, payload, x_label, y_label, x_unit, y_unit }) => {
 if (active && payload && payload.length) {
   // No longer trying to automatically convert to date
   return (
     <div className={styles.customTooltip}>
       <p>{`${x_label}: ${payload[0].payload.x}${x_unit ? ` ${x_unit}` : ''}`}</p>
       <p>{`${y_label}: ${formatValue(payload[0].payload.y)}${y_unit ? ` ${y_unit}` : ''}`}</p>
     </div>
   );
 }
 return null;
};

// UPDATED: Custom tooltip for multiline charts using actual axis label and value_unit
const MultilineTooltip = ({ active, payload, label, x_label, value_unit }) => {
  if (active && payload && payload.length) {
    // Get the full date from the chart data using the category field
    let displayDate = label;
    if (payload[0] && payload[0].payload && payload[0].payload.category) {
      displayDate = payload[0].payload.category;
    }
    
    // Use the x_label from props or default to "Date"
    const xAxisLabel = x_label || "Date";
    
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{`${xAxisLabel}: ${displayDate}`}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${formatValue(entry.value)}${value_unit || ''}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ADDED: Component to display metric description
const MetricDescription = ({ description, status }) => {
  // Only render if we have a description and the status is active or completed
  if (!description || (status !== 'active' && status !== 'completed')) {
    return null;
  }

  return (
    <div className={`${styles.metricDescription} ${status === 'active' ? styles.activeDescription : styles.completedDescription}`}>
      <p>{description}</p>
    </div>
  );
};

// Helper function to calculate domain
const calculateDomain = (data, key) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [0, 0];
  const values = data.map(d => parseFloat(d[key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1;
  return [min - padding, max + padding];
};

// Helper function for visible indices
const getVisibleIndices = (data, zoomState, isZoomed) => {
  // If not zoomed, all data is visible
  if (!isZoomed || typeof zoomState.left === 'string' || typeof zoomState.right === 'string') {
    return { startIdx: 0, endIdx: data.length - 1 };
  }
  
  // Otherwise use zoom boundaries
  return {
    startIdx: Math.max(0, Math.floor(zoomState.left)),
    endIdx: Math.min(data.length - 1, Math.ceil(zoomState.right))
  };
};

// Helper function to calculate tick count
const calculateTickCount = (data, zoomState, isZoomed) => {
  if (!isZoomed || typeof zoomState.left === 'string' || typeof zoomState.right === 'string') {
    return Math.min(10, data.length);
  }
  
  const { startIdx, endIdx } = getVisibleIndices(data, zoomState, isZoomed);
  const visiblePoints = endIdx - startIdx + 1;
  
  // Calculate a sensible number of ticks: roughly 1 tick per 3-5 data points, but at least 2
  return Math.max(2, Math.min(Math.floor(visiblePoints / 3), 10));
};

// REMOVED: Helper function for date formatting with validation is no longer needed
// We will use original data values without date conversion

// Single chart component that handles its own state and effects
const ChartContainer = ({ graph, index }) => {
  const { metric_type, title, columns, values, categories, series, x_unit, y_unit, value_unit, description, status } = graph;
  const chartContainerRef = useRef(null);
  const x_label = columns?.[0] || 'X';
  const y_label = columns?.[1] || 'Y';

  // State hooks at the top level
  const [zoomState, setZoomState] = useState({
    left: 'dataMin',
    right: 'dataMax',
    refAreaLeft: '',
    refAreaRight: '',
    top: 'dataMax+10%',
    bottom: 'dataMin-10%',
    animation: true,
  });
  const [isZoomed, setIsZoomed] = useState(false);
  
  // UPDATED: Removed zoomMode state as we'll support both methods simultaneously
  const [chartData, setChartData] = useState([]);

  // NEW: State to track visible series for multiline charts
  const [visibleSeries, setVisibleSeries] = useState({});

  // Process data based on chart type - runs once when component mounts
  useEffect(() => {
    let processedData = [];
    
    if (metric_type === 'line') {
      if (typeof values[0] === 'number') {
        processedData = values.map((value, index) => ({
          x: index.toString(),
          y: value,
          originalIndex: index
        }));
      } else if (Array.isArray(values[0])) {
        processedData = values.map(([xVal, yVal], index) => ({
          x: xVal,
          y: parseFloat(yVal),
          originalIndex: index
        }));
      }
    }
// In the useEffect for chartData preparation
else if (metric_type === 'bar' || metric_type === 'hist') {
  if (typeof values[0] === 'number') {
    // UPDATED: Use categories array if available, otherwise use index
    processedData = values.map((value, index) => ({
      name: categories && categories[index] ? categories[index] : index.toString(),
      value: value,
      originalIndex: index
    }));
  } else if (Array.isArray(values[0])) {
    processedData = values.map(([cat, val], index) => ({
      name: cat,
      value: parseFloat(val),
      originalIndex: index
    }));
  }
}
     else if (metric_type === 'pie') {
      if (typeof values[0] === 'number') {
        processedData = values.map((value, index) => ({
          name: `Region ${index + 1}`,
          value: value,
          unit: value_unit
        })).filter(item => item.value > 0);
        
        // Limit to top values for readability
        if (processedData.length > 10) {
          processedData = processedData.sort((a, b) => b.value - a.value).slice(0, 10);
        }
      } else if (Array.isArray(values[0])) {
        processedData = values.map(([cat, val]) => ({
          name: cat,
          value: parseFloat(val),
          unit: value_unit
        }));
      }
    } else if (metric_type === 'multiline') {
      processedData = categories.map((category, index) => {
        const point = { category, originalIndex: index };
        if (series && Array.isArray(series)) {
          series.forEach(s => {
            if (s && s.values && Array.isArray(s.values)) {
              point[s.name] = s.values[index];
            }
          });
        }
        return point;
      });

      // NEW: Initialize all series as visible
      if (series && Array.isArray(series)) {
        const initialVisibility = {};
        series.forEach(s => {
          initialVisibility[s.name] = true;
        });
        setVisibleSeries(initialVisibility);
      }
    }
    
    setChartData(processedData);
  }, [metric_type, values, categories, series, value_unit]);

  // Zoom functions
  const zoom = (dataKey, yDataKey) => {
    if (zoomState.refAreaLeft === zoomState.refAreaRight || zoomState.refAreaRight === '') {
      setZoomState((prevState) => ({
        ...prevState,
        refAreaLeft: '',
        refAreaRight: '',
      }));
      return;
    }

    // xAxis domain
    let left = Math.min(zoomState.refAreaLeft, zoomState.refAreaRight);
    let right = Math.max(zoomState.refAreaLeft, zoomState.refAreaRight);

    // yAxis domain
    let filteredData = [];
    if (typeof left === 'number' && typeof right === 'number') {
      filteredData = chartData.filter((_, idx) => idx >= left && idx <= right);
    }
    
    const newYDomain = calculateDomain(filteredData, yDataKey);

    setZoomState({
      ...zoomState,
      refAreaLeft: '',
      refAreaRight: '',
      left: left,
      right: right,
      bottom: newYDomain[0],
      top: newYDomain[1],
    });
    
    setIsZoomed(true);
  };

  // Reset zoom function
  const zoomOut = () => {
    setZoomState({
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      top: 'dataMax+10%',
      bottom: 'dataMin-10%',
      animation: true,
    });
    setIsZoomed(false);
  };

  // UPDATED: Mouse handlers for drag zooming - always enabled
  const onMouseDown = (e) => {
    if (!e) return;
    setZoomState((prevState) => ({
      ...prevState,
      refAreaLeft: e.activeTooltipIndex,
    }));
  };

  const onMouseMove = (e) => {
    if (!e) return;
    if (zoomState.refAreaLeft !== '') {
      setZoomState((prevState) => ({
        ...prevState,
        refAreaRight: e.activeTooltipIndex,
      }));
    }
  };

  // UPDATED: Removed toggleZoomMode function as we no longer need it

  // UPDATED: Handle mouse wheel zoom - always enabled
  const handleWheel = (e) => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) return;
    
    e.preventDefault();
    
    // Get mouse position relative to container
    const containerRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    
    // Convert mouse position to a percentage of the chart width
    const mouseXPercent = mouseX / containerWidth;
    
    // Get current visible data range
    const { startIdx, endIdx } = getVisibleIndices(chartData, zoomState, isZoomed);
    const visibleRange = endIdx - startIdx;
    
    // Calculate zoom factor based on wheel delta
    // Negative delta = zoom in, Positive delta = zoom out
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    // Calculate new range, ensuring a minimum range of 2 points
    let newRange = Math.max(2, visibleRange * zoomFactor);
    
    // Calculate new start and end points, keeping the mouse position as the focal point
    let newStart = startIdx + (mouseXPercent * visibleRange) - (mouseXPercent * newRange);
    let newEnd = newStart + newRange;
    
    // Ensure the new range doesn't go out of bounds
    if (newStart < 0) {
      newStart = 0;
      newEnd = Math.min(chartData.length - 1, newStart + newRange);
    }
    
    if (newEnd > chartData.length - 1) {
      newEnd = chartData.length - 1;
      newStart = Math.max(0, newEnd - newRange);
    }
    
    // Calculate new Y domain based on the visible data
    const visibleData = chartData.filter(
      (_, idx) => idx >= newStart && idx <= newEnd
    );
    
    // Choose correct Y field based on chart type
    let yField = 'y';
    if (metric_type === 'bar' || metric_type === 'hist') {
      yField = 'value';
    }
    
    const newYDomain = calculateDomain(visibleData, yField);
    
    // Update zoom state
    setZoomState({
      ...zoomState,
      left: newStart,
      right: newEnd,
      bottom: newYDomain[0],
      top: newYDomain[1],
    });
    
    setIsZoomed(true);
  };

  // UPDATED: Effect to add wheel event listener - always active
  useEffect(() => {
    const currentContainer = chartContainerRef.current;
    
    if (!currentContainer || metric_type === 'pie') {
      return;
    }
    
    currentContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      currentContainer.removeEventListener('wheel', handleWheel);
    };
  }, [zoomState, isZoomed, metric_type, chartData]);

  // Determine Y domain based on chart type
  const getYDomain = () => {
    if (metric_type === 'line') {
      return calculateDomain(chartData, 'y');
    } else if (metric_type === 'bar' || metric_type === 'hist') {
      return calculateDomain(chartData, 'value');
    } else if (metric_type === 'multiline') {
      let min = Infinity;
      let max = -Infinity;
      
      if (series && Array.isArray(series)) {
        series.forEach(s => {
          // NEW: Only include visible series in domain calculation
          if (visibleSeries[s.name] && s && s.values && Array.isArray(s.values)) {
            const seriesMin = Math.min(...s.values);
            const seriesMax = Math.max(...s.values);
            min = Math.min(min, seriesMin);
            max = Math.max(max, seriesMax);
          }
        });
      }
      
      const padding = (max - min) * 0.1;
      return [min - padding, max + padding];
    }
    
    return [0, 0];
  };

  // NEW: Handler for legend click to toggle series visibility
  const handleLegendClick = (o) => {
    const { dataKey } = o;
    setVisibleSeries(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  // Chart rendering based on type
  const renderChart = () => {
    // Skip if no data
    if (!chartData || chartData.length === 0) return null;
    
    // Determine domains based on zoom state
    const yDomain = getYDomain();
    const xDomain = isZoomed ? [zoomState.left, zoomState.right] : ['dataMin', 'dataMax'];
    const yDomainFinal = isZoomed ? [zoomState.bottom, zoomState.top] : yDomain;
    
    // Calculate appropriate tick count
    const tickCount = calculateTickCount(chartData, zoomState, isZoomed);

    try {
      switch (metric_type) {
        case 'pie': {
          return (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          );
        }

        case 'line': {
          return (
            <div className={styles.chartWrapper} ref={chartContainerRef}>
              {/* UPDATED: Removed zoom mode toggle button, keeping only reset zoom button */}
              <div className={styles.zoomControls}>
                <button 
                  onClick={zoomOut} 
                  disabled={!isZoomed}
                  title="Reset zoom"
                  className={`${styles.zoomButton} ${!isZoomed ? styles.disabled : ''}`}
                >
                  <RotateCcw size={16} />
                  <span>Reset Zoom</span>
                </button>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={() => zoom('originalIndex', 'y')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="originalIndex"
                    type="number"
                    domain={xDomain}
                    allowDataOverflow
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    tickCount={tickCount}
                    tickFormatter={(index) => {
                      // UPDATED: No longer trying to format as date
                      if (index < 0 || index >= chartData.length) return '';
                      const item = chartData[Math.floor(index)];
                      return item ? item.x : '';
                    }}
                    label={{
                      value: x_label,
                      position: 'bottom',
                      fill: 'rgba(255,255,255,0.6)',
                      fontSize: 12
                    }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    label={{
                      value: y_label,
                      angle: -90,
                      position: 'left',
                      fill: 'rgba(255,255,255,0.6)',
                      fontSize: 12
                    }}
                   domain={[0, yDomainFinal[1]]}
                    allowDataOverflow
                    scale="linear"
                  />
                  <Tooltip
                    content={(props) => (
                      <LineTooltip
                        {...props}
                        x_label={x_label}
                        y_label={y_label}
                        x_unit={x_unit}
                        y_unit={y_unit}
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#82FF83"
                    strokeWidth={2}
                    dot={{ fill: '#82FF83', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                  
                  {/* Highlight zoom area */}
                  {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                    <ReferenceArea 
                      x1={zoomState.refAreaLeft} 
                      x2={zoomState.refAreaRight} 
                      strokeOpacity={0.3}
                      fill="rgba(255, 255, 255, 0.2)" 
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
              
              {/* UPDATED: Changed zoom instructions to indicate both methods are available */}
              {!isZoomed && (
                <div className={styles.zoomInstructions}>
                  Use mouse wheel to zoom in/out or click and drag to select an area
                </div>
              )}
            </div>
          );
        }

        case 'bar':
        case 'hist': {
          return (
            <div className={styles.chartWrapper} ref={chartContainerRef}>
              {/* UPDATED: Removed zoom mode toggle button, keeping only reset zoom button */}
              <div className={styles.zoomControls}>
                <button 
                  onClick={zoomOut} 
                  disabled={!isZoomed}
                  title="Reset zoom"
                  className={`${styles.zoomButton} ${!isZoomed ? styles.disabled : ''}`}
                >
                  <RotateCcw size={16} />
                  <span>Reset Zoom</span>
                </button>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={() => zoom('originalIndex', 'value')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis
                    dataKey="originalIndex"
                    type="number"
                    domain={xDomain}
                    allowDataOverflow
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    tickCount={tickCount}
                    tickFormatter={(index) => {
  // UPDATED: No longer trying to format as date
  if (index < 0 || index >= chartData.length) return '';
  const item = chartData[Math.floor(index)];
  // Truncate long category names to prevent overlap
  if (item && item.name) {
    return item.name.length > 12 ? item.name.substring(0, 10) + '...' : item.name;
  }
  return '';
}}
                    label={{
                      value: x_label,
                      position: 'bottom',
                      fill: 'rgba(255,255,255,0.6)',
                      fontSize: 12
                    }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    label={{
                      value: y_label,
                      angle: -90,
                      position: 'left',
                      fill: 'rgba(255,255,255,0.6)',
                      fontSize: 12
                    }}
                   domain={[0, yDomainFinal[1]]}
                    allowDataOverflow
                    scale="linear"
                  />
                 <Tooltip
  content={(props) => (
    <CustomTooltip {...props} valueUnit={value_unit} y_label={y_label} x_label={x_label} />
  )}
/>       
                  <Bar 
                    dataKey="value" 
                    fill="#82FF83" 
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  
                  {/* Highlight zoom area */}
                  {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                    <ReferenceArea 
                      x1={zoomState.refAreaLeft} 
                      x2={zoomState.refAreaRight} 
                      strokeOpacity={0.3}
                      fill="rgba(255, 255, 255, 0.2)" 
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
              
              {/* UPDATED: Changed zoom instructions to indicate both methods are available */}
              {!isZoomed && (
                <div className={styles.zoomInstructions}>
                  Use mouse wheel to zoom in/out or click and drag to select an area
                </div>
              )}
            </div>
          );
        }

        case 'multiline': {
          return (
            <div className={styles.chartWrapper} ref={chartContainerRef}>
              {/* UPDATED: Removed zoom mode toggle button, keeping only reset zoom button */}
              <div className={styles.zoomControls}>
                <button 
                  onClick={zoomOut} 
                  disabled={!isZoomed}
                  title="Reset zoom"
                  className={`${styles.zoomButton} ${!isZoomed ? styles.disabled : ''}`}
                >
                  <RotateCcw size={16} />
                  <span>Reset Zoom</span>
                </button>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart 
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={() => zoom('originalIndex', 'y')}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="originalIndex"
                    type="number"
                    domain={xDomain}
                    allowDataOverflow
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    tickCount={tickCount}
                    tickFormatter={(index) => {
                      // UPDATED: No longer trying to format as date
                      if (index < 0 || index >= chartData.length) return '';
                      const item = chartData[Math.floor(index)];
                      return item ? item.category : '';
                    }}
                    label={{
                      value: graph.x_label || '',
                      position: 'bottom',
                      fill: 'rgba(255,255,255,0.6)',
                      fontSize: 12
                    }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.6)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    label={{
                      value: graph.y_label || '',
                      angle: -90,
                      position: 'left',
                      fill: 'rgba(255,255,255,0.6)',
                      fontSize: 12
                    }}
                   domain={[0, yDomainFinal[1]]}
                    allowDataOverflow
                    scale="linear"
                  />
<Tooltip content={(props) => (
  <MultilineTooltip 
    {...props} 
    x_label={graph.x_label || "Cohort Date"} 
    value_unit={value_unit}
  />
)} />                  {/* FIXED: Added onClick handler for the Legend component */}
                  <Legend onClick={handleLegendClick} />
                  {series && Array.isArray(series) && series.map((s, i) => (
                    // FIXED: Always render all lines but use CSS class to control visibility
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: COLORS[i % COLORS.length], strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      // Apply inactive class to style inactive lines with CSS
                      className={!visibleSeries[s.name] ? styles.inactiveLine : ''}
                    />
                  ))}
                  
                  {/* Highlight zoom area */}
                  {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                    <ReferenceArea 
                      x1={zoomState.refAreaLeft} 
                      x2={zoomState.refAreaRight} 
                      strokeOpacity={0.3}
                      fill="rgba(255, 255, 255, 0.2)" 
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
              
              {/* UPDATED: Changed zoom instructions to indicate both methods are available */}
              {!isZoomed && (
                <div className={styles.zoomInstructions}>
                  Use mouse wheel to zoom in/out or click and drag to select an area
                </div>
              )}
              
              {/* FIXED: Better legend instruction */}
              <div className={styles.legendInstructions}>
                Click on legend items to toggle visibility
              </div>
            </div>
          );
        }
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error rendering chart ${title}:`, error);
      return null;
    }
  };

  return (
    <div key={`${graph.metric_id || index}-${index}`} className={styles.section}>
      <div className={styles.glassEffect}>
        <h3 className={styles.chartTitle}>{graph.title || 'Untitled Chart'}</h3>
        
        {/* Display metric description if active or completed */}
        {graph.status === 'active' || graph.status === 'completed' ? (
          <div className={`${styles.metricDescription} ${graph.status === 'active' ? styles.activeDescription : styles.completedDescription}`}>
            <p>{graph.description}</p>
          </div>
        ) : null}
        
        {renderChart()}
      </div>
    </div>
  );
};

const GraphDisplay = ({ graphs }) => {
 if (!graphs || graphs.length === 0) return null;

 return (  <div className={styles.analyticsContainer}>
    {graphs.map((graph, index) => {
      // Skip any invalid graph objects
      if (!graph || typeof graph !== 'object') return null;
      
      // Using the standalone ChartContainer component for each graph
      return <ChartContainer key={index} graph={graph} index={index} />;
    })}
  </div>
 );
};

export default GraphDisplay;