'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { CSVDisasterRow } from '@/types';

interface UseCSVParserReturn {
  parseCSV: (file: File) => Promise<CSVDisasterRow[]>;
  isLoading: boolean;
  error: string | null;
}

export function useCSVParser(): UseCSVParserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((file: File): Promise<CSVDisasterRow[]> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      setError(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsLoading(false);

          if (results.errors.length > 0) {
            const errorMessage = results.errors
              .map((e) => e.message)
              .join(', ');
            setError(errorMessage);
            reject(new Error(errorMessage));
            return;
          }

          const rows = results.data as CSVDisasterRow[];
          
          // Validate required fields
          const validRows = rows.filter((row) => {
            return row.area_name && row.severity;
          });

          if (validRows.length === 0) {
            setError('No valid rows found. Required columns: area_name, severity');
            reject(new Error('No valid rows found'));
            return;
          }

          resolve(validRows);
        },
        error: (parseError) => {
          setIsLoading(false);
          setError(parseError.message);
          reject(parseError);
        },
      });
    });
  }, []);

  return { parseCSV, isLoading, error };
}

export default useCSVParser;
