import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface HandPoint {
  x: number;
  y: number;
}

export interface PointerState extends HandPoint {
  isPinching: boolean;
  handedness: 'Left' | 'Right';
}

export interface HandTrackingState {
  isPinching: boolean; // Legacy
  pointer: HandPoint | null; // Legacy
  pointers: PointerState[];
  landmarks: any[] | null;
  allLandmarks: any[][] | null;
  isLoading: boolean;
  error: string | null;
}

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement | null>, isActive: boolean) {
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [state, setState] = useState<HandTrackingState>({
    isPinching: false,
    pointer: null,
    pointers: [],
    landmarks: null,
    allLandmarks: null,
    isLoading: true,
    error: null,
  });
  const requestRef = useRef<number>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const smoothedPointers = useRef<(HandPoint | null)[]>([null, null]);
  const SMOOTHING_FACTOR = 0.7;
  const PINCH_THRESHOLD = 0.1;

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
        
        const options: any = {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/latest/hand_landmarker.task",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        };

        try {
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, options);
          console.log("HandLandmarker created successfully");
        } catch (err) {
          console.warn("Primary model/delegate failed, trying fallback:", err);
          options.baseOptions.modelAssetPath = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
          options.baseOptions.delegate = "CPU";
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, options);
          console.log("HandLandmarker created with CPU fallback");
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
        // Use video frame timestamp for better accuracy
        const results = handLandmarker.detectForVideo(video, video.currentTime * 1000);
        
        // Periodic logging for status
        if (Math.random() < 0.05) {
          if (results.landmarks && results.landmarks.length > 0) {
            console.log(`HANDS DETECTED: ${results.landmarks.length}`);
          } else {
            console.log("DETECTOR ACTIVE - No hand in view");
          }
        }
        
        processResults(results);
      }
      requestRef.current = requestAnimationFrame(detectHand);
    } catch (err) {
      console.error("Hand detection runtime error:", err);
      requestRef.current = requestAnimationFrame(detectHand);
    }
  }, [handLandmarker, videoRef, isActive]);

  const processResults = (results: HandLandmarkerResult) => {
    if (results.landmarks && results.landmarks.length > 0) {
      const activePointers: PointerState[] = [];
      const firstHandLandmarks = results.landmarks[0];
      
      // Update smoothing for each detected hand
      results.landmarks.forEach((landmarks, index) => {
        if (index > 1) return; // Only track up to 2 hands for now

        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isPinching = distance < PINCH_THRESHOLD;

        const rawX = indexTip.x;
        const rawY = indexTip.y;

        if (!smoothedPointers.current[index]) {
          smoothedPointers.current[index] = { x: rawX, y: rawY };
        } else {
          const current = smoothedPointers.current[index]!;
          smoothedPointers.current[index] = {
            x: current.x * (1 - SMOOTHING_FACTOR) + rawX * SMOOTHING_FACTOR,
            y: current.y * (1 - SMOOTHING_FACTOR) + rawY * SMOOTHING_FACTOR,
          };
        }

        const handedness = results.handedness[index]?.[0]?.categoryName as 'Left' | 'Right' || 'Right';

        activePointers.push({
          x: smoothedPointers.current[index]!.x,
          y: smoothedPointers.current[index]!.y,
          isPinching,
          handedness
        });
      });

      // Clear gesture logic
      if (results.landmarks.length >= 2) {
        const h1 = results.landmarks[0][8]; // index tip 1
        const h2 = results.landmarks[1][8]; // index tip 2
        
        const proximity = Math.sqrt(
          Math.pow(h1.x - h2.x, 2) + 
          Math.pow(h1.y - h2.y, 2)
        );

        // Clear if tips are very close
        if (proximity < 0.08) {
          window.dispatchEvent(new CustomEvent('hand-clear-gesture'));
        }
      }

      setState({
        isPinching: activePointers[0].isPinching,
        pointer: { x: activePointers[0].x, y: activePointers[0].y },
        pointers: activePointers,
        landmarks: firstHandLandmarks,
        allLandmarks: results.landmarks,
        isLoading: false,
        error: null,
      });
    } else {
      smoothedPointers.current = [null, null];
      setState({
        isPinching: false,
        pointer: null,
        pointers: [],
        landmarks: null,
        allLandmarks: null,
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
