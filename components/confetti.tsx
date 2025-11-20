"use client";

import { useEffect } from "react";

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  useEffect(() => {
    if (!trigger) return;

    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#ffa07a",
      "#98d8c8",
      "#f7dc6f",
    ];
    const confettiCount = 50;
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.zIndex = "9999";
    document.body.appendChild(container);

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div");
      confetti.style.position = "absolute";
      confetti.style.width = "10px";
      confetti.style.height = "10px";
      confetti.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + "%";
      confetti.style.top = "-10px";
      confetti.style.opacity = "1";
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(confetti);

      const duration = 2000 + Math.random() * 1000;
      const endX = (Math.random() - 0.5) * 200;
      const endY = window.innerHeight + 20;

      confetti.animate(
        [
          { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
          {
            transform: `translate(${endX}px, ${endY}px) rotate(${
              Math.random() * 720
            }deg)`,
            opacity: 0,
          },
        ],
        { duration, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }
      );
    }

    const cleanup = setTimeout(() => {
      document.body.removeChild(container);
      onComplete?.();
    }, 3500);

    return () => {
      clearTimeout(cleanup);
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, [trigger, onComplete]);

  return null;
}
