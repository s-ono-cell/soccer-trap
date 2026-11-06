/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JointAngles, KickingFoot, Landmark, VideoAngleType } from '../types';

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

export const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Left Arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  // Right Arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Left Leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
  [POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  // Right Leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
  [POSE_LANDMARKS.RIGHT_HEEL, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
  // Head
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.LEFT_SHOULDER],
  [POSE_LANDMARKS.NOSE, POSE_LANDMARKS.RIGHT_SHOULDER],
];

/**
 * 3点から関節角度を計算（0〜180度）
 * @param a 端点A
 * @param b 頂点B（関節）
 * @param c 端点C
 */
export function calculateJointAngle(a?: Landmark, b?: Landmark, c?: Landmark): number | undefined {
  if (!a || !b || !c) return undefined;
  if ((a.visibility ?? 1) < 0.25 || (b.visibility ?? 1) < 0.25 || (c.visibility ?? 1) < 0.25) {
    return undefined;
  }

  const vBAx = a.x - b.x;
  const vBAy = a.y - b.y;
  const vBCx = c.x - b.x;
  const vBCy = c.y - b.y;

  const dot = vBAx * vBCx + vBAy * vBCy;
  const magBA = Math.sqrt(vBAx * vBAx + vBAy * vBAy);
  const magBC = Math.sqrt(vBCx * vBCx + vBCy * vBCy);

  if (magBA === 0 || magBC === 0) return undefined;

  let cosAngle = dot / (magBA * magBC);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));
  const radians = Math.acos(cosAngle);
  return Math.round((radians * 180) / Math.PI);
}

/**
 * 水平面（X軸）に対する傾き角度（-90〜+90度）
 */
export function calculateHorizontalTilt(left?: Landmark, right?: Landmark): number | undefined {
  if (!left || !right) return undefined;
  if ((left.visibility ?? 1) < 0.25 || (right.visibility ?? 1) < 0.25) return undefined;

  const dx = right.x - left.x;
  const dy = right.y - left.y; // 画面Yは下が正
  const radians = Math.atan2(dy, dx);
  let degrees = (radians * 180) / Math.PI;
  // -90〜90の範囲に収める
  if (degrees > 90) degrees -= 180;
  if (degrees < -90) degrees += 180;
  return Math.round(degrees);
}

/**
 * 垂直線に対する傾き角度（0〜90度）
 */
export function calculateVerticalTilt(top?: Landmark, bottom?: Landmark): number | undefined {
  if (!top || !bottom) return undefined;
  if ((top.visibility ?? 1) < 0.25 || (bottom.visibility ?? 1) < 0.25) return undefined;

  const dx = top.x - bottom.x;
  const dy = bottom.y - top.y; // 上向きベクトル
  const radians = Math.atan2(Math.abs(dx), dy);
  return Math.round((radians * 180) / Math.PI);
}

/**
 * ランドマーク群から関節角度と姿勢メトリクスを抽出
 */
