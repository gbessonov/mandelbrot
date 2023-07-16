const vs_source = /*glsl*/`
	precision highp float;

	attribute vec2 a_position;

	void main() {
		gl_Position = vec4(a_position.xy, 0.0, 1.0);
	}
`;

const fs_source = /*glsl*/`
	precision highp float;

	uniform vec2 u_resolution;
	uniform float u_zoom;
	uniform vec2 u_center;

	vec2 f(vec2 x, vec2 c) {
		return mat2(x, -x.y, x.x) * x + c;
	}
	vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
		return a + b*cos(6.28318 * (c * t + d));
	}
	void main() {
		vec2 c = (gl_FragCoord.xy - u_resolution / 2.0 - u_center) / u_zoom;
		vec2 x = vec2(0.0);
		bool escaped = false;
		int iterations = 0;
		for (int i = 0; i < 100; i++) {
			iterations = i;
			x = f(x, c);
			if (length(x) > 2.0) {
				escaped = true;
				break;
			}
		}
		gl_FragColor = escaped ? vec4(palette(float(iterations)/float(100), vec3(0.0),vec3(0.59,0.55,0.75),vec3(0.1, 0.2, 0.3),vec3(0.75)),1.0) : vec4(vec3(0.85, 0.99, 1.0), 1.0);
	}
`;

function main() {
	const canvas = document.createElement("canvas");
	const gl = canvas.getContext("webgl");
	if (!gl) {
		return;
	}

	canvas.classList.add("full")
	document.body.append(canvas)

	const vs = compileShader(gl, vs_source, gl.VERTEX_SHADER);
	const fs = compileShader(gl, fs_source, gl.FRAGMENT_SHADER);

	const program = createProgram(gl, [vs, fs]);
	gl.useProgram(program);

	const zoomSpeed = 1.1;
	let zoomLog = 0;
	const moveSpeed = 5;
	let center_x = 0;
	let center_y = 0;

	const _redraw = () => {
		console.log(`center: ${center_x}:${center_y}, zoomLog: ${zoomLog}`);
		render(gl, program, 300 * Math.pow(zoomSpeed, zoomLog), center_x, center_y);
	}
	/**
	 * Renders the scene by calling `render` function with all necessary parameters provided
	 */
	const redraw = () => {
		window.requestAnimationFrame(_redraw);
	}
	// Begin animation loop 
	redraw();

	window.addEventListener("resize", () => {
		if(resizeCanvasToDisplaySize(gl.canvas)){
			redraw();
		}
	});

	document.addEventListener("wheel", (event) => {
		if (event.deltaY == 0){
			return;
		}
		const dx = event.clientX - gl.canvas.clientWidth / 2 - center_x;
		const dy = event.clientY - gl.canvas.clientHeight / 2 + center_y;
		if (event.deltaY < 0){
			zoomLog += 1;
			const k = zoomSpeed - 1;
			center_x -= k * dx;
			center_y += k * dy;
		} else {
			zoomLog -= 1;
			const k = 1 - 1 / zoomSpeed;
			center_x += k * dx;
			center_y -= k * dy;
		}

		redraw();
	});

	let moving = false;
	document.addEventListener("mousedown", (event) => {
		event.preventDefault();

		if (event.button !== 0){
			return;
		}
		moving = true;
	});
	document.addEventListener("mouseup", (event) => {
		event.preventDefault();

		if (event.button !== 0){
			return;
		}
		moving = false;
	});
	document.addEventListener("mousemove", (event) => {
		event.preventDefault();

		if(!moving){
			return;
		}
		// consider using clientX functions,
		// however using them will require storing additional data
		center_x += event.movementX;
		center_y -= event.movementY;

		redraw()
	})

	document.addEventListener("keydown", (event) => {
		// Some bug in Firefox since 65
		// Bug: https://bugzil.la/354358
		// Workaround: https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
		if (event.isComposing || event.keyCode === 229) {
			return;
		}

		switch(event.key){
			case "ArrowUp": center_y += moveSpeed; break;
			case "ArrowDown": center_y -= moveSpeed; break;

			case "ArrowLeft": center_x -= moveSpeed; break;
			case "ArrowRight": center_x += moveSpeed; break;

			case "PageUp": zoomLog += 1; break;
			case "PageDown": zoomLog -= 1; break;
		}

		redraw();
	});
}

/**
 * Renders the scene
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {!WebGLProgram} program The WebGL program
 * @param {number} zoom zoom, e.g. zoom 100 means hundred pixels per unit
 * @param {number} center_x x coordinate of the image center
 * @param {number} center_y y coordinate of the image center
 */
function render(gl, program, zoom, center_x, center_y) {
	resizeCanvasToDisplaySize(gl.canvas);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
	gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

	const zoomLocation = gl.getUniformLocation(program, "u_zoom");
	gl.uniform1f(zoomLocation, zoom);

	const centerLocation = gl.getUniformLocation(program, "u_center");
	gl.uniform2f(centerLocation, center_x, center_y)

	{
		const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

		gl.enableVertexAttribArray(positionAttributeLocation);

		gl.vertexAttribPointer(
				positionAttributeLocation,
				2,          // 2 components per iteration
				gl.FLOAT,   // the data is 32bit floats
				false,      // don't normalize the data
				0,          // 0 = move forward size * sizeof(type) each iteration to get the next position
				0,          // start at the beginning of the buffer
		);
	}

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1,  // first triangle
		1, -1,
		-1,  1,
		-1,  1,  // second triangle
		1, -1,
		1,  1,
	]), gl.STATIC_DRAW);
	gl.drawArrays(
			gl.TRIANGLES,
			0,     // offset
			6,     // num vertices to process
	);
}

/**
 * Creates and compiles a shader.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} shaderSource The GLSL source code for the shader.
 * @param {GLenum} shaderType The type of shader, VERTEX_SHADER or FRAGMENT_SHADER.
 * @return {!WebGLShader} The shader.
 */
function compileShader(gl, shaderSource, shaderType) {
	var shader = gl.createShader(shaderType);

	gl.shaderSource(shader, shaderSource);

	gl.compileShader(shader);

	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!success) {
		throw "could not compile shader:" + gl.getShaderInfoLog(shader);
	}

	return shader;
}

/**
* Creates a program from 2 shaders.
*
* @param {!WebGLRenderingContext} gl The WebGL context.
* @param {!WebGLShader[]} shaders A set of shaders.
* @return {!WebGLProgram} A program.
*/
function createProgram(gl, shaders) {
	var program = gl.createProgram();

	for(const shader of shaders){
		gl.attachShader(program, shader);
	}

	gl.linkProgram(program);

	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		throw ("program failed to link:" + gl.getProgramInfoLog (program));
	}

	return program;
};

/**
* Resize a canvas to match the size its displayed.
* @param {HTMLCanvasElement} canvas The canvas to resize.
* @param {number} [multiplier] amount to multiply by.
*    Pass in window.devicePixelRatio for native pixels.
* @return {boolean} true if the canvas was resized.
*/
function resizeCanvasToDisplaySize(canvas, multiplier) {
	multiplier = multiplier || 1;
	const width  = canvas.clientWidth  * multiplier | 0;
	const height = canvas.clientHeight * multiplier | 0;
	if (canvas.width !== width ||  canvas.height !== height) {
		canvas.width  = width;
		canvas.height = height;
		return true;
	}
	return false;
}

main();