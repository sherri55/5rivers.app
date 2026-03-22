import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, expenseCategoriesApi } from '@/api/endpoints';
import type { PaginationParams, Expense, ExpenseCategory, CreateExpenseInput, UpdateExpenseInput } from '@/types';

// --- Expense Category hooks ---

export const expenseCategoryKeys = {
  all: ['expense-categories'] as const,
  lists: () => [...expenseCategoryKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...expenseCategoryKeys.lists(), params] as const,
  details: () => [...expenseCategoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseCategoryKeys.details(), id] as const,
};

export function useExpenseCategoriesList(params?: PaginationParams) {
  return useQuery({
    queryKey: expenseCategoryKeys.list(params),
    queryFn: () => expenseCategoriesApi.list(params),
  });
}

export function useExpenseCategory(id: string) {
  return useQuery({
    queryKey: expenseCategoryKeys.detail(id),
    queryFn: () => expenseCategoriesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExpenseCategory>) => expenseCategoriesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseCategoryKeys.lists() });
    },
  });
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseCategory> }) =>
      expenseCategoriesApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: expenseCategoryKeys.lists() });
      qc.invalidateQueries({ queryKey: expenseCategoryKeys.detail(variables.id) });
    },
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseCategoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseCategoryKeys.lists() });
    },
  });
}

// --- Expense hooks ---

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...expenseKeys.lists(), params] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
};

export function useExpensesList(params?: PaginationParams) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: () => expensesApi.list(params),
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: () => expensesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => expensesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.lists() });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseInput }) =>
      expensesApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: expenseKeys.lists() });
      qc.invalidateQueries({ queryKey: expenseKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.lists() });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
