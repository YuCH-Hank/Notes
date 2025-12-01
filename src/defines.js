// src/defines.js
// 單位換算表 / 管徑列表 / 面積資料

// 長度單位轉成「公尺」
export const Unit_Length = {
  公尺: 1,
  公分: 0.01,
  毫米: 0.001,
};

// 風速單位轉成「m/s」
export const Unit_AirSpeed = {
  "m/s": 1,
  "km/h": 0.277778,
  "ft/s": 0.3048,
};

// 風量單位轉成 CMM
export const Unit_AirVolume = {
  CMM: 1,
  CFM: 1.69901,
};

// 標準圓管管徑（mm）
export const Pipe_Diameter_Set_mm = [
  50, 80, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400,
  1450, 1500, 1550, 1600,
];

// 將管徑換算成「面積 m²」
export const Pipe_Area_Set_m2 = Pipe_Diameter_Set_mm.map((d) => {
  const r = d / 2 / 1000; // mm -> m，再 /2
  return r * r * Math.PI;
});
