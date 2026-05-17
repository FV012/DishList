import { useState, useCallback } from 'react';

export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (state) { state.resolve(true); setState(null); }
  };

  const handleCancel = () => {
    if (state) { state.resolve(false); setState(null); }
  };

  return { confirm, confirmState: state, handleConfirm, handleCancel };
}
