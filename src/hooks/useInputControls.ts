import type {RefObject} from 'react';

import { Camera } from '../core/camera';

import { useDesktopControls } from './useDesktopControls';
import { useTouchControls } from './useTouchControls';

interface UseInputControlsOptions {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    cameraRef: RefObject<Camera>;
    render: () => void;
}

export function useInputControls(options: UseInputControlsOptions) {
    useDesktopControls(options);
    useTouchControls(options);
}