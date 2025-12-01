// src/ui.js
// UI 行為：分頁、深色模式、輸入綁定、表格更新
import {
  Unit_AirVolume,
  Unit_AirSpeed,
  Unit_Length,
  Pipe_Diameter_Set_mm,
  Pipe_Area_Set_m2,
} from "./defines.js";

import {
  cumulativeSum,
  calculateArea,
  getRecommendDiameter,
} from "./calculator.js";

// --------------------------
// 共用小工具
// --------------------------

/** 字串 → 數字陣列，例如 "10 20,30" → [10, 20, 30] */
function parseNumberList(str) {
  if (!str.trim()) return [];
  return str
    .split(/[, ]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

/** 單位換算 */
function toUnit(value, unit, unitMap) {
  return value * (unitMap[unit] ?? 1);
}

// --------------------------
// 深色模式
// --------------------------
function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const saved = localStorage.getItem("theme");
  const initialDark = saved ? saved === "dark" : prefersDark;

  setTheme(initialDark);

  btn.addEventListener("click", () => {
    const nextDark = !document.body.classList.contains("dark");
    setTheme(nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  });

  function setTheme(dark) {
    document.body.classList.toggle("dark", dark);
    btn.textContent = dark ? "☀️" : "🌙";
  }
}

// --------------------------
// 分頁 Tab 切換
// --------------------------
function initToolTabs() {
  const tabs = Array.from(document.querySelectorAll(".tool-tab"));
  const sections = Array.from(document.querySelectorAll(".tool-section"));

  if (!tabs.length || !sections.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.toolTarget;

      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      sections.forEach((sec) =>
        sec.classList.toggle("active", sec.dataset.tool === target)
      );
    });
  });
}

