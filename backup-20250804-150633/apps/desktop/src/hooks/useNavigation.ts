import { useState, useCallback } from 'react';

export type PageType = 'upload' | 'documents' | 'models' | 'graph-extraction' | 'settings';

interface NavigationState {
  currentPage: PageType;
  history: PageType[];
}

export const useNavigation = () => {
  const [navState, setNavState] = useState<NavigationState>({
    currentPage: 'upload',
    history: ['upload'],
  });

  const navigateTo = useCallback((page: PageType) => {
    setNavState(prev => ({
      currentPage: page,
      history: [...prev.history, page],
    }));
  }, []);

  const goBack = useCallback(() => {
    setNavState(prev => {
      if (prev.history.length <= 1) return prev;
      
      const newHistory = prev.history.slice(0, -1);
      return {
        currentPage: newHistory[newHistory.length - 1],
        history: newHistory,
      };
    });
  }, []);

  const canGoBack = navState.history.length > 1;

  return {
    currentPage: navState.currentPage,
    navigateTo,
    goBack,
    canGoBack,
  };
}; 