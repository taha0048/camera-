import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface HandPoint {
  x: number;
  y: number;
}

export interface HandTrackingState {
  isPinching: boolean;
  pointer: HandPoint | null;
  landmarks: any[] | null;
  isLoading: boolean;
  error: string | null;
}

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement | null>, isActive: boolean) {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [state, setState] = useState<HandTrackingState>({
    isPinching: false,
    pointer: null,
    landmarks: null,
    isLoading: true,
    error: null,
  });
  const requestRef = useRef<number>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const smoothedPointer = useRef<HandPoint | null>(null);
  const SMOOTHING_FACTOR = 0.8; // Higher = more responsive (less smoothing)
  const PINCH_THRESHOLD = 0.06; // Slightly more relaxed threshold

  // Initialize HandLandmarker
  useEffect(() => {
    let landmarkerInstance: HandLandmarker | null = null;
    let isCancelled = false;

    async function init() {
      if (!isActive) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }
      
      setState(s => ({ ...s, isLoading: true }));
      try {
        console.log("Starting HandLandmarker initialization...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );
        console.log("FilesetResolver loaded");
        
        const options: any = {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          runningMode: "VIDEO",
          numHands: 1
        };

        try {
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, options);
          console.log("HandLandmarker created with versioned model");
        } catch (err) {
          console.error("Failed to create HandLandmarker with versioned model:", err);
          // Try another fallback path
          options.baseOptions.modelAssetPath = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, options);
          console.log("HandLandmarker created with latest-float16 fallback");
        }
        
        if (isCancelled) {
          console.log("Initialization cancelled, closing landmarker");
          landmarkerInstance.close();
          return;
        }
        
        setHandLandmarker(landmarkerInstance);
        setState(s => ({ ...s, isLoading: false }));
        console.log("Initialization complete");
      } catch (err) {
        console.error("Critical error in useHandTracking init:", err);
        setState(s => ({ ...s, isLoading: false, error: "Failed to initialize landmarker" }));
      }
    }
    
    if (!handLandmarker) {
      init();
    }

    return () => {
      isCancelled = true;
    };
  }, [isActive, handLandmarker]);

  const detectHand = useCallback(() => {
    if (!handLandmarker || !videoRef.current || !isActive) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const video = videoRef.current;
    
    // Ensure video is playing and has actual pixel data
    if (video.readyState < 2 || video.paused || video.ended || video.videoWidth === 0) {
      requestRef.current = requestAnimationFrame(detectHand);
      return;
    }

    try {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(video, startTimeMs);
        processResults(results);
      }
      requestRef.current = requestAnimationFrame(detectHand);
    } catch (err) {
      console.error("Hand detection runtime error:", err);
      // Restart loop after error
      requestRef.current = requestAnimationFrame(detectHand);
    }
  }, [handLandmarker, videoRef, isActive]);

  const processResults = (results: HandLandmarkerResult) => {
    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      const indexTip = landmarks[8];
      const thumbTip = landmarks[4];
      
      const dx = indexTip.x - thumbTip.x;
      const dy = indexTip.y - thumbTip.y;
      const dz = indexTip.z - thumbTip.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const isPinching = distance < PINCH_THRESHOLD;
      
      const rawX = indexTip.x;
      const rawY = indexTip.y;
      
      if (!smoothedPointer.current) {
        smoothedPointer.current = { x: rawX, y: rawY };
      } else {
        smoothedPointer.current = {
          x: smoothedPointer.current.x * (1 - SMOOTHING_FACTOR) + rawX * SMOOTHING_FACTOR,
          y: smoothedPointer.current.y * (1 - SMOOTHING_FACTOR) + rawY * SMOOTHING_FACTOR,
        };
      }
      
      setState({
        isPinching,
        pointer: { x: smoothedPointer.current.x, y: smoothedPointer.current.y },
        landmarks: landmarks,
        isLoading: false,
        error: null,
      });
    } else {
      smoothedPointer.current = null;
      setState({
        isPinching: false,
        pointer: null,
        landmarks: null,
        isLoading: false,
        error: state.error,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (handLandmarker) {
        handLandmarker.close();
      }
    };
  }, [handLandmarker]);

  useEffect(() => {
    if (isActive && handLandmarker) {
      requestRef.current = requestAnimationFrame(detectHand);
    } else if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, handLandmarker, detectHand]);

  return state;
}
