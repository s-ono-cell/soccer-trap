/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type KickingFoot = 'right' | 'left';
export type VideoAngleType = 'side' | 'rear';

export type TrapPhaseKey = 'approach' | 'pre_touch' | 'touch' | 'post_touch';

export interface PhaseInfo {
  key: TrapPhaseKey;
  stepNumber: number;
  name: string;
  shortName: string;
  description: string;
  focusPoint: string;
  sideCheckTip: string;
  rearCheckTip: string;
}

export const TRAP_PHASES: PhaseInfo[] = [
  {
    key: 'approach',
    stepNumber: 1,
    name: '① 構え・アプローチ',
    shortName: '構え',
    description: 'ボールが来る直前、落下点を見定めて準備する姿勢。',
    focusPoint: '棒立ちにならず重心が少し落ちているか、体幹が適度に前傾しているか。',
    sideCheckTip: '軸足の膝が軽く曲がり（目安140°〜165°）、体幹が10°〜25°前傾。',
    rearCheckTip: '左右の肩の高さが揃い、頭がどちらかに傾きすぎていないか。',
  },
  {
    key: 'pre_touch',
    stepNumber: 2,
    name: '② インパクト直前（踏み込み）',
    shortName: '直前',
    description: '軸足をしっかり踏み込み、トラップ足をボールへ迎え出す瞬間。',
    focusPoint: '軸足が安定して体重を支えているか、トラップ足がリラックスして出ているか。',
    sideCheckTip: '軸足膝が深く曲がってクッション準備（目安135°〜155°）。',
    rearCheckTip: '軸足側に体が過度に倒れ込まず、体幹の傾きが±8°以内に収まっているか。',
  },
  {
    key: 'touch',
    stepNumber: 3,
    name: '③ インパクト・ファーストタッチ',
    shortName: 'タッチ',
    description: '足にボールが当たる瞬間。勢いを吸収（クッション）または押し出す瞬間。',
    focusPoint: '足首が固定され、膝でボールの威力を柔らかく吸収できているか。',
    sideCheckTip: 'トラップ足の膝でクッション（目安130°〜155°）、体幹がかぶさっているか。',
    rearCheckTip: '※後方視点の膝角度は不正確になりやすいため、頭と骨盤の左右バランス（±8°以内）を確認。',
  },
  {
    key: 'post_touch',
    stepNumber: 4,
    name: '④ コントロール後・次動作',
    shortName: '次動作',
    description: 'ボールを止めた直後、次のパス・ドリブル・シュートへ移行する体勢。',
    focusPoint: 'ボールの転がりに合わせて速やかに次のステップへ体重移動できているか。',
    sideCheckTip: '足が止まらず進行方向へスムーズに体幹が追従しているか。',
    rearCheckTip: '着地足のバランスが保たれ、体勢を崩さずに視野が保たれているか。',
  },
];

export interface Landmark {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  z: number; // depth
  visibility?: number;
}

export interface JointAngles {
  kickingKneeAngle?: number;  // degrees
  kickingHipAngle?: number;   // degrees
  kickingAnkleAngle?: number; // degrees
  supportKneeAngle?: number;  // degrees
  supportHipAngle?: number;   // degrees
  trunkForwardTilt?: number;  // degrees from vertical (side view)
  // Rear view metrics
  pelvisTilt?: number;        // degrees from horizontal (rear view)
  shoulderTilt?: number;      // degrees from horizontal (rear view)
  trunkLateralTilt?: number;  // degrees from vertical (rear view)
}

export interface FramePoseData {
  timestamp: number; // seconds
  frameIndex: number;
  landmarks?: Landmark[];
  angles: JointAngles;
  footSpeedNormalized?: number; // estimated foot displacement speed
}

export interface VideoAnalysisResult {
  id: string;
  sourceType: VideoAngleType;
  fileName: string;
  videoUrl: string;
  duration: number; // seconds
  fps: number;
  isEstimatedFps: boolean;
  totalAnalyzedFrames: number;
  frames: FramePoseData[];
  candidateTouchTime?: number; // auto-estimated candidate touch timestamp
  pinnedPhases: Record<TrapPhaseKey, number | null>; // timestamp in seconds or null
  analyzedAt: string;
  warningNotice?: string;
}

export interface AppSettings {
  kickingFoot: KickingFoot;
  playerHeightCm: number;
  autoDetectCandidate: boolean;
}