export function extractJointAngles(
  landmarks: Landmark[] | undefined,
  kickingFoot: KickingFoot,
  viewType: VideoAngleType
): JointAngles {
  if (!landmarks || landmarks.length < 33) {
    return {};
  }

  const isRight = kickingFoot === 'right';

  const kickHip = isRight ? landmarks[POSE_LANDMARKS.RIGHT_HIP] : landmarks[POSE_LANDMARKS.LEFT_HIP];
  const kickKnee = isRight ? landmarks[POSE_LANDMARKS.RIGHT_KNEE] : landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const kickAnkle = isRight ? landmarks[POSE_LANDMARKS.RIGHT_ANKLE] : landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const kickFootIdx = isRight ? landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX] : landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX];
  const kickShoulder = isRight ? landmarks[POSE_LANDMARKS.RIGHT_SHOULDER] : landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

  const suppHip = isRight ? landmarks[POSE_LANDMARKS.LEFT_HIP] : landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const suppKnee = isRight ? landmarks[POSE_LANDMARKS.LEFT_KNEE] : landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const suppAnkle = isRight ? landmarks[POSE_LANDMARKS.LEFT_ANKLE] : landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
  const suppShoulder = isRight ? landmarks[POSE_LANDMARKS.LEFT_SHOULDER] : landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  // 体幹中心点
  const midShoulder: Landmark = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: ((leftShoulder.z ?? 0) + (rightShoulder.z ?? 0)) / 2,
  };
  const midHip: Landmark = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: ((leftHip.z ?? 0) + (rightHip.z ?? 0)) / 2,
  };

  const kickingKneeAngle = calculateJointAngle(kickHip, kickKnee, kickAnkle);
  const kickingHipAngle = calculateJointAngle(kickShoulder, kickHip, kickKnee);
  const kickingAnkleAngle = calculateJointAngle(kickKnee, kickAnkle, kickFootIdx);

  const supportKneeAngle = calculateJointAngle(suppHip, suppKnee, suppAnkle);
  const supportHipAngle = calculateJointAngle(suppShoulder, suppHip, suppKnee);

  const trunkForwardTilt = calculateVerticalTilt(midShoulder, midHip);

  let pelvisTilt: number | undefined;
  let shoulderTilt: number | undefined;
  let trunkLateralTilt: number | undefined;

  if (viewType === 'rear') {
    pelvisTilt = calculateHorizontalTilt(leftHip, rightHip);
    shoulderTilt = calculateHorizontalTilt(leftShoulder, rightShoulder);
    trunkLateralTilt = calculateVerticalTilt(midShoulder, midHip);
  }

  return {
    kickingKneeAngle,
    kickingHipAngle,
    kickingAnkleAngle,
    supportKneeAngle,
    supportHipAngle,
    trunkForwardTilt,
    pelvisTilt,
    shoulderTilt,
    trunkLateralTilt,
  };
}

export interface AngleEvaluation {
  metricName: string;
  value: number | undefined;
  unit: string;
  referenceRangeText: string;
  status: 'good' | 'check' | 'info';
  advice: string;
  disclaimer?: string;
}

/**
 * 局面ごとのチェック項目と評価（高校生向けにわかりやすく）
 */
