"use client";
import React, { useState, useRef, useEffect } from "react";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import styles from "../../styles/CustomAnalysis.module.css";
import { FiPlus } from "react-icons/fi";

// Modal component with 3 steps
function Modal({ open, isClosing, onClose, modalStep, userInput, setUserInput, onSubmit, clarificationMessage, isSubmitting }) {
  if (!open && !isClosing) return null;

  // Close modal on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() && !isSubmitting) {
      onSubmit(userInput.trim());
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  // Handle keypress for Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit(e);
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
        {/* Step 1: Initial Question */}
        {modalStep === 1 && (
          <>
            <h2 className={styles.modalTitle}>What do you want to know about your users?</h2>
            <div className={styles.modalSubtext}>
              Ask a question or describe the analysis you want to run. Example: "Show me the top 5 user segments by revenue."
            </div>
            <form onSubmit={handleSubmit}>
              <input 
                className={styles.modalInput} 
                placeholder="Type your question..." 
                value={userInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                autoFocus
                disabled={isSubmitting}
              />
              <button 
                type="submit" 
                className={styles.modalSubmitBtn}
                disabled={isSubmitting || !userInput.trim()}
              >
                {isSubmitting ? (
                  <div className={styles.buttonSpinner}></div>
                ) : (
                  <span style={{fontSize: 22}}>&gt;</span>
                )}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Clarification Needed */}
        {modalStep === 2 && (
          <>
            <h2 className={styles.modalTitle}>Please provide more details</h2>
            <div className={styles.modalSubtext}>
              {clarificationMessage}
            </div>
            <form onSubmit={handleSubmit}>
              <input 
                className={styles.modalInput} 
                placeholder="Type your clarification..." 
                value={userInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                autoFocus
                disabled={isSubmitting}
              />
              <button 
                type="submit" 
                className={styles.modalSubmitBtn}
                disabled={isSubmitting || !userInput.trim()}
              >
                {isSubmitting ? (
                  <div className={styles.buttonSpinner}></div>
                ) : (
                  <span style={{fontSize: 22}}>&gt;</span>
                )}
              </button>
            </form>
          </>
        )}

        {/* Step 3: Processing */}
        {modalStep === 3 && (
          <>
            <h2 className={styles.modalTitle}>Processing your request</h2>
            <div className={styles.modalSubtext}>
              Please wait while we analyze your data...
            </div>
            <div className={styles.processingIndicator}>
              <div className={styles.processingSpinner}></div>
              <div className={styles.processingText}>Status: Processing</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomAnalysis() {
  // Modal state management
  const [modalOpen, setModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const closeTimerRef = useRef(null);

  // Form and API state
  const [userInput, setUserInput] = useState("");
  const [requestId, setRequestId] = useState(null);
  const [clarificationMessage, setClarificationMessage] = useState("");
  const [cards, setCards] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API base URLs
  const QUESTION_API_URL = "https://question-nt4chwvamq-uc.a.run.app";
  const CLARIFICATION_API_URL = "https://clarification-nt4chwvamq-uc.a.run.app";

  // Load cards from localStorage on component mount
  useEffect(() => {
    const savedCards = localStorage.getItem('customAnalysisCards');
    if (savedCards) {
      try {
        const parsedCards = JSON.parse(savedCards);
        setCards(parsedCards);
        console.log('📂 Loaded cards from localStorage:', parsedCards);
      } catch (error) {
        console.error('❌ Error parsing saved cards:', error);
        localStorage.removeItem('customAnalysisCards');
      }
    }
  }, []);

  // Save cards to localStorage whenever cards state changes
  useEffect(() => {
    if (cards.length > 0) {
      localStorage.setItem('customAnalysisCards', JSON.stringify(cards));
      console.log('💾 Saved cards to localStorage');
    }
  }, [cards]);

  // Call Question API
  const callQuestionAPI = async (question) => {
    console.log("🚀 Calling Question API with:", question);
    
    try {
      const response = await fetch(QUESTION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: "test",
          game_id: "blockheads",
          question: question
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Question API Response:", data);
      return data;
    } catch (error) {
      console.error("❌ Question API Error:", error);
      throw error;
    }
  };

  // Call Clarification API
  const callClarificationAPI = async (reqId, clarificationText) => {
    console.log("🚀 Calling Clarification API with:", { reqId, clarificationText });
    
    try {
      const response = await fetch(CLARIFICATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: reqId,
          clarification_text: clarificationText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Clarification API Response:", data);
      return data;
    } catch (error) {
      console.error("❌ Clarification API Error:", error);
      throw error;
    }
  };

  // Generate clarification message based on API response
  const generateClarificationMessage = (hasTimeframe, hasUserSegment) => {
    if (!hasTimeframe && !hasUserSegment) {
      return "Please mention both the time frame and user segment for your analysis.";
    } else if (!hasTimeframe) {
      return "Please mention the time frame for your analysis.";
    } else if (!hasUserSegment) {
      return "Please mention the user segment for your analysis.";
    }
    return "";
  };

  // Add new card to the list
  const addNewCard = (title, requestId) => {
    const newCard = {
      id: Date.now(), // Simple ID for key
      title: title.length > 50 ? title.substring(0, 50) + "..." : title,
      status: "Processing",
      requestId: requestId,
      createdAt: new Date().toISOString()
    };
    
    setCards(prevCards => [...prevCards, newCard]);
    console.log("📝 Added new card:", newCard);
  };

  // Handle form submission based on current step
  const handleModalSubmit = async (inputText) => {
    setIsSubmitting(true);
    console.log(`📝 Step ${modalStep} - User Input:`, inputText);

    try {
      if (modalStep === 1) {
        // Step 1: Initial question
        const response = await callQuestionAPI(inputText);
        
        // Store request ID for later use
        setRequestId(response.request_id);
        
        // Check if clarification is needed
        const needsTimeframe = response.clarification_needed?.has_timeframe === false;
        const needsUserSegment = response.clarification_needed?.has_user_segment === false;
        
        console.log("🔍 Clarification Check:", {
          hasTimeframe: response.clarification_needed?.has_timeframe,
          hasUserSegment: response.clarification_needed?.has_user_segment,
          needsTimeframe,
          needsUserSegment
        });

        if (needsTimeframe || needsUserSegment) {
          // Need clarification - go to step 2
          const message = generateClarificationMessage(
            response.clarification_needed?.has_timeframe,
            response.clarification_needed?.has_user_segment
          );
          setClarificationMessage(message);
          setUserInput(""); // Clear input for next step
          setModalStep(2);
          console.log("➡️ Moving to Step 2 - Clarification needed");
        } else {
          // No clarification needed - go directly to step 3
          setModalStep(3);
          console.log("➡️ Moving to Step 3 - Processing");
          
          // Add new card to the list
          addNewCard(inputText, response.request_id);
          
          // Close modal after short delay
          setTimeout(() => {
            closeModal();
          }, 2000);
        }
        
      } else if (modalStep === 2) {
        // Step 2: Clarification
        await callClarificationAPI(requestId, inputText);
        
        // Move to step 3
        setModalStep(3);
        console.log("➡️ Moving to Step 3 - Processing after clarification");
        
        // Add new card to the list (use the original question for title)
        const originalQuestion = localStorage.getItem('tempOriginalQuestion') || inputText;
        addNewCard(originalQuestion, requestId);
        localStorage.removeItem('tempOriginalQuestion');
        
        // Close modal after short delay
        setTimeout(() => {
          closeModal();
        }, 2000);
      }
      
    } catch (error) {
      console.error("❌ Error in handleModalSubmit:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open modal
  const openModal = () => {
    console.log("🔵 Opening Modal");
    setModalOpen(true);
    setIsClosing(false);
    setModalStep(1);
    setUserInput("");
    setClarificationMessage("");
  };

  // Close modal with animation
  const closeModal = () => {
    console.log("🔴 Closing Modal");
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setModalOpen(false);
      setIsClosing(false);
      setModalStep(1);
      setUserInput("");
      setClarificationMessage("");
      setRequestId(null);
      setIsSubmitting(false);
    }, 200); // match animation duration
  };

  // Clear all cards (for testing/debugging)
  const clearAllCards = () => {
    setCards([]);
    localStorage.removeItem('customAnalysisCards');
    console.log("🗑️ Cleared all cards");
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
            {cards.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyContent}>
                  <h3 className={styles.emptyTitle}>No Analysis Yet</h3>
                  <p className={styles.emptyText}>
                    Click the + button to start your first custom analysis
                  </p>
                </div>
              </div>
            ) : (
              cards.map((card) => (
                <div key={card.id} className={styles.glassCard}>
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
              ))
            )}
          </div>

          {/* Modal */}
          <Modal 
            open={modalOpen} 
            isClosing={isClosing} 
            onClose={closeModal}
            modalStep={modalStep}
            userInput={userInput}
            setUserInput={setUserInput}
            onSubmit={handleModalSubmit}
            clarificationMessage={clarificationMessage}
            isSubmitting={isSubmitting}
          />
        </main>
      </div>
    </div>
  );
}