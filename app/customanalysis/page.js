"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Header from "../components/layout/Header";
// import Sidebar from "../components/layout/Sidebar";
import styles from "../../styles/CustomAnalysis.module.css";
import { FiPlus } from "react-icons/fi";

// Modal component with 4 steps
function Modal({ 
  open, 
  isClosing, 
  onClose, 
  modalStep, 
  userInput, 
  setUserInput, 
  onSubmit, 
  clarificationMessage, 
  isSubmitting,
  analysisDetails,
  requestCount,
  onStartAnalysis
}) {
  if (!open && !isClosing) return null;

  // Close modal on backdrop click (disabled during processing)
const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget && !isSubmitting) {
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

  // Handle start analysis button
  const handleStartAnalysis = () => {
    if (!isSubmitting) {
      onStartAnalysis();
    }
  };

  return (
    <div
    className={
      styles.modalBackdrop +
      " " +
      (isClosing ? styles.fadeOut : styles.fadeIn) +
      (isSubmitting ? ` ${styles.processing}` : '')
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
              Ask a question or describe the analysis you want to run. Example: "Do heavy booster users spend more real money?"
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

        {/* Step 3: Analysis Details & Start Button */}
        {modalStep === 3 && (
          <>
            <h2 className={styles.modalTitle}>Analysis Details</h2>
            <div className={styles.analysisContainer}>
              {/* User Question */}
              <div className={styles.analysisSection}>
                <h3 className={styles.analysisSectionTitle}>Your Question:</h3>
                <p className={styles.analysisSectionText}>
                  {analysisDetails?.user_question || "Loading..."}
                </p>
              </div>

              {/* Generated Questions */}
              {analysisDetails?.generated_questions && analysisDetails.generated_questions.length > 0 && (
                <div className={styles.analysisSection}>
                  <h3 className={styles.analysisSectionTitle}>Generated Analysis Questions:</h3>
                  <div className={styles.questionsList}>
                    {analysisDetails.generated_questions.map((question, index) => (
                      <div key={index} className={styles.questionItem}>
                        <span className={styles.questionNumber}>{index + 1}.</span>
                        <span className={styles.questionText}>{question}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Clarification */}
              {analysisDetails?.user_clarification && (
                <div className={styles.analysisSection}>
                  <h3 className={styles.analysisSectionTitle}>Your Clarification:</h3>
                  <p className={styles.analysisSectionText}>
                    {analysisDetails.user_clarification}
                  </p>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button 
              className={styles.startAnalysisBtn}
              onClick={handleStartAnalysis}
              disabled={isSubmitting || requestCount === 0}
            >
              {isSubmitting ? (
                <div className={styles.buttonSpinner}></div>
              ) : (
                <>
                  Start Analysis
                  {requestCount !== null && (
                    <span className={styles.requestCount}>({requestCount})</span>
                  )}
                </>
              )}
            </button>

            {requestCount === 0 && (
  <div className={styles.noRequestsMessage}>
    <div className={styles.exhaustedTitle}>Daily Limit Reached</div>
    <div className={styles.exhaustedSubtext}>
      You have exhausted your analysis requests for today.
    </div>
  </div>
)}
          </>
        )}

        {/* Step 4: Processing */}
        {modalStep === 4 && (
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
  const router = useRouter();

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
  const [analysisDetails, setAnalysisDetails] = useState(null);
  const [requestCount, setRequestCount] = useState(null);
  const [originalQuestion, setOriginalQuestion] = useState("");
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // API base URLs
  const QUESTION_API_URL = "https://question-nt4chwvamq-uc.a.run.app";
  const CLARIFICATION_API_URL = "https://clarification-nt4chwvamq-uc.a.run.app";
  const READY_API_URL = "https://ready-nt4chwvamq-uc.a.run.app";
  const GET_INSIGHT_REQUESTS_API_URL = "https://get-insight-requests-nt4chwvamq-uc.a.run.app";
  const GET_REQUEST_COUNT_API_URL = "https://get-request-count-nt4chwvamq-uc.a.run.app";

  // Load cards from API on component mount (NO MORE LOCALSTORAGE)
  useEffect(() => {
    console.log("🔵 Component mounted - Loading cards from API");
    loadCardsFromAPI();
  }, []);

  // Load cards from API only
  const loadCardsFromAPI = async () => {
    try {
      setIsLoadingCards(true);
      console.log("📡 Loading cards from API...");
      
      const response = await callGetInsightRequestsAPI(null, ["processing", "completed"]);
      
      if (response && response.requests && Array.isArray(response.requests)) {
        const apiCards = response.requests.map(request => ({
          id: request.request_id,
          title: request.user_question,
          status: request.processing_status,
          requestId: request.request_id,
          insightId: request.insight_id,
          createdAt: request.requested_at || request.created_at
        }));
        
        setCards(apiCards);
        console.log("✅ Loaded", apiCards.length, "cards from API:", apiCards);
      } else {
        console.log("📝 No cards found from API");
        setCards([]);
      }
    } catch (error) {
      console.error("❌ Error loading cards from API:", error);
      setCards([]);
    } finally {
      setIsLoadingCards(false);
    }
  };

  // Call Question API
  const callQuestionAPI = async (question) => {
    console.log("🚀 CALLING QUESTION API");
    console.log("📝 Question:", question);
    
    try {
      const requestPayload = {
        user_id: "test",
        game_id: "blockheads",
        question: question
      };
      
      console.log("📤 Question API Request:", requestPayload);
      
      const response = await fetch(QUESTION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ QUESTION API SUCCESS");
      console.log("📥 Response:", data);
      console.log("🆔 Request ID:", data.request_id);
      
      return data;
    } catch (error) {
      console.error("❌ QUESTION API ERROR:", error);
      throw error;
    }
  };

  // Call Clarification API
  const callClarificationAPI = async (reqId, clarificationText) => {
    console.log("🚀 CALLING CLARIFICATION API");
    console.log("🆔 Request ID:", reqId);
    console.log("📝 Clarification:", clarificationText);
    
    try {
      const requestPayload = {
        request_id: reqId,
        clarification_text: clarificationText
      };
      
      console.log("📤 Clarification API Request:", requestPayload);
      
      const response = await fetch(CLARIFICATION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ CLARIFICATION API SUCCESS");
      console.log("📥 Response:", data);
      
      return data;
    } catch (error) {
      console.error("❌ CLARIFICATION API ERROR:", error);
      throw error;
    }
  };

  // Call Ready API
  const callReadyAPI = async (reqId) => {
    console.log("🚀 CALLING READY API");
    console.log("🆔 Request ID:", reqId);
    
    try {
      const requestPayload = {
        request_id: reqId,
        user_id: "test"
      };
      
      console.log("📤 Ready API Request:", requestPayload);
      
      const response = await fetch(READY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ READY API SUCCESS");
      console.log("📥 Response:", data);
      console.log("🔢 Requests Remaining:", data.requests_remaining);
      
      return data;
    } catch (error) {
      console.error("❌ READY API ERROR:", error);
      throw error;
    }
  };

  // Call Get Insight Requests API
  const callGetInsightRequestsAPI = async (reqId = null, statusFilter = null) => {
    console.log("🚀 CALLING GET INSIGHT REQUESTS API");
    console.log("🆔 Request ID:", reqId);
    console.log("🏷️ Status Filter:", statusFilter);
    
    try {
      const requestPayload = {
        user_id: "test",
        game_id: "blockheads"
      };

      if (reqId) {
        requestPayload.request_id = reqId;
      }

      if (statusFilter) {
        requestPayload.status = statusFilter;
      }

      console.log("📤 Get Insight Requests API Request:", requestPayload);

      const response = await fetch(GET_INSIGHT_REQUESTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ GET INSIGHT REQUESTS API SUCCESS");
      console.log("📥 Response:", data);
      
      if (data.requests && Array.isArray(data.requests)) {
        console.log("📊 Found", data.requests.length, "requests");
        data.requests.forEach((req, index) => {
          console.log(`📋 Request ${index + 1}:`, {
            id: req.request_id,
            question: req.user_question,
            status: req.processing_status,
            insight_id: req.insight_id
          });
        });
      }
      
      return data;
    } catch (error) {
      console.error("❌ GET INSIGHT REQUESTS API ERROR:", error);
      throw error;
    }
  };

  // Call Get Request Count API
  const callGetRequestCountAPI = async () => {
    console.log("🚀 CALLING GET REQUEST COUNT API");
    
    try {
      const requestPayload = {
        user_id: "test"
      };
      
      console.log("📤 Get Request Count API Request:", requestPayload);
      
      const response = await fetch(GET_REQUEST_COUNT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ GET REQUEST COUNT API SUCCESS");
      console.log("📥 Response:", data);
      console.log("🔢 Remaining Requests:", data.remaining_requests);
      
      return data;
    } catch (error) {
      console.error("❌ GET REQUEST COUNT API ERROR:", error);
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

  // Map status to display text and style
  const getStatusDisplay = (status) => {
    switch (status) {
      case "ready":
        return { text: "Ready", className: styles.readyTag };
      case "processing":
        return { text: "Processing", className: styles.processingTag };
      case "completed":
        return { text: "Completed", className: styles.completedTag };
      default:
        return { text: "Unknown", className: styles.processingTag };
    }
  };

  // Handle card click (only for completed cards)
  const handleCardClick = (card) => {
    console.log("🖱️ Card clicked:", card);
    
    if (card.status === "completed" && card.insightId) {
      console.log("🚀 Routing to insight page with ID:", card.insightId);
      router.push(`/insight/${card.insightId}`);
    } else if (card.status === "completed" && !card.insightId) {
      console.log("⚠️ Card is completed but no insight ID found");
      alert("Insight not available yet. Please try again later.");
    } else {
      console.log("ℹ️ Card not clickable - Status:", card.status);
    }
  };

  // Handle form submission based on current step
  const handleModalSubmit = async (inputText) => {
    setIsSubmitting(true);
    console.log(`📝 STEP ${modalStep} - USER INPUT:`, inputText);

    try {
      if (modalStep === 1) {
        // Store original question
        setOriginalQuestion(inputText);
        console.log("💾 Stored original question:", inputText);
        
        // Step 1: Initial question
        const response = await callQuestionAPI(inputText);
        
        // Store request ID for later use
        setRequestId(response.request_id);
        console.log("💾 Stored request ID:", response.request_id);
        
        // Check if clarification is needed
        const needsTimeframe = response.clarification_needed?.has_timeframe === false;
        const needsUserSegment = response.clarification_needed?.has_user_segment === false;
        
        console.log("🔍 CLARIFICATION CHECK:", {
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
          console.log("➡️ MOVING TO STEP 2 - Clarification needed");
        } else {
          // No clarification needed - go to step 3
          await moveToAnalysisDetails(response.request_id);
        }
        
      } else if (modalStep === 2) {
        // Step 2: Clarification
        await callClarificationAPI(requestId, inputText);
        
        // Move to step 3 - Analysis Details
        await moveToAnalysisDetails(requestId);
      }
      
    } catch (error) {
      console.error("❌ ERROR IN MODAL SUBMIT:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move to analysis details step
  const moveToAnalysisDetails = async (reqId) => {
    try {
      setIsSubmitting(true);
      console.log("🔄 MOVING TO ANALYSIS DETAILS");
      console.log("🆔 Using Request ID:", reqId);
      
      // Fetch analysis details and request count simultaneously
      console.log("📡 Fetching analysis details and request count...");
      
      const [detailsResponse, countResponse] = await Promise.all([
        callGetInsightRequestsAPI(reqId),
        callGetRequestCountAPI()
      ]);

      // Set analysis details
      if (detailsResponse && detailsResponse.requests && detailsResponse.requests.length > 0) {
        const details = detailsResponse.requests[0];
        setAnalysisDetails(details);
        console.log("✅ Analysis details set:", {
          user_question: details.user_question,
          user_clarification: details.user_clarification,
          generated_questions: details.generated_questions?.length || 0
        });
      } else {
        console.log("⚠️ No analysis details found");
      }

      // Set request count
      if (countResponse && typeof countResponse.remaining_requests === 'number') {
        setRequestCount(countResponse.remaining_requests);
        console.log("✅ Request count set:", countResponse.remaining_requests);
      } else {
        console.log("⚠️ No request count found");
        setRequestCount(0);
      }

      // Move to step 3
      setModalStep(3);
      console.log("➡️ MOVED TO STEP 3 - Analysis Details");
      
    } catch (error) {
      console.error("❌ ERROR MOVING TO ANALYSIS DETAILS:", error);
      alert("Error loading analysis details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle start analysis button
  const handleStartAnalysis = async () => {
    if (!requestId || requestCount === 0) {
      console.log("⚠️ Cannot start analysis - No request ID or no requests remaining");
      return;
    }

    try {
      setIsSubmitting(true);
      setModalStep(4); // Move to processing step
      console.log("🚀 STARTING ANALYSIS");
      console.log("🆔 Request ID:", requestId);
      
      // Call Ready API to start processing
      await callReadyAPI(requestId);
      
      console.log("✅ Analysis started successfully");
      
      // Close modal after delay
      setTimeout(() => {
        closeModal();
        // Reload cards to show the new processing request
        loadCardsFromAPI();
      }, 2000);
      
    } catch (error) {
      console.error("❌ ERROR STARTING ANALYSIS:", error);
      alert("Error starting analysis. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open modal
  const openModal = () => {
    console.log("🔵 OPENING MODAL");
    setModalOpen(true);
    setIsClosing(false);
    setModalStep(1);
    setUserInput("");
    setClarificationMessage("");
    setAnalysisDetails(null);
    setRequestCount(null);
    setOriginalQuestion("");
  };

  // Close modal with animation
  const closeModal = () => {
    console.log("🔴 CLOSING MODAL");
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
      setAnalysisDetails(null);
      setRequestCount(null);
      setOriginalQuestion("");
    }, 200);
  };

  // Refresh card statuses
  const refreshCardStatuses = () => {
    console.log("🔄 REFRESHING CARDS");
    loadCardsFromAPI();
  };

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.mainLayout}>
        {/* <Sidebar /> */}
        <main className={styles.mainContent}>
          {/* Top bar with refresh and + button */}
          <div className={styles.topBar}>
            <div className={styles.topBarActions}>
              <button className={styles.refreshBtn} onClick={refreshCardStatuses}>
                Refresh Status
              </button>
              <button className={styles.addBtn} onClick={openModal}>
                <FiPlus size={22} />
              </button>
            </div>
          </div>

          {/* Cards grid */}
          <div className={styles.cardsGrid}>
            {isLoadingCards ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyContent}>
                  <h3 className={styles.emptyTitle}>Loading...</h3>
                  <p className={styles.emptyText}>
                    Fetching your analysis requests...
                  </p>
                </div>
              </div>
            ) : cards.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyContent}>
                  <h3 className={styles.emptyTitle}>No Analysis Yet</h3>
                  <p className={styles.emptyText}>
                    Click the + button to start your first custom analysis
                  </p>
                </div>
              </div>
            ) : (
              cards.map((card) => {
                const statusDisplay = getStatusDisplay(card.status);
                const isClickable = card.status === "completed";
                
                return (
                  <div 
                    key={card.id} 
                    className={`${styles.glassCard} ${isClickable ? styles.clickableCard : ''}`}
                    onClick={() => handleCardClick(card)}
                    style={{ cursor: isClickable ? 'pointer' : 'default' }}
                  >
                    <div className={styles.cardTitle}>{card.title}</div>
                    <div className={styles.cardTagWrapper}>
                      <span className={statusDisplay.className}>
                        {statusDisplay.text}
                      </span>
                    </div>
                  </div>
                );
              })
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
            analysisDetails={analysisDetails}
            requestCount={requestCount}
            onStartAnalysis={handleStartAnalysis}
          />
        </main>
      </div>
    </div>
  );
}