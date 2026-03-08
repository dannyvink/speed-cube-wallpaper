varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocalFragPos;
varying float vFaceIdx;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  vec3 light1Dir = normalize(vec3(0.5, 1.0, 0.7));
  vec3 light2Dir = normalize(vec3(-0.5, -0.5, 0.5));
  
  float diffuse1 = max(dot(normal, light1Dir), 0.0);
  float diffuse2 = max(dot(normal, light2Dir), 0.0);
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
  float ambient = 0.5;
  
  float lighting = (diffuse1 * 0.7 + diffuse2 * 0.3 + ambient + rim * 0.2);
  vec3 baseColor = vColor * lighting;
  baseColor = pow(baseColor, vec3(1.0 / 1.8));

  // Anti-aliased Edge Shading
  int faceIdx = int(vFaceIdx + 0.5);
  float edgeMask = 1.0;
  float limit = 4.7; 
  float blur = 0.1; // Width of the transition in world space
  
  if (vColor.r > 0.06 || vColor.g > 0.06 || vColor.b > 0.06) {
      float m = 0.0;
      if (faceIdx == 0 || faceIdx == 1) { // X-face
          m = max(smoothstep(limit - blur, limit + blur, abs(vLocalFragPos.y)),
                  smoothstep(limit - blur, limit + blur, abs(vLocalFragPos.z)));
      } else if (faceIdx == 2 || faceIdx == 3) { // Y-face
          m = max(smoothstep(limit - blur, limit + blur, abs(vLocalFragPos.x)),
                  smoothstep(limit - blur, limit + blur, abs(vLocalFragPos.z)));
      } else { // Z-face
          m = max(smoothstep(limit - blur, limit + blur, abs(vLocalFragPos.x)),
                  smoothstep(limit - blur, limit + blur, abs(vLocalFragPos.y)));
      }
      edgeMask = mix(1.0, 0.05, m);
  }

  gl_FragColor = vec4(baseColor * edgeMask, 1.0);
}