// --------------------------
// 主 UI 初始化
// --------------------------
export function setupUI() {
  initThemeToggle();
  initToolTabs();

  // ==========================
  // 例子 1：風量計算器
  // ==========================

  const volumeInput = document.getElementById("volumeInput");
  const volumeUnit = document.getElementById("volumeUnit");
  const speedInput = document.getElementById("speedInput");
  const speedUnit = document.getElementById("speedUnit");
  const calcAreaBtn = document.getElementById("calcAreaBtn");
  const areaMessage = document.getElementById("areaMessage");
  const areaTableBody = document.getElementById("areaTableBody");

  // 單位選單初始化
  Object.keys(Unit_AirVolume).forEach((u) => {
    volumeUnit.add(new Option(u, u, false, u === "CMM"));
  });
  Object.keys(Unit_AirSpeed).forEach((u) => {
    speedUnit.add(new Option(u, u, false, u === "m/s"));
  });

  calcAreaBtn.addEventListener("click", () => {
    areaMessage.textContent = "";
    areaTableBody.innerHTML = "";

    const volList = parseNumberList(volumeInput.value);
    const spdList = parseNumberList(speedInput.value);

    if (!volList.length) {
      areaMessage.textContent = "請輸入風量";
      return;
    }
    if (!spdList.length) {
      areaMessage.textContent = "請輸入風速";
      return;
    }

    const volCMM = volList.map((v) =>
      toUnit(v, volumeUnit.value, Unit_AirVolume)
    );
    let spdMps = spdList.map((s) => toUnit(s, speedUnit.value, Unit_AirSpeed));

    const cumVol = cumulativeSum(volCMM);

    if (spdMps.length === 1) {
      spdMps = Array(cumVol.length).fill(spdMps[0]);
    } else if (spdMps.length !== cumVol.length) {
      areaMessage.textContent = "風速數量必須是 1 或與風量數量相同";
      return;
    }

    const areas = cumVol.map((v, i) => calculateArea(v, spdMps[i]));

    areas.forEach((area, i) => {
      const rec = getRecommendDiameter(area);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${volCMM[i].toFixed(1)} CMM</td>
        <td>${cumVol[i].toFixed(1)} CMM</td>
        <td>${spdMps[i].toFixed(2)} m/s</td>
        <td>${rec.diameter} mm</td>
        <td>${area.toFixed(4)} / ${rec.area.toFixed(4)}</td>
      `;
      areaTableBody.appendChild(tr);
    });
  });

  // ==========================
  // 例子 2：四角轉圓
  // ==========================

  const lengthInput = document.getElementById("lengthInput");
  const lengthUnit = document.getElementById("lengthUnit");
  const widthInput = document.getElementById("widthInput");
  const widthUnit = document.getElementById("widthUnit");
  const calcDiameterBtn = document.getElementById("calcDiameterBtn");
  const diameterOutput = document.getElementById("diameterOutput");

  Object.keys(Unit_Length).forEach((u) => {
    lengthUnit.add(new Option(u, u, false, u === "毫米"));
    widthUnit.add(new Option(u, u, false, u === "毫米"));
  });

  calcDiameterBtn.addEventListener("click", () => {
    diameterOutput.textContent = "";

    const L = Number(lengthInput.value);
    const W = Number(widthInput.value);

    if (!L || !W) {
      diameterOutput.textContent = "請輸入長度與寬度";
      return;
    }

    const Lm = toUnit(L, lengthUnit.value, Unit_Length);
    const Wm = toUnit(W, widthUnit.value, Unit_Length);

    const rectArea = Lm * Wm;
    const rec = getRecommendDiameter(rectArea);

    diameterOutput.textContent =
      `矩形面積：${rectArea.toFixed(4)} m²，` +
      `推薦圓管管徑：${rec.diameter} mm（圓面積 ${rec.area.toFixed(4)} m²）`;
  });

  // --------------------------
  // 圓轉方：圓管直徑 -> 一組方管建議列表
  // --------------------------

  const roundToRectDiameter = document.getElementById("roundToRectDiameter");
  const roundToRectBtn = document.getElementById("roundToRectBtn");
  const roundToRectMessage = document.getElementById("roundToRectMessage");
  const roundToRectTableBody = document.getElementById("roundToRectTableBody");

  /**
   * 根據圓管直徑，產生一組方管尺寸建議
   * 邏輯（參考你給的 Excel "圓轉方"）：
   * - 先算出圓管截面積 Ac
   * - 假設一個方管短邊 a（例如 50, 100, 150...mm）
   * - 計算理論長邊 b = Ac / a
   * - 將 b 以 50mm 為單位「無條件進位」到最近的 50 倍數
   * - 算出方管面積 Af = a * b
   * - 計算面積比 ratio = Af / Ac
   * - 只保留 ratio 在 1 ~ 1.25 之間（避免方管過大）
   */
  function generateRoundToRectList(diameterMm) {
    const results = [];
    if (!diameterMm || diameterMm <= 0) return results;

    const radiusM = diameterMm / 1000 / 2;
    const areaCircle = Math.PI * radiusM * radiusM;

    const stepMm = 50;
    const maxShortMm = 1600; // 可依需求調整

    for (let shortMm = stepMm; shortMm <= maxShortMm; shortMm += stepMm) {
      const shortM = shortMm / 1000;
      const longMTheory = areaCircle / shortM; // 理論長邊 (m)

      if (longMTheory <= 0) continue;

      // 以 50mm 為單位無條件進位
      const longMmTheory = longMTheory * 1000;
      const longMmCeil = Math.ceil(longMmTheory / stepMm) * stepMm;
      const longM = longMmCeil / 1000;

      const areaRect = shortM * longM;
      const ratio = areaRect / areaCircle;

      // 只保留比圓管略大的組合，且不要離太多
      if (ratio >= 1.0 && ratio <= 1.25) {
        results.push({
          short: shortMm,
          long: longMmCeil,
          ratio,
        });
      }
    }

    // 依短邊由小到大排序
    results.sort((a, b) => a.short - b.short);
    return results;
  }

  roundToRectBtn.addEventListener("click", () => {
    roundToRectMessage.textContent = "";
    roundToRectTableBody.innerHTML = "";

    const dia = Number(roundToRectDiameter.value);
    if (!dia) {
      roundToRectMessage.textContent = "請輸入圓管直徑 (mm)";
      return;
    }

    if (dia <= 0) {
      roundToRectMessage.textContent = "圓管直徑需為正數";
      return;
    }

    const list = generateRoundToRectList(dia);

    if (!list.length) {
      roundToRectMessage.textContent = "在目前設定下找不到合適的方管組合";
      return;
    }

    list.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.short}</td>
        <td>${item.long}</td>
        <td>${item.ratio.toFixed(3)}</td>
      `;
      roundToRectTableBody.appendChild(tr);
    });
  });

  // ==========================
  // 例子 3：風量快查表
  // ==========================

  const quickSpeedInput = document.getElementById("quickSpeedInput");
  const quickSpeedUnit = document.getElementById("quickSpeedUnit");
  const quickTableBody = document.getElementById("quickTableBody");
  const quickAddRowBtn = document.getElementById("quickAddRowBtn");
  const quickCalcBtn = document.getElementById("quickCalcBtn");
  const quickMessage = document.getElementById("quickMessage");

  // 初始化風速單位
  Object.keys(Unit_AirSpeed).forEach((u) => {
    quickSpeedUnit.add(new Option(u, u, false, u === "m/s"));
  });

  // 建立一列新的風量輸入列
  function addQuickRow(initialValue = "") {
    const tr = document.createElement("tr");

    // 第 1 欄：風量輸入 CMM
    const cmmTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "CMM";
    input.className = "quick-volume-input";
    if (initialValue !== "") input.value = initialValue;
    cmmTd.appendChild(input);
    tr.appendChild(cmmTd);

    // 其他欄位：計算結果（先留空）
    for (let i = 0; i < 6; i++) {
      const td = document.createElement("td");
      tr.appendChild(td);
    }

    quickTableBody.appendChild(tr);
  }

  // 點「新增風量列」→ 增加一列輸入
  quickAddRowBtn.addEventListener("click", () => {
    addQuickRow();
  });

  // 預設先給一列
  addQuickRow();

  // 計算用的 helper：設定效率顏色
  function setEfficiencyCell(td, eff) {
    td.textContent = eff.toFixed(1);

    // 清掉舊 class
    td.classList.remove("eff-high", "eff-mid");

    if (eff > 90) {
      td.classList.add("eff-high"); // 紅色
    } else if (eff >= 80 && eff <= 90) {
      td.classList.add("eff-mid"); // 綠色
    }
  }

  // 點「重新計算」→ 根據每列 CMM 重新算
  quickCalcBtn.addEventListener("click", () => {
    quickMessage.textContent = "";

    const speedVal = Number(quickSpeedInput.value);
    if (!speedVal) {
      quickMessage.textContent = "請輸入固定風速";
      return;
    }

    const speedMps = toUnit(speedVal, quickSpeedUnit.value, Unit_AirSpeed);
    if (speedMps <= 0) {
      quickMessage.textContent = "風速需為正數";
      return;
    }

    const rows = Array.from(quickTableBody.querySelectorAll("tr"));

    if (!rows.length) {
      quickMessage.textContent = "請先新增至少一列風量";
      return;
    }

    let hasValidRow = false;

    rows.forEach((tr) => {
      const tds = tr.querySelectorAll("td");
      const input = tds[0].querySelector("input.quick-volume-input");
      const cmm = Number(input?.value || 0);

      // 清空舊結果
      for (let i = 1; i < tds.length; i++) {
        tds[i].textContent = "";
        tds[i].classList.remove("eff-high", "eff-mid");
      }

      if (!cmm) {
        return; // 空列就略過
      }

      hasValidRow = true;

      // 需求面積
      const areaNeed = calculateArea(cmm, speedMps);

      // 推薦管徑 1
      const rec1 = getRecommendDiameter(areaNeed);
      const idx1 = Pipe_Diameter_Set_mm.indexOf(rec1.diameter);

      const qMax1 = rec1.area * speedMps * 60; // CMM
      const eff1 = (cmm / qMax1) * 100;

      // 推薦管徑 2: 下一階管徑（如果有）
      let dia2 = "";
      let qMax2 = "";
      let eff2 = "";

      if (idx1 >= 0 && idx1 < Pipe_Diameter_Set_mm.length - 1) {
        const d2 = Pipe_Diameter_Set_mm[idx1 + 1];
        const area2 = Pipe_Area_Set_m2[idx1 + 1];
        const q2 = area2 * speedMps * 60;
        const e2 = (cmm / q2) * 100;

        dia2 = d2;
        qMax2 = q2;
        eff2 = e2;
      }

      // 塞回表格：
      // tds[0] 是輸入欄
      tds[1].textContent = rec1.diameter; // 推薦管徑 1
      tds[2].textContent = qMax1.toFixed(1); // 管路風量上限 1
      setEfficiencyCell(tds[3], eff1); // 效率 1 (%)

      tds[4].textContent = dia2 !== "" ? dia2 : "-"; // 推薦管徑 2
      tds[5].textContent = qMax2 !== "" ? qMax2.toFixed(1) : "-"; // 管路風量上限 2
      if (eff2 !== "") {
        setEfficiencyCell(tds[6], eff2); // 效率 2 (%)
      } else {
        tds[6].textContent = "-";
      }
    });

    if (!hasValidRow) {
      quickMessage.textContent = "請在至少一列輸入 CMM 數值";
    }
  });
}
