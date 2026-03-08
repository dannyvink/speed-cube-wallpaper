uniform vec3 palette[6];

attribute float aFaceId;
attribute float aCubieType;
attribute vec3 aInstancePos;
attribute vec3 aLocalPos;
attribute vec4 aQuatA;
attribute vec4 aQuatB;
attribute float aProgress;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocalFragPos;
varying float vFaceIdx;

vec3 rotate_vector(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

vec4 slerp(vec4 v0, vec4 v1, float t) {
    float dot_val = dot(v0, v1);
    if (dot_val < 0.0) { v1 = -v1; dot_val = -dot_val; }
    if (dot_val > 0.9995) return normalize(mix(v0, v1, t));
    float theta_0 = acos(dot_val);
    float theta = theta_0 * t;
    float sin_theta = sin(theta);
    float sin_theta_0 = sin(theta_0);
    float s0 = cos(theta) - dot_val * sin_theta / sin_theta_0;
    float s1 = sin_theta / sin_theta_0;
    return normalize((s0 * v0) + (s1 * v1));
}

void main() {
  int faceIdx = int(aFaceId);
  vFaceIdx = aFaceId;
  int typeMask = int(aCubieType);
  bool hasSticker = ((typeMask >> faceIdx) & 1) == 1;

  if (hasSticker) {
    vColor = palette[faceIdx];
  } else {
    vColor = vec3(0.05); // Plastic body
  }

  vec4 q = slerp(aQuatA, aQuatB, aProgress);

  vNormal = normalize(rotate_vector(q, normal));

  vec3 localOffset = aLocalPos * 10.0;
  vec3 pos = rotate_vector(q, position + localOffset);
  pos += aInstancePos;

  vLocalFragPos = position; 

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
