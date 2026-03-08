varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocalFragPos;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Bright directional light from top-right-front
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
  float diffuse = max(dot(normal, lightDir), 0.0);
  
  // Rim light to help define edges
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
  
  // High ambient for visibility
  float ambient = 0.6;
  
  // Combine components - scale up for brightness
  float lighting = (diffuse * 0.8 + ambient + rim * 0.3);
  vec3 baseColor = vColor * lighting;

  // Simple Gamma Correction
  baseColor = pow(baseColor, vec3(1.0 / 1.5));

  // Sharp black borders for "sticker" look
  vec3 dist = abs(vLocalFragPos);
  float edgeMask = 1.0;
  
  if (vColor.r > 0.05 || vColor.g > 0.05 || vColor.b > 0.05) {
      if (max(max(dist.x, dist.y), dist.z) > 4.75) {
          edgeMask = 0.05; 
      }
  }

  gl_FragColor = vec4(baseColor * edgeMask, 1.0);
}
