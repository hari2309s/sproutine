'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEntitlement } from '@/lib/billingApi'

export const ENTITLEMENT_KEY = ['entitlement'] as const

/**
 * The user's plan. `pro` is undefined while loading, so callers can avoid
 * flashing a Pro gate or pill at someone who has Pro.
 */
export function useEntitlement() {
  const query = useQuery({
    queryKey: ENTITLEMENT_KEY,
    queryFn: fetchEntitlement,
    staleTime: 5 * 60 * 1000,
  })
  return { entitlement: query.data, pro: query.data?.pro, isLoading: query.isLoading }
}

export function useRefreshEntitlement() {
  const client = useQueryClient()
  return useCallback(() => client.invalidateQueries({ queryKey: ENTITLEMENT_KEY }), [client])
}
