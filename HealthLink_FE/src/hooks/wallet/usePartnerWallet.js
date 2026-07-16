import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { paymentApi } from '../../api/paymentApi';
import { toWalletTransactionEntry } from '../../components/wallet/wallet-entry-view-model';

const DEFAULT_FILTERS = {
  searchTerm: '',
  dateFrom: null,
  dateTo: null,
  typeFilter: 'all',
  statusFilter: 'all',
};

const toDateParam = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toApiFilter = (value) => {
  if (!value || String(value).toLowerCase() === 'all') return undefined;
  return String(value).toUpperCase();
};

export function usePartnerWallet({ partnerId, partnerType, pageSize = 10 }) {
  const [balance, setBalance] = useState(null);
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchTerm(filters.searchTerm), 300);
    return () => window.clearTimeout(timeout);
  }, [filters.searchTerm]);

  const requestFilters = useMemo(() => ({
    search: debouncedSearchTerm || undefined,
    type: toApiFilter(filters.typeFilter),
    status: toApiFilter(filters.statusFilter),
    from: toDateParam(filters.dateFrom),
    to: toDateParam(filters.dateTo),
    page,
    size: pageSize,
  }), [debouncedSearchTerm, filters.dateFrom, filters.dateTo, filters.statusFilter, filters.typeFilter, page, pageSize]);

  const refresh = useCallback(async () => {
    if (!partnerId || !partnerType) {
      setBalance(null);
      setEntries([]);
      setTotalElements(0);
      setTotalPages(0);
      return;
    }

    const sequence = ++requestSequenceRef.current;
    setLoading(true);
    setError(null);
    try {
      const [nextBalance, pageResult] = await Promise.all([
        paymentApi.getPartnerBalance(partnerId, partnerType),
        paymentApi.getPartnerWalletEntries(partnerId, requestFilters),
      ]);
      if (sequence !== requestSequenceRef.current) return;

      setBalance(nextBalance);
      setEntries((pageResult?.content || []).map(toWalletTransactionEntry));
      setTotalElements(pageResult?.totalElements || 0);
      setTotalPages(pageResult?.totalPages || 0);
    } catch (requestError) {
      if (sequence === requestSequenceRef.current) setError(requestError);
    } finally {
      if (sequence === requestSequenceRef.current) setLoading(false);
    }
  }, [partnerId, partnerType, requestFilters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }, []);

  const filterControls = useMemo(() => ({
    searchTerm: filters.searchTerm,
    setSearchTerm: (value) => updateFilter('searchTerm', value),
    dateFrom: filters.dateFrom,
    setDateFrom: (value) => updateFilter('dateFrom', value),
    dateTo: filters.dateTo,
    setDateTo: (value) => updateFilter('dateTo', value),
    typeFilter: filters.typeFilter,
    setTypeFilter: (value) => updateFilter('typeFilter', value),
    statusFilter: filters.statusFilter,
    setStatusFilter: (value) => updateFilter('statusFilter', value),
  }), [filters, updateFilter]);

  return {
    balance,
    entries,
    filters,
    filterControls,
    page,
    setPage,
    totalElements,
    totalPages,
    loading,
    error,
    refresh,
  };
}
