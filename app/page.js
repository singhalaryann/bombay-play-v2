// 'use client';
// import React, { useState, useEffect } from 'react';
// import styles from '../styles/page.module.css';
// import { useRouter } from 'next/navigation';
// import { useAuth } from './context/AuthContext';

// export default function Home() {
//   const router = useRouter();
//   const { login } = useAuth();
//   const [userId, setUserId] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [mounted, setMounted] = useState(false);
  
//   // Redirect to IdeationChat immediately on page load
//   useEffect(() => {
//     setMounted(true);
//     router.push('/ideationchat');
//   }, [router]);
  
//   // CHANGED: Modified to not redirect to dashboard after login
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);
    
//     try {
//       const response = await fetch('https://check-user-q54hzgyghq-uc.a.run.app', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           user_id: userId.trim()
//         })
//       });
      
//       const data = await response.json();
//       console.log('API Response:', data);
      
//       if (data.user_exists) {
//         console.log('User validated successfully');
//         login(userId.trim());
//         // REMOVED: No longer redirect to dashboard after login
//         // Stay on current page (should be ideationchat at this point)
//       } else {
//         setError('Invalid user ID. Please try again.');
//         console.log('User validation failed');
//       }
//     } catch (error) {
//       console.error('API Error:', error);
//       setError('An error occurred. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   // This will only be shown if redirect fails
//   return (
//     <div className={styles.container}>
//       <div className={`${styles.content} ${mounted ? styles.mounted : ''}`}>
//         <div className={styles.glassEffect}>
//           <div className={styles.title}>
//             Welcome to <span className={styles.highlight}>XG</span>
//           </div>
//           <p className={styles.subtitle}>Enter your user ID to continue</p>
//           <form onSubmit={handleSubmit} className={styles.form}>
//             <input
//               type="text"
//               value={userId}
//               onChange={(e) => setUserId(e.target.value)}
//               placeholder="Enter your ID"
//               className={styles.input}
//               disabled={loading}
//               autoFocus
//             />
//             <button
//               type="submit"
//               className={styles.button}
//               disabled={loading || !userId.trim()}
//             >
//               {loading ? 'Validating...' : 'Enter'}
//             </button>
//           </form>
//           {error && <p className={styles.error}>{error}</p>}
//         </div>
//       </div>
//     </div>
//   );
// }