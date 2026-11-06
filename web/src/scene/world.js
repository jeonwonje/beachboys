// The beach. One big plane carries sand, wet band, swash, shallows and sea in a
// single shader, so the shoreline can move without any geometry changing.
import * as THREE from 'three';

export const SHORE_Z = 8.4; // mean waterline. +z is out to sea.
export const PATH_Z = 5; // the wet band the rover works along.

const NOISE = /* glsl */ `
  float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
`;

// Time of day along the scroll, from dawn through bright morning to dusk.
export const PALETTES = {
  dawn: { top: '#3a5f96', horizon: '#ffc79a', sun: '#ffd2a1', sunI: 2.6, hemi: 0.75, az: 32, el: 8, sea: '#2a7f97', env: 0.6 },
  morning: { top: '#2a6fb3', horizon: '#d8e9ee', sun: '#fff0d8', sunI: 3.0, hemi: 1.05, az: 58, el: 38, sea: '#14808f', env: 0.9 },
  noon: { top: '#1f6cbc', horizon: '#dcecf2', sun: '#fff8ec', sunI: 3.2, hemi: 1.15, az: 80, el: 58, sea: '#0f8796', env: 1.0 },
  dusk: { top: '#1c2a59', horizon: '#f58a5c', sun: '#ffb27a', sunI: 2.4, hemi: 0.6, az: 112, el: 6, sea: '#2c5a79', env: 0.5 },
};

function makeSky(uniforms) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 p = projectionMatrix * mat4(mat3(modelViewMatrix)) * vec4(position,1.);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uTop, uHorizon, uSunColor, uSunDir; uniform float uTime;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y,0.,1.);
        vec3 col = mix(uHorizon,uTop,pow(h,.42));
        float s = max(dot(d,uSunDir),0.);
        col += uSunColor*(pow(s,6.)*.28 + pow(s,64.)*.45);
        col += uSunColor*smoothstep(.9992,.9997,s)*1.6;
        vec2 uv = d.xz/(d.y+.14)*1.1 + vec2(uTime*.004,0.);
        float c = smoothstep(.5,.82,fbm(uv*1.2)+.12*fbm(uv*5.));
        c *= smoothstep(.0,.16,d.y);
        vec3 cloud = mix(vec3(1.),uSunColor,.35) * (0.82+.25*s);
        col = mix(col,cloud,c*.72);
        gl_FragColor = vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

