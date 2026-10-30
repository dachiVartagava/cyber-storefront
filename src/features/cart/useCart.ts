import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import type { Cart } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';

export function useCart() {
  const { status } = useAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery<Cart | null>({
    queryKey: ['cart'],
    queryFn: () => api.get<Cart>('/cart'),
    enabled: status === 'authenticated',
    staleTime: 30_000,
  });

  // FE-005: Every mutation returns the full updated Cart — write directly to ['cart'] query cache
  const addItemMutation = useMutation({
    mutationFn: (payload: { productId: string; qty?: number }) =>
      api.post<Cart>('/cart/items', payload),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
  });

  const updateItemQtyMutation = useMutation({
    mutationFn: (payload: { itemId: string; qty: number }) =>
      api.patch<Cart>(`/cart/items/${payload.itemId}`, { qty: payload.qty }),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete<Cart>(`/cart/items/${itemId}`),
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(['cart'], updatedCart);
    },
  });

  const clearCartCache = () => {
    queryClient.setQueryData(['cart'], {
      items: [],
      totalQty: 0,
      subtotal: 0,
      currency: 'GEL',
    });
  };

  return {
    cart: status === 'authenticated' ? cartQuery.data ?? null : null,
    isLoading: status === 'authenticated' && cartQuery.isLoading,
    isError: cartQuery.isError,
    refetch: cartQuery.refetch,
    addItem: addItemMutation,
    updateItemQty: updateItemQtyMutation,
    removeItem: removeItemMutation,
    clearCartCache,
  };
}
