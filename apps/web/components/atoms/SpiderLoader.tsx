import React from 'react';

export const SpiderLoader = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  void size; // size prop reserved for future use
  return <div>Loading...</div>;
};
