import React from 'react';
import { CubeSat3D } from '../components/DigitalTwin/CubeSat3D';

export const DigitalTwinModule: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 128px)',
        minHeight: '750px',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      <CubeSat3D />
    </div>
  );
};