function makeGround(uniforms) {
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      uniform float uTime, uRoverX, uStartX, uShore, uPathZ, uHighlight;
      uniform vec3 uSunDir, uSunColor, uHorizon, uTop, uSea, uCam;
      ${NOISE}
      void main(){
        vec2 p = vW.xz;
        float dist = length(vW-uCam);

        // Swash: two slow waves running up and down an uneven beach.
        float edge = uShore + (fbm(vec2(p.x*.09,3.))-.5)*3.0;
        float swash = sin(uTime*.42 + p.x*.07 + fbm(vec2(p.x*.05,uTime*.03))*4.)*.9
                    + sin(uTime*.23 - p.x*.033)*.5;
        float line = edge + swash*.9 + (fbm(vec2(p.x*1.1,uTime*.2))-.5)*.5;
        float highWater = edge - 1.6;

        // Sand, with fine grain near the camera and ripples further up the beach.
        float grain = fbm(p*38.)*.5 + vnoise(p*170.)*.5;
        float ripple = sin((p.y + fbm(p*.5)*2.2)*17.)*.5+.5;
        float dunes = fbm(p*.42);
        vec3 dry = mix(vec3(.80,.68,.50),vec3(.93,.84,.68),dunes);
        dry *= .92 + .13*grain + .035*ripple*smoothstep(-2.,3.,highWater-p.y);
        vec3 wetSand = mix(vec3(.43,.35,.27),vec3(.56,.47,.36),dunes)*(.93+.12*grain);

        float wet = smoothstep(highWater-3.2,highWater+.5,p.y);
        wet = clamp(wet + .22*(fbm(p*.9)-.5),0.,1.);
        vec3 sand = mix(dry,wetSand,wet);

        // Wet sand holds a thin sheen of sky.
        vec3 V = normalize(uCam-vW);
        float fres = pow(1.-max(V.y,0.),3.);
        vec3 sky = mix(uHorizon,uTop,.25);
        sand = mix(sand,sky,wet*(.10+.38*fres));
        vec3 H = normalize(V+uSunDir);
        sand += uSunColor*wet*pow(max(H.y,0.),90.)*.5;

        // Faint high-tide wrack line.
        float wrack = smoothstep(.42,.0,abs(p.y-(highWater-3.)-fbm(p*.4)*1.2))*(.5+.5*vnoise(p*7.));
        sand = mix(sand,sand*.74,wrack*.5);

        // Wheel tracks behind the rover: two lugged strips.
        if(p.x<uRoverX-.1 && p.x>uStartX-.2){
          float tz = abs(abs(p.y-uPathZ)-.27);
          float tread = .72+.28*step(.5,fract(p.x*7.+abs(p.y-uPathZ)*6.));
          float t = smoothstep(.095,.07,tz);
          sand = mix(sand,sand*.70*tread,t);
          float swept = smoothstep(.2,.17,abs(p.y-uPathZ));
          sand = mix(sand,sand*(.96+.05*vnoise(p*vec2(30.,90.))),swept*.8);
        }
        // Soft highlight of the wet band, used by the problem chapter.
        float band = smoothstep(.3,.0,abs(p.y-(line-3.3))-2.3);
        sand = mix(sand,sand+vec3(.20,.09,.0),band*uHighlight*.55);

        // Water.
        float d = p.y-line;
        float depth = clamp(d/16.,0.,1.);
        vec2 w = p*.32 + vec2(uTime*.05,uTime*.09);
        vec2 w2 = p*1.1 - vec2(uTime*.08,uTime*.05);
        float wv = fbm(w)*.6+fbm(w2)*.4;
        vec3 nrm = normalize(vec3((fbm(w+vec2(.05,0.))-fbm(w))*3.,1.,(fbm(w+vec2(0.,.05))-fbm(w))*3.));
        float wf = pow(1.-max(dot(V,nrm),0.),4.);
        vec3 shallow = mix(uSea*1.3+vec3(.04,.17,.13),wetSand,.22);
        vec3 water = mix(shallow,uSea,smoothstep(0.,.45,depth));
        water = mix(water,mix(uHorizon,uTop,.55),clamp(wf*.8+.04,0.,.6));
        float glint = pow(max(dot(reflect(-uSunDir,nrm),V),0.),170.);
        water += uSunColor*glint*(1.2+wv);

        vec3 col;
        float waterMask = smoothstep(-.04,.09,d);
        col = mix(sand,water,waterMask);

        // Foam at the edge, plus broken lines just offshore.
        float fn = fbm(p*vec2(1.7,3.)+vec2(0.,uTime*.12));
        float foam = smoothstep(.34,.0,abs(d-.04))*smoothstep(.22,.62,fn+.2);
        float lace = smoothstep(.55,.72,fbm(p*vec2(2.6,4.2)-vec2(uTime*.06,uTime*.1)))*smoothstep(2.4,.2,d)*step(0.,d);
        float swell = smoothstep(.05,.0,abs(fract(d*.14-uTime*.035)-.5)-.01)*smoothstep(14.,1.,d)*step(.3,d)*smoothstep(.5,.72,fn);
        col = mix(col,vec3(.97,.98,.96),clamp(foam*.95+lace*.45+swell*.28,0.,1.));

        // Light.
        float lit = .78 + .32*max(uSunDir.y,0.);
        col *= mix(vec3(1.),uSunColor,.22)*lit;

        // Air.
        float fog = 1.-exp(-pow(dist*.0052,1.5));
        col = mix(col,uHorizon,clamp(fog,0.,1.));
        gl_FragColor = vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), mat);
  mesh.frustumCulled = false;
  return mesh;
}

