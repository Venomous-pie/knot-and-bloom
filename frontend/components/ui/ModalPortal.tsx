/**
 * ModalPortal — renders children into document.body on web so that
 * overlays/modals cover the full viewport, including sidebars that live
 * outside the current React subtree.
 *
 * On native (iOS/Android) it simply renders children inline, since
 * stacking contexts are not a concern there.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

let createPortal: ((children: React.ReactNode, container: Element) => React.ReactNode) | null = null;

if (Platform.OS === 'web') {
    // Lazy-require so this module is never evaluated on native
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createPortal = require('react-dom').createPortal;
}

interface ModalPortalProps {
    children: React.ReactNode;
}

export default function ModalPortal({ children }: ModalPortalProps) {
    const [mounted, setMounted] = useState(false);
    const portalRoot = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const div = document.createElement('div');
        div.id = 'modal-portal';
        document.body.appendChild(div);
        portalRoot.current = div;
        setMounted(true);
        return () => {
            if (document.body.contains(div)) {
                document.body.removeChild(div);
            }
        };
    }, []);

    if (Platform.OS !== 'web') {
        // Native: render inline — position absolute works fine there
        return <>{children}</>;
    }

    if (!mounted || !portalRoot.current || !createPortal) return null;

    return createPortal(children, portalRoot.current) as React.ReactElement;
}
