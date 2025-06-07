"use client";
import React from "react";
import { useRouter } from "next/navigation";
import styles from "../../../styles/InsightCard.module.css";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

const InsightCard = ({ description, insight_id }) => {
  const router = useRouter();
  
  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.messageWrapper}>
          <div className={styles.description}>
            <span className={styles.bullet}>•</span>
            {description}
          </div>
        </div>
        <button
          className={styles.investigateButton}
          onClick={() => router.push(`/insight?id=${insight_id}`)}
        >
          <Image
            src="/bulb.svg"
            alt="Lightbulb"
            width={16}
            height={16}
            className={styles.buttonIcon}
          />
          <span>Investigate</span>
          <ArrowRight className={styles.arrowIcon} size={16} />
        </button>
      </div>
    </div>
  );
};

export default InsightCard;