export function evaluatePhaseAngles(
  phase: string,
  angles: JointAngles,
  viewType: VideoAngleType
): AngleEvaluation[] {
  const evaluations: AngleEvaluation[] = [];

  if (viewType === 'side') {
    // 1. 体幹前傾
    if (angles.trunkForwardTilt !== undefined) {
      const val = angles.trunkForwardTilt;
      const isGood = val >= 10 && val <= 30;
      evaluations.push({
        metricName: '体幹前傾角度',
        value: val,
        unit: '°',
        referenceRangeText: '目安: 10°〜30°',
        status: isGood ? 'good' : 'check',
        advice: isGood
          ? '良好: 適度に前傾し、ボールにかぶさる姿勢が取れています。'
          : val < 10
          ? '要確認: 上体が起き気味です。ボールが跳ねやすくなるため、少しヘソを前に倒す意識を持ちましょう。'
          : '要確認: 前傾が深すぎます。次の視野確保や素早い動き出しに影響する可能性があります。',
      });
    }

    // 2. 軸足の膝角度
    if (angles.supportKneeAngle !== undefined) {
      const val = angles.supportKneeAngle;
      const isGood = val >= 135 && val <= 165;
      evaluations.push({
        metricName: '軸足の膝角度',
        value: val,
        unit: '°',
        referenceRangeText: '目安: 135°〜165°',
        status: isGood ? 'good' : 'check',
        advice: isGood
          ? '良好: 棒立ちにならず、適度にクッションを作って体重を支えられています。'
          : val > 165
          ? '要確認: 軸足が突っ張り気味です。膝を軽く曲げて柔らかく踏み込むと安定します。'
          : '要確認: 軸足が深く沈み込んでいます。次の動作へ移りやすい高さを意識しましょう。',
      });
    }

    // 3. トラップ足の膝角度
    if (angles.kickingKneeAngle !== undefined) {
      const val = angles.kickingKneeAngle;
      let isGood = true;
      let advice = '';

      if (phase === 'touch') {
        isGood = val >= 130 && val <= 160;
        advice = isGood
          ? '良好: 膝が適度に曲がり、ボールの威力を吸収（クッション）できる柔軟性があります。'
          : val > 160
          ? '要確認: トラップ足が伸びきっています。インパクトの瞬間に膝でボールを包み込むように脱力しましょう。'
          : '要確認: 足を引きつけすぎています。ボールを身体の少し前で迎えるイメージでコントロールしましょう。';
      } else {
        isGood = val >= 120 && val <= 165;
        advice = isGood
          ? '良好: 足が力みなく自然な位置にセットされています。'
          : '要確認: 膝の曲がりが極端です。リラックスしてボールの軌道に合わせましょう。';
      }

      evaluations.push({
        metricName: 'トラップ足 膝角度',
        value: val,
        unit: '°',
        referenceRangeText: phase === 'touch' ? '目安: 130°〜160°' : '目安: 120°〜165°',
        status: isGood ? 'good' : 'check',
        advice,
      });
    }

    // 4. トラップ足の足首角度
    if (angles.kickingAnkleAngle !== undefined && phase === 'touch') {
      const val = angles.kickingAnkleAngle;
      const isGood = val >= 75 && val <= 110;
      evaluations.push({
        metricName: 'トラップ足 足首角度',
        value: val,
        unit: '°',
        referenceRangeText: '目安: 80°〜105° (面固定)',
        status: isGood ? 'good' : 'check',
        advice: isGood
          ? '良好: インサイドの面が安定して作られています。'
          : '要確認: つま先が下がりすぎ、または上がりすぎている可能性があります。面を地面に対して直角に意識しましょう。',
      });
    }
  } else {
    // Rear view evaluations
    if (angles.trunkLateralTilt !== undefined) {
      const val = Math.abs(angles.trunkLateralTilt);
      const isGood = val <= 10;
      evaluations.push({
        metricName: '体幹の左右傾き',
        value: val,
        unit: '°',
        referenceRangeText: '目安: ±10°以内',
        status: isGood ? 'good' : 'check',
        advice: isGood
          ? '良好: 体が左右に大きく倒れ込まず、中心軸がキープできています。'
          : '要確認: 軸足側または反対側へ上体が大きく傾いています。頭の位置を中心にとどめる意識をしましょう。',
      });
    }

    if (angles.pelvisTilt !== undefined) {
      const val = Math.abs(angles.pelvisTilt);
      const isGood = val <= 12;
      evaluations.push({
        metricName: '骨盤の水平度',
        value: val,
        unit: '°',
        referenceRangeText: '目安: ±12°以内',
        status: isGood ? 'good' : 'check',
        advice: isGood
          ? '良好: 骨盤が極端に傾かず、フラットに踏み込めています。'
          : '要確認: 骨盤の傾きが大きくなっています。片足立ちでも体幹を引き上げる意識を持ちましょう。',
      });
    }

    if (angles.shoulderTilt !== undefined) {
      const val = Math.abs(angles.shoulderTilt);
      const isGood = val <= 10;
      evaluations.push({
        metricName: '肩ラインの水平度',
        value: val,
        unit: '°',
        referenceRangeText: '目安: ±10°以内',
        status: isGood ? 'good' : 'check',
        advice: isGood
          ? '良好: 両肩の高さが安定し、無駄な力みがありません。'
          : '要確認: 片方の肩が上がっています。腕を使って自然にバランスを取りましょう。',
      });
    }

    // Rear knee disclaimer
    evaluations.push({
      metricName: '※後方視点の膝角度について',
      value: undefined,
      unit: '',
      referenceRangeText: '参考情報',
      status: 'info',
      advice: '後方からの撮影では、前後の膝の屈曲がカメラの奥行き方向と重なるため、膝角度の計測誤差が大きくなります。後方動画は体幹の左右ブレや重心バランスの確認を中心にご活用ください。',
      disclaimer: '単眼動画による2D推定の幾何学的限界によるものです。',
    });
  }

  return evaluations;
}
