import { useEffect, type RefObject } from 'react';

import { Camera } from '../core/camera';

interface UseTouchControlsOptions {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    cameraRef: RefObject<Camera>;
    render: () => void;
}

export function useTouchControls({ canvasRef, cameraRef, render }: UseTouchControlsOptions) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let lastTouchX = 0, lastTouchY = 0;
        let lastTouchDistance = 0;
        let isTouchDragging = false;

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                isTouchDragging = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                lastTouchDistance = Camera.getTouchDistance(e.touches);
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            const dpr = window.devicePixelRatio || 1;

            if (e.touches.length === 1 && isTouchDragging) {
                const dx = (e.touches[0].clientX - lastTouchX) * dpr;
                const dy = (e.touches[0].clientY - lastTouchY) * dpr;

                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;

                cameraRef.current.applyPan(dx, -dy);
                render();
            } else if (e.touches.length === 2) {
                const newDistance = Camera.getTouchDistance(e.touches);
                const delta = newDistance - lastTouchDistance;

                if (Math.abs(delta) > 2) {
                    const mid = Camera.getTouchMidpoint(e.touches);
                    const rect = canvas.getBoundingClientRect();
                    const x = (mid.x - rect.left) * dpr;
                    const y = (mid.y - rect.top) * dpr;

                    const dx = x - canvas.width / 2 - cameraRef.current.x;
                    const dy = y - canvas.height / 2 + cameraRef.current.y;

                    cameraRef.current.applyZoom(delta, dx, dy);
                    lastTouchDistance = newDistance;
                    render();
                }
            }
        };

        const onTouchEnd = () => {
            isTouchDragging = false;
        };

        const preventScroll = (e: TouchEvent) => {
            if (e.target === canvas) {
                e.preventDefault();
            }
        };

        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
        document.body.addEventListener('touchmove', preventScroll, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            document.body.removeEventListener('touchmove', preventScroll);
        };
    }, [canvasRef, cameraRef, render]);
}