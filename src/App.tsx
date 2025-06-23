import { useCallback, useEffect, useRef } from 'react';

import { Camera } from './core/camera';
import { ShaderManager } from './core/ShaderManager';
import { useInputControls } from './hooks/useInputControls';
import CameraInfo from './components/cameraInfo/cameraInfo';

import vertexShaderSource from './shaders/vertexShader.glsl';
import fragmentShaderCommon from './shaders/fragmentShader_common.glsl';
import fragmentShader_tail_basic from './shaders/fragmentShader_tail_basic.glsl';
import fragmentShader_tail_df64 from './shaders/fragmentShader_tail_df64.glsl';

import './App.css';

const fragmentShaderSource_basic =`${fragmentShaderCommon}
${fragmentShader_tail_basic}`;

const fragmentShaderSource_df64 = `${fragmentShaderCommon}
${fragmentShader_tail_df64}`;

function splitFloat64(value: number): [number, number] {
    const high = Math.fround(value);
    const low = value - high;
    return [high, low];
}

const DEBOUNCE_DELAY = 100; // ms

const App = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const cameraRef = useRef<Camera>(new Camera(50, 0, 310));
    const animationId = useRef<number | null>(null);
    const shaderManagerRef = useRef<ShaderManager | null>(null);
    const debounceTimerRef = useRef<number | null>(null);
    const lastRenderParamsRef = useRef<{ zoom: number; x: number; y: number } | null>(null);

    const renderNow = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !shaderManagerRef.current) return;

        const gl = canvas.getContext('webgl2');
        if (!gl) return;

        const { zoom, x, y } = cameraRef.current;

        const last = lastRenderParamsRef.current;
        if (last && last.zoom === zoom && last.x === x && last.y === y) {
            return; // Skip rendering if nothing changed
        }

        lastRenderParamsRef.current = { zoom, x, y };

        gl.clearColor(0, 0, 0, 1);
        const shader = shaderManagerRef.current.getShaderContext(zoom);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(shader.program);

        gl.uniform2f(shader.uniforms.uResolution, canvas.width, canvas.height);
        gl.uniform1f(shader.uniforms.uZoom, zoom);
        gl.uniform2f(shader.uniforms.uCenterX, ...splitFloat64(x));
        gl.uniform2f(shader.uniforms.uCenterY, ...splitFloat64(y));

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }, []);

    const debouncedRender = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            renderNow();
        }, DEBOUNCE_DELAY);
    }, [renderNow]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            lastRenderParamsRef.current = null; // invalidate cache
            debouncedRender();
        };

        resizeCanvas();

        const gl = canvas.getContext('webgl2');
        if (!gl) throw new Error('WebGL2 not supported');

        canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost');
        });

        const shaderManager = new ShaderManager(gl);
        const df64_threshold = 1e7;
        shaderManager.registerShader(0, df64_threshold, vertexShaderSource, fragmentShaderSource_basic);
        shaderManager.registerShader(df64_threshold, 1e10, vertexShaderSource, fragmentShaderSource_df64);

        shaderManagerRef.current = shaderManager;

        const setupVertexAttribs = (program: WebGLProgram) => {
            const aPosition = gl.getAttribLocation(program, 'a_position');
            gl.enableVertexAttribArray(aPosition);
            gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
        };

        setupVertexAttribs(shaderManager.getShaderContext(cameraRef.current.zoom).program);

        const loop = () => {
            renderNow();
            animationId.current = requestAnimationFrame(loop);
        };

        animationId.current = requestAnimationFrame(loop);

        window.addEventListener('resize', resizeCanvas);

        return () => {
            if (animationId.current !== null) cancelAnimationFrame(animationId.current);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [renderNow, debouncedRender]);

    useInputControls({
        canvasRef,
        cameraRef,
        render: debouncedRender,
    });

    return (
        <>
            <canvas className="main-canvas" ref={canvasRef} />
            <CameraInfo cameraRef={cameraRef} />
        </>
    );
};

export default App;
