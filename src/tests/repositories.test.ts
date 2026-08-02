import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase/client');

import { __resetFakeSupabase } from '../supabase/__mocks__/client';
import { categoryRepository } from '../repositories/categoryRepository';
import { expenseRepository } from '../repositories/expenseRepository';
import { paymentMethodRepository } from '../repositories/paymentMethodRepository';

beforeEach(() => {
  __resetFakeSupabase();
});

describe('categoryRepository.ensureSeeded', () => {
  it('seeds default categories only when the table is empty', async () => {
    await categoryRepository.ensureSeeded();
    const first = await categoryRepository.getAll();
    expect(first.length).toBeGreaterThan(0);

    await categoryRepository.ensureSeeded();
    const second = await categoryRepository.getAll();
    expect(second).toHaveLength(first.length);
  });
});

describe('expenseRepository.duplicate', () => {
  beforeEach(async () => {
    await categoryRepository.ensureSeeded();
  });

  it('creates a copy with a new id, leaving the original untouched', async () => {
    const categories = await categoryRepository.getActive();
    const original = await expenseRepository.create({
      title: 'Lunch',
      amount: 1250,
      categoryId: categories[0].id,
      date: '2026-07-10',
      time: '12:30',
      merchant: 'Cafe',
      tags: ['work'],
    });

    const copy = await expenseRepository.duplicate(original.id);

    expect(copy.id).not.toBe(original.id);
    expect(copy.title).toBe(original.title);
    expect(copy.amount).toBe(original.amount);

    const all = await expenseRepository.getAll();
    expect(all).toHaveLength(2);
  });
});

describe('categoryRepository.deleteOrArchive', () => {
  beforeEach(async () => {
    await categoryRepository.ensureSeeded();
  });

  it('permanently deletes a category with no linked expenses', async () => {
    const custom = await categoryRepository.create({
      name: 'Hobbies',
      icon: '🎨',
      color: '#123456',
      isDefault: false,
      status: 'active',
      sortOrder: 99,
    });

    const outcome = await categoryRepository.deleteOrArchive(custom.id);
    expect(outcome).toBe('deleted');
    expect(await categoryRepository.getById(custom.id)).toBeUndefined();
  });

  it('archives instead of deleting a category that is still in use', async () => {
    const categories = await categoryRepository.getActive();
    const category = categories[0];
    await expenseRepository.create({
      title: 'Something',
      amount: 500,
      categoryId: category.id,
      date: '2026-07-01',
      time: '09:00',
      tags: [],
    });

    const outcome = await categoryRepository.deleteOrArchive(category.id);
    expect(outcome).toBe('archived');
    const stillThere = await categoryRepository.getById(category.id);
    expect(stillThere?.status).toBe('archived');
  });
});

describe('paymentMethodRepository.deleteIfUnused', () => {
  beforeEach(async () => {
    await categoryRepository.ensureSeeded();
  });

  it('refuses to delete a payment method connected to expenses', async () => {
    const categories = await categoryRepository.getActive();
    const method = await paymentMethodRepository.create({
      name: 'Test Card',
      type: 'credit_card',
      color: '#000000',
      status: 'active',
    });
    await expenseRepository.create({
      title: 'Purchase',
      amount: 999,
      categoryId: categories[0].id,
      paymentMethodId: method.id,
      date: '2026-07-01',
      time: '09:00',
      tags: [],
    });

    await expect(paymentMethodRepository.deleteIfUnused(method.id)).rejects.toThrow();
    expect(await paymentMethodRepository.getById(method.id)).toBeDefined();
  });

  it('deletes a payment method with no linked expenses', async () => {
    const method = await paymentMethodRepository.create({
      name: 'Unused Card',
      type: 'credit_card',
      color: '#000000',
      status: 'active',
    });
    await paymentMethodRepository.deleteIfUnused(method.id);
    expect(await paymentMethodRepository.getById(method.id)).toBeUndefined();
  });
});
