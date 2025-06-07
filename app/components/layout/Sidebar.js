"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import styles from "../../../styles/Sidebar.module.css";
import { useAuth } from "../../context/AuthContext";
import {MoreVertical, Pencil, Trash2 } from "lucide-react";

const Sidebar = ({
  chatThreads = [],
  selectedThreadId = null,
  handleSelectThread = () => {},
  handleNewChat = () => {},
  isLoading = false
}) => {
  
  // Initialize routing and authentication hooks
  const router = useRouter();
  const pathname = usePathname();
  const { userId } = useAuth();

  // Determine active page for menu item highlighting
  const isDashboardActive = pathname === "/dashboard";
  const isAnalyticsActive = pathname === "/analytics";

  // UPDATED: Mobile sidebar expansion state - controlled from parent component
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle navigation with authentication check
  const handleNavigation = (path) => {
    // Validate path input
    if (typeof path !== "string") {
      console.error("Invalid path:", path);
      return;
    }
    
    // Direct navigation without auth check
    router.push(path);
  };

  // UPDATED: Handle thread selection with auto-collapse on mobile
  const handleThreadSelect = (threadId) => {
    handleSelectThread(threadId);
    // Auto-collapse on mobile after selection
    if (window.innerWidth <= 768) {
      setIsExpanded(false);
    }
  };

 // UPDATED: Expose toggle function and state to parent via window object for hamburger button
React.useEffect(() => {
  if (pathname === "/ideationchat") {
    window.sidebarExpanded = isExpanded;
    window.toggleSidebar = () => {
      setIsExpanded(!isExpanded);
    };
    // Dispatch event to notify parent of state change
    window.dispatchEvent(new CustomEvent('sidebarToggled'));
  }
  return () => {
    if (window.toggleSidebar) {
      delete window.toggleSidebar;
    }
    if (window.sidebarExpanded !== undefined) {
      delete window.sidebarExpanded;
    }
  };
}, [isExpanded, pathname]);

  const [menuOpen, setMenuOpen] = useState(null); // Which thread's menu is open
  const [renamingId, setRenamingId] = useState(null); // Which thread is being renamed
  const [renameValue, setRenameValue] = useState(""); // Rename input value

  return (
    <>
      {/* Mobile overlay when expanded - moved outside sidebar */}
      {isExpanded && (
        <div 
          key="mobile-overlay"
          className={styles.mobileOverlay} 
          onClick={() => setIsExpanded(false)}
          onTouchStart={() => setIsExpanded(false)}
        />
      )}
      {/* UPDATED: Sidebar hidden by default on mobile for ideationchat, expanded when toggled */}
      <aside className={`${styles.sidebar} ${isExpanded ? styles.expanded : ''} ${pathname === "/ideationchat" ? styles.chatSidebar : ''}`}>
        <div className={styles.glassEffect}>
          {/* Show only chat section on ideationchat page, otherwise show menu items */}
          {pathname === "/ideationchat" ? (
            // Only show chat section
            <div className={styles.chatSection}>
             <div className={`${styles.chatHeader} ${isExpanded ? styles.expanded : ''}`}>
  {/* UPDATED: Added close button for mobile */}
{/* UPDATED: Removed close button - hamburger handles all open/close actions */}
<div className={styles.chatHeaderTop}>
  <div className={styles.chatLabel}>Chats</div>
</div>
  <button 
    className={styles.chatButton}
    onClick={handleNewChat}
    style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
    disabled={isLoading}
  >
    + New Chat
  </button>
</div>

              <div className={styles.threadList}>
                {chatThreads.length === 0 && (
                  <div className={styles.emptyThreads}>No chats yet</div>
                )}
                {[...chatThreads].reverse().map(thread => (
                  <div
                    key={thread.threadId}
                    className={`${styles.threadItem} ${
                      selectedThreadId === thread.threadId ? styles.selectedThread : ""
                    } ${isExpanded ? styles.expanded : ''}`}
                    onClick={() => !isLoading && handleThreadSelect(thread.threadId)}
                    style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    onMouseLeave={() => setMenuOpen(null)}
                  >
                    {renamingId === thread.threadId ? (
                      <input
                        className={styles.renameInput}
                        value={renameValue}
                        autoFocus
                        onChange={e => setRenameValue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={() => {
                          // Save rename
                          if (renameValue.trim() && typeof window !== 'undefined') {
                            const stored = JSON.parse(localStorage.getItem('chatThreads') || '[]');
                            const updated = stored.map(t => 
                              t.threadId === thread.threadId 
                                ? { ...t, name: renameValue.trim() }
                                : t
                            );
                            localStorage.setItem('chatThreads', JSON.stringify(updated));
                            setRenamingId(null);
                            setMenuOpen(null);
                            window.location.reload();
                          } else {
                            setRenamingId(null);
                            setMenuOpen(null);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.target.blur();
                          if (e.key === 'Escape') { setRenamingId(null); setMenuOpen(null); }
                        }}
                      />
                    ) : (
                      <span className={styles.threadText}>{thread.name || thread.threadId}</span>
                    )}
                    {/* UPDATED: 3-dot menu visibility based on expansion state */}
                    <div
                      className={`${styles.moreMenuWrapper} ${isExpanded ? styles.expanded : ''}`}
                      onClick={e => { 
                        if (!isLoading) {
                          e.stopPropagation(); 
                          setMenuOpen(menuOpen === thread.threadId ? null : thread.threadId);
                        }
                      }}
                      style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      <MoreVertical className={styles.moreMenuIcon} style={{ opacity: isLoading ? 0.5 : 1 }} />
                      {menuOpen === thread.threadId && !isLoading && (
                        <div className={styles.threadMenu} onClick={e => e.stopPropagation()}>
                          <button
                            className={styles.menuItemBtn}
                            onClick={() => {
                              setRenamingId(thread.threadId);
                              setRenameValue(thread.name || thread.threadId);
                              setMenuOpen(null);
                            }}
                          >
                            <Pencil size={15} className={styles.menuIcon} /> Rename
                          </button>
                          <button
                            className={styles.menuItemBtn + ' ' + styles.deleteMenuBtn}
                            onClick={() => {
                              if (window.confirm("Delete this conversation?")) {
                                if (typeof window !== 'undefined') {
                                  const stored = JSON.parse(localStorage.getItem('chatThreads') || '[]');
                                  const updated = stored.filter(t => t.threadId !== thread.threadId);
                                  localStorage.setItem('chatThreads', JSON.stringify(updated));
                                  if (localStorage.getItem('threadId') === thread.threadId) {
                                    localStorage.removeItem('threadId');
                                  }
                                  localStorage.removeItem(`chatHistory_${thread.threadId}`);
                                  setMenuOpen(null);
                                  window.location.reload();
                                }
                              }
                            }}
                          >
                            <Trash2 size={15} className={styles.menuIcon + ' ' + styles.binIcon} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Liveops/Dashboard Menu Item */}
              <div className={styles.menuItem}>
                <div
                  className={`${styles.menuLink} ${isDashboardActive ? styles.active : ""}`}
                  onClick={() => handleNavigation("/dashboard")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleNavigation("/dashboard")}
                >
                  <div className={styles.menuIcon}>
                    <Image
                      src="/dashboard_icon.svg"
                      alt="Dashboard"
                      width={30}
                      height={30}
                      className={`${styles.icon} ${isDashboardActive ? styles.activeIcon : ""}`}
                      priority
                    />
                  </div>
                  <span className={styles.menuText}>Liveops</span>
                </div>
              </div>
              
              {/* User Analytics Menu Item */}
              {/*
              <div className={styles.menuItem}>
                <div
                  className={`${styles.menuLink} ${isAnalyticsActive ? styles.active : ""}`}
                  onClick={() => handleNavigation("/analytics")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleNavigation("/analytics")}
                >
                  <div className={styles.menuIcon}>
                    <Image
                      src="/user-analytics.svg"
                      alt="User Analytics"
                      width={30}
                      height={30}
                      className={`${styles.icon} ${isAnalyticsActive ? styles.activeIcon : ""}`}
                      priority
                    />
                  </div>
                  <span className={styles.menuText}>User Analytics</span>
                </div>
              </div>
              */}
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;