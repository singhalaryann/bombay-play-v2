"use client";
import React, { useState, useRef } from "react";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import styles from "../../styles/CustomAnalysis.module.css";
import { FiPlus } from "react-icons/fi";

// Modal component with fade/slide classes (INSIGHT-STYLE)
function Modal({ open, isClosing, onClose }) {
  if (!open && !isClosing) return null;
  // Close modal on backdrop click, not on modal content click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  return (
    <div
      className={
        styles.modalBackdrop +
        " " +
        (isClosing ? styles.fadeOut : styles.fadeIn)
      }
      onClick={handleBackdropClick}
    >
      <div
        className={
          styles.modalContent +
          " " +
          (isClosing ? styles.slideOut : styles.slideIn)
        }
      >
        <h2 className={styles.modalTitle}>What do you want to know about your users?</h2>
        <div className={styles.modalSubtext}>Ask a question or describe the analysis you want to run. Example: "Show me the top 5 user segments by revenue."</div>
        <input className={styles.modalInput} placeholder="Type your question..." />
        <button className={styles.modalSubmitBtn}>
          <span style={{fontSize: 22}}>&gt;</span>
        </button>
      </div>
    </div>
  );
}

export default function CustomAnalysis() {
  // Modal open/close animation state (INSIGHT-STYLE)
  const [modalOpen, setModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);

  // Dummy data for cards (2 only, simple)
  const cards = [
    { title: "User Growth Overview", status: "Processing", color: "#82FF83" },
    { title: "Revenue Trends", status: "Completed", color: "#FFE082" },
  ];

  // Open modal (INSIGHT-STYLE)
  const openModal = () => {
    setModalOpen(true);
    setIsClosing(false);
  };

  // Close modal with animation (INSIGHT-STYLE)
  const closeModal = () => {
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setModalOpen(false);
      setIsClosing(false);
    }, 200); // match animation duration
  };

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.mainLayout}>
        <Sidebar />
        <main className={styles.mainContent}>
          {/* Top bar with + button */}
          <div className={styles.topBar}>
            <button className={styles.addBtn} onClick={openModal}>
              <FiPlus size={22} />
            </button>
          </div>
          {/* Cards grid */}
          <div className={styles.cardsGrid}>
            {cards.map((card, idx) => (
              <div key={idx} className={styles.simpleCard}>
                <div className={styles.cardTitle}>{card.title}</div>
                <div className={styles.cardTagWrapper}>
                  <span
                    className={
                      card.status === "Processing"
                        ? styles.processingTag
                        : styles.completedTag
                    }
                  >
                    {card.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Modal */}
          <Modal open={modalOpen} isClosing={isClosing} onClose={closeModal} />
        </main>
      </div>
    </div>
  );
}