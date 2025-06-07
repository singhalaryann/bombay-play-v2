"use client";
import React, { useState, useEffect } from "react"; // UPDATED: Added useState, useEffect for sidebar state tracking
import styles from "../../../styles/Header.module.css";
import Image from "next/image";
import { LogOut, User, MessageCircle, Menu, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

const Header = () => {
  const { userId, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false); // UPDATED: Track sidebar open/closed state

  // UPDATED: Listen for sidebar state changes to update hamburger direction
  useEffect(() => {
    const handleSidebarToggle = () => {
      setSidebarOpen(window.sidebarExpanded || false);
    };
    
    if (pathname === "/ideationchat") {
      window.addEventListener('sidebarToggled', handleSidebarToggle);
      return () => window.removeEventListener('sidebarToggled', handleSidebarToggle);
    }
  }, [pathname]);

  // COMMENTED: Logout functionality
  // const handleLogout = () => {
  // logout();
  // router.push("/ideationchat");
  // };

  // ADDED: AI Chat functionality - uncommented and working
  const handleAIChat = () => {
    router.push("/ideationchat");
  };

  // const handleKnowledgebase = () => {
  // // Add this new handler
  // router.push("/knowledgebase");
  // };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {/* Hamburger icon for mobile - only show on ideationchat page */}
        {pathname === "/ideationchat" && (
          <button
            className={styles.hamburgerHeaderBtn}
            onClick={() => {
              if (typeof window !== 'undefined' && window.toggleSidebar) {
                window.toggleSidebar();
              }
            }}
            aria-label="Toggle sidebar menu"
          >
            <div className={styles.iconWrapper}>
              <Menu size={20} className={styles.hamburgerIcon} />
              {/* UPDATED: Added conditional leftArrow class based on sidebar state */}
              <ChevronRight size={20} className={`${styles.arrowIcon} ${sidebarOpen ? styles.leftArrow : ''}`} />
            </div>
          </button>
        )}
        <div
          className={`${styles.logo} ${pathname !== "/dashboard" ? styles.logoGlow : ""}`} // UPDATED: Green glow when not on dashboard (same condition as tooltip)
          onClick={() => router.push("/dashboard")}
          style={{ cursor: "pointer", position: "relative" }}
        >
          <Image
            src="/logo-XG.svg"
            alt="XG Gaming"
            width={120}
            height={36}
            className={styles.logoImage}
          />
          {pathname !== "/dashboard" && (
            <span className={styles.logoTooltip}>Route to dashboard</span>
          )}
        </div>
      </div>
      <div className={styles.rightSection}>
        {/* ADDED: AI Chat button - now active and visible */}
        <button
          onClick={handleAIChat}
          className={`${styles.aiChatButton} ${pathname === "/ideationchat" ? styles.active : ""}`}
        >
          <MessageCircle size={20} className={styles.chatIcon} />
          <span>AI Chat</span>
        </button>
        {/* REMOVED: Knowledgebase button - kept commented */}
        {/* <button
          onClick={handleKnowledgebase}
          className={styles.knowledgebaseButton}
        >
          <Image
            src="/kb_icon.svg"
            alt="Knowledgebase"
            width={20}
            height={20}
            className={styles.kbIcon}
          />
          <span>Knowledgebase</span>
        </button> */}
        {/* User block with hardcoded ID */}
        <div className={styles.userBlock}>
          <Image
            src="/user_icon.svg"
            alt="User"
            width={24}
            height={24}
            className={styles.userIcon}
          />
          <span className={styles.userId}>a724a284-dd80-4ff2-8d0a-b36bff0fa426</span>
          {/* COMMENTED: Logout button */}
          {/* {userId && (
            <button onClick={handleLogout} className={styles.logoutButton}>
              <LogOut size={20} />
            </button>
          )} */}
        </div>
      </div>
    </header>
  );
};

export default Header;