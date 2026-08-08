/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("gl-canvas");
const gl = canvas.getContext("webgl2");

class Texture {
    constructor(width, height, fill=0) {
        this.width = width;
        this.height = height;

        const pixels = new Uint8Array(width * height);
        if (fill != 0) {
            for (let i = 0; i < width * height; i++) {
                if (Math.random() < fill) {
                    pixels[i] = 255;
                }
            }
        }

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.R8,
            width,
            height,
            0,
            gl.RED,
            gl.UNSIGNED_BYTE,
            pixels
        );

        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    bindTexture() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }

    renderTo() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, this.width, this.height);
    }
}

class Shader {
    constructor(vertexSource, fragmentSource) {
        const vertex = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertex, vertexSource);
        gl.compileShader(vertex);

        const vertexLog = gl.getShaderInfoLog(vertex);
        if (vertexLog) {
            alert(vertexLog);
        }

        const fragment = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragment, fragmentSource);
        gl.compileShader(fragment);

        const fragmentLog = gl.getShaderInfoLog(fragment);
        if (fragmentLog) {
            alert(fragmentLog);
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertex);
        gl.attachShader(this.program, fragment);
        gl.linkProgram(this.program);

        const programLog = gl.getProgramInfoLog(this.program);
        if (programLog) {
            alert(programLog);
        }

        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
    }

    use() {
        gl.useProgram(this.program);
    }

    location(name) {
        return gl.getUniformLocation(this.program, name);
    }
}

const vertices = new Float32Array([
    -1.0, -1.0, 0.0,
    1.0,-1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0,-1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0
]);

async function main() {
    if (gl == null) {
        alert("Unable to initialize WebGL");
        return;
    }

    const vbo = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bindVertexArray(vao);

    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * vertices.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(0);

    const vertexResponse = await fetch("vertex.glsl");
    const vertexSource = await vertexResponse.text();
    const renderFragResponse = await fetch("frag_render.glsl");
    const renderFragSource = await renderFragResponse.text();
    const logicFragResponse = await fetch("frag_logic.glsl");
    const logicFragSource = await logicFragResponse.text();

    const renderShader = new Shader(vertexSource, renderFragSource);
    const logicShader = new Shader(vertexSource, logicFragSource);

    let front = new Texture(800, 500);
    let back = new Texture(800, 500, 0.4);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderShader.use();
    gl.uniform1i(renderShader.location("uTexture"), 0);
    logicShader.use();
    gl.uniform1i(logicShader.location("uTexture"), 0);
    gl.uniform2f(logicShader.location("screenSize"), 800, 500);

    function renderFrame() {
        logicShader.use();
        back.bindTexture();
        front.renderTo();
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        renderShader.use();
        front.bindTexture();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        let temp = front;
        front = back;
        back = temp;

        requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
}

function renderFrame() {
}

await main();