// Silhouettes on the horizon: islands, and the ships that are always anchored
// off Singapore's south coast. Pure shapes, tinted with the haze.
function makeHorizon() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#7f97a5', fog: false });
  const islandShape = (w, h, seed) => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    const n = 18;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const env = Math.sin(t * Math.PI) ** 0.6;
      const y = h * env * (0.72 + 0.28 * Math.sin(t * 19 + seed) * Math.sin(t * 7 + seed * 2));
      s.lineTo(-w / 2 + w * t, y);
    }
    s.lineTo(w / 2, 0);
    return new THREE.ShapeGeometry(s);
  };
  const add = (g, x, z, c) => {
    const m = new THREE.Mesh(g, c ? mat.clone() : mat);
    if (c) m.material.color.set(c);
    m.position.set(x, 0, z);
    m.rotation.y = Math.PI;
    group.add(m);
  };
  add(islandShape(190, 15, 1), -200, 620);
  add(islandShape(120, 9, 2.4), 70, 700);
  add(islandShape(260, 20, 4), 330, 660);
  add(islandShape(80, 6, 7), 560, 720);
  // Anchored ships.
  const ship = (L, H) => {
    const s = new THREE.Shape();
    s.moveTo(-L / 2, 0);
    s.lineTo(L / 2, 0);
    s.lineTo(L / 2 + L * 0.03, H * 0.42);
    s.lineTo(L * 0.34, H * 0.42);
    s.lineTo(L * 0.34, H);
    s.lineTo(L * 0.22, H);
    s.lineTo(L * 0.22, H * 0.42);
    s.lineTo(-L / 2 - L * 0.02, H * 0.42);
    return new THREE.ShapeGeometry(s);
  };
  add(ship(46, 7), -60, 430, '#5c7482');
  add(ship(30, 5), 150, 500, '#6d8493');
  add(ship(60, 9), 300, 390, '#566d7c');
  add(ship(24, 4), -320, 470, '#6d8493');
  group.userData.mat = mat;
  return group;
}

export function createWorld(scene) {
  const shared = {
    uTime: { value: 0 },
    uRoverX: { value: 0 },
    uStartX: { value: 0 },
    uShore: { value: SHORE_Z },
    uPathZ: { value: PATH_Z },
    uHighlight: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uSea: { value: new THREE.Color() },
    uCam: { value: new THREE.Vector3() },
  };

  const sky = makeSky(shared);
  const ground = makeGround(shared);
  const horizon = makeHorizon();
  scene.add(sky, ground, horizon);

  const hemi = new THREE.HemisphereLight('#ffffff', '#c9b28c', 1);
  const sun = new THREE.DirectionalLight('#ffffff', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 24 });
  scene.add(hemi, sun, sun.target);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.34, color: '#2a1d10' }),
  );
  shadowPlane.position.y = 0.002;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // Palettes are converted once, then blended every frame.
  const keys = {};
  for (const [name, p] of Object.entries(PALETTES)) {
    const az = THREE.MathUtils.degToRad(p.az);
    const el = THREE.MathUtils.degToRad(p.el);
    keys[name] = {
      top: new THREE.Color(p.top),
      horizon: new THREE.Color(p.horizon),
      sun: new THREE.Color(p.sun),
      sea: new THREE.Color(p.sea),
      sunI: p.sunI,
      hemi: p.hemi,
      env: p.env,
      dir: new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)),
    };
  }
  const ORDER = ['dawn', 'morning', 'noon', 'dusk'];
  const white = new THREE.Color('#ffffff');

  return {
    shared,
    sun,
    hemi,
    setTime(t) {
      // t runs 0 to 3 across the palette order.
      const i = Math.min(Math.floor(t), ORDER.length - 2);
      const f = THREE.MathUtils.clamp(t - i, 0, 1);
      const a = keys[ORDER[i]];
      const b = keys[ORDER[i + 1]];
      shared.uTop.value.copy(a.top).lerp(b.top, f);
      shared.uHorizon.value.copy(a.horizon).lerp(b.horizon, f);
      shared.uSunColor.value.copy(a.sun).lerp(b.sun, f);
      shared.uSea.value.copy(a.sea).lerp(b.sea, f);
      shared.uSunDir.value.copy(a.dir).lerp(b.dir, f).normalize();
      sun.color.copy(shared.uSunColor.value);
      sun.intensity = a.sunI + (b.sunI - a.sunI) * f;
      hemi.intensity = a.hemi + (b.hemi - a.hemi) * f;
      hemi.color.copy(shared.uTop.value).lerp(white, 0.55);
      scene.environmentIntensity = a.env + (b.env - a.env) * f;
      horizon.userData.mat.color.copy(shared.uHorizon.value).lerp(shared.uTop.value, 0.42);
    },
    update(time, cameraPos, focusX) {
      shared.uTime.value = time;
      shared.uCam.value.copy(cameraPos);
      sun.target.position.set(focusX, 0.3, PATH_Z);
      sun.position.copy(sun.target.position).addScaledVector(shared.uSunDir.value, 10);
      shadowPlane.position.x = focusX;
      shadowPlane.position.z = PATH_Z;
    },
  };
}
