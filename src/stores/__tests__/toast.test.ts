import { act } from '@testing-library/react-native';

import { toast, useToastStore } from '../toast';

describe('toast store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows and auto-dismisses', () => {
    act(() => toast.success('Saved', 'Your store was updated.'));
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0]?.variant).toBe('success');

    act(() => jest.advanceTimersByTime(3600));
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('caps the visible stack at three', () => {
    act(() => {
      toast.info('one');
      toast.info('two');
      toast.info('three');
      toast.info('four');
    });
    const titles = useToastStore.getState().toasts.map((t) => t.title);
    expect(titles).toEqual(['two', 'three', 'four']);
  });

  it('dismisses a specific toast', () => {
    act(() => {
      toast.error('boom');
      toast.info('keep me');
    });
    const first = useToastStore.getState().toasts[0];
    act(() => useToastStore.getState().dismiss(first!.id));
    expect(useToastStore.getState().toasts.map((t) => t.title)).toEqual(['keep me']);
  });
});
