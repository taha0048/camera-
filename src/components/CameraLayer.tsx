import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraOff } from 'lucide-react';

interface CameraLayerProps {
  videoRef: (node: HTMLVideoElement | null) => void;
  isActive: boolean;
  isVisible: boolean;
  error: string | null;
  isMirrored?: boolean;
}

const CameraLayer: React.FC<CameraLayerProps> = ({
  videoRef,
  isActive,
  isVisible,
  error,
  isMirrored = true,
}) => {
  return (
    <div className="absolute inset-0 bg-neutral-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {isVisible && isActive ? (
          <motion.div
            key="camera-feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full h-full"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover grayscale-[20%] contrast-[110%] brightness-[95%] ${isMirrored ? '-scale-x-100' : ''}`}
            />
            {/* Subtle cinematic overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] pointer-events-none" />
          </motion.div>
        ) : (
          <motion.div
            key="camera-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-center space-y-6 bg-neutral-900"
          >
            <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700/50">
              <CameraOff className="w-10 h-10 text-neutral-500" />
            </div>
            <div className="text-center">
              <p className="text-neutral-400 font-medium tracking-tight">
                {error || 'Camera is hidden'}
              </p>
              <p className="text-neutral-500 text-sm mt-1">
                Toggle the camera icon to reveal the view
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CameraLayer;
