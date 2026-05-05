import { useState, useCallback, useRef, useEffect } from 'react';
import { CameraFacing } from '../types';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacing>('user');
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Stable callback ref to capture the video node
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
  }, []);

  // Sync effect that monitors both stream and actual video element availability
  useEffect(() => {
    const video = videoElement;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(e => {
          // Play() can be interrupted by a new load request (e.g. if stream changes quickly)
          // This is expected and safe to ignore if it's an AbortError.
          if (e.name !== 'AbortError') {
            console.error("Camera play error:", e);
          }
        });
      }
    }
  }, [videoElement, stream]);

  const startCamera = useCallback(async (facing: CameraFacing = 'user') => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facing,
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setFacingMode(facing);
      setIsActive(true);
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera permission denied or unavailable');
      setIsActive(false);
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
    }
  }, [stream]);

  const toggleFacingMode = useCallback(() => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  }, [facingMode, startCamera]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    setVideoRef,
    stream,
    isActive,
    error,
    facingMode,
    startCamera,
    stopCamera,
    toggleFacingMode,
  };
}
