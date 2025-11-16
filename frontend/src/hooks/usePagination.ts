import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  pageSize: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedData: T[];
  pageSize: number;
  totalItems: number;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export const usePagination = <T>({ data, pageSize: initialPageSize }: UsePaginationProps<T>): UsePaginationReturn<T> => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.ceil(data.length / pageSize);
  const totalItems = data.length;

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    goToPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    goToPage(currentPage - 1);
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  return {
    currentPage,
    totalPages,
    paginatedData,
    pageSize,
    totalItems,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize,
    canGoNext,
    canGoPrevious,
  };
};