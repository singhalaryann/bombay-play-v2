// // MetricCard.js
// import React from 'react';
// import styles from '../../../styles/MetricCard.module.css';
// import { TrendingUp, TrendingDown } from 'lucide-react';

// const MetricCard = ({ name, value, delta, description, unit }) => {
//   // Determine if trend is up based on delta value
//   const isPositive = parseFloat(delta) > 0;
  
//   // Format the delta value with sign
//   const formattedDelta = `${isPositive ? '+' : ''}${delta}%`;

//   return (
//     <div className={styles.card}>
//       <div className={styles.cardInner}>
//         <div className={styles.header}>
//           <h2 className={styles.title}>{name}</h2>
//           <div className={isPositive ? styles.trendIconUp : styles.trendIconDown}>
//             {isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
//           </div>
//         </div>
//         <div className={styles.mainContent}>
//         <div className={styles.valueSection}>
//     <div className={styles.valueWrapper}>
//         <span className={styles.value}>{value}</span>
//         <span className={styles.unit}>{unit}</span>
//     </div>
//     <span className={`${styles.delta} ${isPositive ? styles.positive : styles.negative}`}>
//         ({formattedDelta})
//     </span>
// </div>
//         </div>
//         <div className={styles.descriptionContainer}>
//           <p className={styles.description}>{description}</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MetricCard;

