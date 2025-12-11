import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, color = 'bg-teal-500' }) => {
  return (
    <div className="flex items-center justify-center space-x-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full ${color} transition-all duration-300 ease-in-out`}
          style={{
            height: isActive ? `${Math.random() * 20 + 10}px` : '4px',
            opacity: isActive ? 1 : 0.5,
            animation: isActive ? `bounce 0.5s infinite ${i * 0.1}s` : 'none'
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(2.5); }
        }
      `}</style>
    </div>
  );
};

export default AudioVisualizer;
