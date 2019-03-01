import {useState, useRef, useCallback, useMemo} from 'react';
import {callAll, noop, getElementHeight, makeTransitionStyles} from './utils';
import {useUniqueId, useLayoutEffectAfterMount, useStateOrProps} from './hooks';
import RAF from 'raf';

export function useCollapse(initialConfig = {}) {
  const uniqueId = useUniqueId();
  const el = useRef(null);
  const [isOpen, setOpen] = useStateOrProps(initialConfig);
  const [shouldAnimateOpen, setShouldAnimateOpen] = useState(null);
  const [heightAtTransition, setHeightAtTransition] = useState('0');
  const [styles, setStyles] = useState(
    isOpen ? null : {display: 'none', height: '0px'}
  );
  const [mountChildren, setMountChildren] = useState(isOpen);

  const {expandStyles, collapseStyles} = useMemo(
    () => makeTransitionStyles(initialConfig),
    [initialConfig.expandStyles, initialConfig.collapseStyles]
  );

  useLayoutEffectAfterMount(() => {
    if (isOpen) {
      setMountChildren(true);
      setStyles(styles => ({
        ...styles,
        ...expandStyles,
        display: 'block',
        overflow: 'hidden',
      }));
      setShouldAnimateOpen(true);
    } else {
      const height = getElementHeight(el);
      setStyles(styles => ({...styles, ...collapseStyles, height}));
      setShouldAnimateOpen(false);
    }
  }, [isOpen]);

  useLayoutEffectAfterMount(() => {
    const height = getElementHeight(el);
    if (shouldAnimateOpen) {
      setStyles(styles => ({...styles, height}));
      setHeightAtTransition(height);
    } else {
      // RAF required to transition, otherwise will flash closed
      RAF(() => {
        setStyles(styles => ({
          ...styles,
          height: '0px',
          overflow: 'hidden',
        }));
        setHeightAtTransition(height);
      });
    }
  }, [shouldAnimateOpen]);

  const handleTransitionEnd = () => {
    const height = getElementHeight(el);
    if (isOpen && height !== heightAtTransition) {
      setHeightAtTransition(height);
      setStyles(styles => ({...styles, height}));
      return;
    }

    if (isOpen) {
      setStyles({});
    } else {
      setMountChildren(false);
      setStyles({
        display: 'none',
        height: '0px',
      });
    }
  };

  const toggleOpen = useCallback(() => setOpen(oldOpen => !oldOpen), []);

  return {
    getToggleProps(
      {disabled, onClick, ...rest} = {
        disabled: false,
        onClick: noop,
      }
    ) {
      return {
        type: 'button',
        role: 'button',
        id: `react-collapsed-toggle-${uniqueId}`,
        'aria-controls': `react-collapsed-panel-${uniqueId}`,
        'aria-expanded': isOpen ? 'true' : 'false',
        tabIndex: 0,
        ...rest,
        onClick: disabled ? noop : callAll(onClick, toggleOpen),
      };
    },
    getCollapseProps(
      {style, onTransitionEnd, ...rest} = {style: {}, onTransitionEnd: noop}
    ) {
      return {
        id: `react-collapsed-panel-${uniqueId}`,
        'aria-hidden': isOpen ? null : 'true',
        ...rest,
        ref: el,
        onTransitionEnd: callAll(handleTransitionEnd, onTransitionEnd),
        style: {
          // style from argument
          ...style,
          // styles from state
          ...styles,
        },
      };
    },
    isOpen,
    toggleOpen,
    mountChildren,
  };
}
