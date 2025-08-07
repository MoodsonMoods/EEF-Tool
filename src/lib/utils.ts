import { Position } from '@/types';

// Position utilities
export const getPositionFromElementType = (elementType: number): Position => {
  switch (elementType) {
    case 1: return 'GK';
    case 2: return 'DEF';
    case 3: return 'MID';
    case 4: return 'FWD';
    default: return 'MID';
  }
};

export const getPositionName = (position: Position): string => {
  switch (position) {
    case 'GK': return 'Goalkeeper';
    case 'DEF': return 'Defender';
    case 'MID': return 'Midfielder';
    case 'FWD': return 'Forward';
  }
};

// Price formatting
export const formatPrice = (price: number): string => {
  return `€${(price / 10).toFixed(1)}M`;
};

// Percentage formatting
export const formatPercentage = (percent: number): string => {
  return `${percent.toFixed(1)}%`;
};

// Difficulty utilities
export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'VERY_EASY': return 'bg-green-100 text-green-800';
    case 'EASY': return 'bg-lime-100 text-lime-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'HARD': return 'bg-orange-100 text-orange-800';
    case 'VERY_HARD': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getDifficultyText = (difficulty: string): string => {
  switch (difficulty) {
    case 'VERY_EASY': return 'Very Easy';
    case 'EASY': return 'Easy';
    case 'MEDIUM': return 'Medium';
    case 'HARD': return 'Hard';
    case 'VERY_HARD': return 'Very Hard';
    default: return 'Unknown';
  }
};

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const groupBy = <T, K extends keyof any>(array: T[], key: (item: T) => K): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const group = key(item);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

// Date utilities
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}; 