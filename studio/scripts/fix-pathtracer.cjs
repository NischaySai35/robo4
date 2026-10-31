// three-gpu-pathtracer 0.0.27 still calls three's renamed Source class, which logs a deprecation
// warning. Runs after every install. Delete this file once a new pathtracer release fixes it.
const fs = require('node:fs');

const file = 'node_modules/three-gpu-pathtracer/src/uniforms/EquirectHdrInfoUniform.js';
const code = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, code.replace(/\bSource\b/g, 'TextureSource'));
