import {type RefObject, useEffect, useState} from "react";

import {Camera} from "../../core/camera.ts";

import {Editable} from "../editable";

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

    const updateX = (value: number) => {
        props.cameraRef.current.x = value * cameraInfoState.zoom;
    }
    const updateY = (value: number) => {
        props.cameraRef.current.y = value * cameraInfoState.zoom;
    }
    const updateZoom = (value: number) => {
        if (value < 1.0) {
            value = 1.0;
        }
        props.cameraRef.current.zoom = value;
    }

    return (
        <div className="camera-info">
            <Editable className="camera-info-row"
                      label={"X"}
                      value={x}
                      updateValue={updateX}></Editable>
            <Editable className="camera-info-row"
                      label={"Y"}
                      value={y}
                      updateValue={updateY}></Editable>
            <Editable className="camera-info-row"
                      label={"Zoom"}
                      value={zoom}
                      updateValue={updateZoom}></Editable>
        </div>
    );
}

export default CameraInfo;
