import {type RefObject, useEffect, useState} from "react";

import {Camera} from "../../core/camera.ts";

interface CameraInfoProps {
    cameraRef: RefObject<Camera>;
}

class CameraInfoState {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;

    constructor(cameraRef: RefObject<Camera>) {
        this.x = cameraRef.current.x;
        this.y = cameraRef.current.y;
        this.zoom = cameraRef.current.zoom;
    }

    isTheSame(cameraRef: RefObject<Camera>): boolean {
        return (
            this.x == cameraRef.current.x &&
            this.y == cameraRef.current.y &&
            this.zoom == cameraRef.current.zoom
        )
    }
}

const formatNumberForDisplay = (value: number): string => {
    const absValue = Math.abs(value);

    if ((absValue !== 0 && absValue < 0.001) || absValue >= 1_000_000) {
        // Use scientific notation for very small or large values
        return value.toExponential(3); // 3 significant digits
    }

    if (absValue < 1) {
        return value.toFixed(5); // Up to 5 decimals for small non-zero values
    }

    if (absValue < 1000) {
        return value.toFixed(2); // 2 decimals for normal range
    }

    // Thousands range — round with no decimals
    return value.toFixed(0);
}

const CameraInfo = (props: CameraInfoProps) => {
    const [cameraInfoState, setCameraInfoState] = useState<CameraInfoState>(new CameraInfoState(
        props.cameraRef
    ));

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (cameraInfoState.isTheSame(props.cameraRef)) {
                return;
            }
            setCameraInfoState(new CameraInfoState(props.cameraRef));
        }, 50);

        return () => clearInterval(intervalId);
    })

    const x = cameraInfoState.x / cameraInfoState.zoom;
    const y = cameraInfoState.y / cameraInfoState.zoom;
    const zoom = formatNumberForDisplay(cameraInfoState.zoom);

    return (
        <div className="camera-info">
            <div className={"camera-info-row"}><strong>X:</strong> {x}</div>
            <div className={"camera-info-row"}><strong>Y:</strong> {y}</div>
            <div className={"camera-info-row"}><strong>Zoom:</strong> {zoom}</div>
        </div>
    );
}

export default CameraInfo;