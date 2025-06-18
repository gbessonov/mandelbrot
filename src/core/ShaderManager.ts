// ShaderManager.ts

export interface ShaderContext {
    program: WebGLProgram;
    uniforms: {
        uResolution: WebGLUniformLocation;
        uCenterX: WebGLUniformLocation;
        uCenterY: WebGLUniformLocation;
        uZoom: WebGLUniformLocation;
    };
}

export class ShaderManager {
    private gl: WebGL2RenderingContext;
    private shaders: { minZoom: number; maxZoom: number; context: ShaderContext }[] = [];

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.createFullscreenTriangle();
    }

    private createFullscreenTriangle(): WebGLBuffer {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1,
        ]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        return buffer;
    }

    public registerShader(minZoom: number, maxZoom: number, vertexSrc: string, fragmentSrc: string): void {
        const program = this.gl.createProgram();
        if (!program) throw new Error("Failed to create shader program");

        const vs = this.compile(this.gl.VERTEX_SHADER, vertexSrc);
        const fs = this.compile(this.gl.FRAGMENT_SHADER, fragmentSrc);
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error("Shader link failed: " + this.gl.getProgramInfoLog(program));
        }

        const getUniform = (name: string) => {
            const loc = this.gl.getUniformLocation(program, name);
            if (!loc) throw new Error(`Uniform not found: ${name}`);
            return loc;
        };

        const uniforms = {
            uResolution: getUniform("u_resolution"),
            uCenterX: getUniform("u_center_x"),
            uCenterY: getUniform("u_center_y"),
            uZoom: getUniform("u_zoom"),
        };

        this.shaders.push({ minZoom, maxZoom, context: { program, uniforms } });
    }

    private compile(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) throw new Error("Failed to create shader");
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error("Shader compile error: " + this.gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    public getShaderContext(zoom: number): ShaderContext {
        for (const s of this.shaders) {
            if (zoom >= s.minZoom && zoom <= s.maxZoom) {
                return s.context;
            }
        }
        // fallback to last
        return this.shaders[this.shaders.length - 1].context;
    }
}
