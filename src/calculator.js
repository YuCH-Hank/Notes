// src/calculator.js
// 所有計算公式的核心邏輯

import { Pipe_Area_Set_m2, Pipe_Diameter_Set_mm } from "./defines.js";

/**
 * 風量 + 風速 => 需求截面積
 * airVolume: CMM
 * airSpeed: m/s
 */
export function calculateArea(airVolume, airSpeed) {
  return airVolume / 60 / airSpeed;
}

/**
 * 累積和：例如 [10, 20, 30] => [10, 30, 60]
 */
export function cumulativeSum(list) {
  let total = 0;
  return list.map((n) => (total += n));
}

/**
 * 由需求面積推薦最合適的標準管徑
 */
export function getRecommendDiameter(area) {
  if (area <= Pipe_Area_Set_m2[0]) {
    return { diameter: Pipe_Diameter_Set_mm[0], area: Pipe_Area_Set_m2[0] };
  }

  for (let i = 1; i < Pipe_Area_Set_m2.length; i++) {
    if (Pipe_Area_Set_m2[i] >= area) {
      return { diameter: Pipe_Diameter_Set_mm[i], area: Pipe_Area_Set_m2[i] };
    }
  }

  // 超出最大管徑 → 回傳最大值
  const last = Pipe_Area_Set_m2.length - 1;
  return {
    diameter: Pipe_Diameter_Set_mm[last],
    area: Pipe_Area_Set_m2[last],
  };
}
