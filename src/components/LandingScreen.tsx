import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Camera, PenTool, Layout } from 'lucide-react';

interface LandingScreenProps {
  onStart: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center space-y-12">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-white/10 to-white/20 border border-white/20 p-5 backdrop-blur-3xl shadow-2xl">
              <Layout className="w-full h-full text-white" />
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent"
          >
            Lumina Canvas
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-neutral-400 text-lg md:text-xl font-light tracking-wide max-w-lg mx-auto"
          >
            A high-performance immersive space for visual expression and reality augmented by art.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 2 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-8 pb-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700"
        >
          <Feature icon={Camera} label="Live Reality" />
          <Feature icon={Sparkles} label="Smooth Motion" />
          <Feature icon={PenTool} label="Artist Tools" />
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          onClick={onStart}
          className="group relative px-12 py-5 rounded-full bg-white text-black font-semibold text-lg overflow-hidden shadow-2xl hover:shadow-white/10 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative">Enter Experience</span>
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        className="absolute bottom-8 text-[10px] uppercase tracking-[0.3em] font-medium font-mono text-white/50"
      >
        Built for Professional Creators
      </motion.div>
    </div>
  );
};

const Feature: React.FC<{ icon: any; label: string }> = ({ icon: Icon, label }) => (
  <div className="flex flex-col items-center space-y-2">
    <div className="w-8 h-8 flex items-center justify-center">
      <Icon className="w-full h-full" />
    </div>
    <span className="text-[10px] uppercase tracking-widest font-bold font-mono">{label}</span>
  </div>
);

export default LandingScreen;
