/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, TRAP_PHASES, VideoAnalysisResult } from '../types';
import { POSE_LANDMARKS } from './poseCalculations';

/**
 * トラップ動作解析データをCSVとして出力・ダウンロード
 */
export function exportAnalysisToCsv(
  sideResult: VideoAnalysisResult,
  rearResult: VideoAnalysisResult | null,
  settings: AppSettings
): void {
  const lines: string[] = [];

  // UTF-8 BOM
  lines.push('\uFEFF');

  // メタデータセクション
  lines.push('【サッカートラップ（ファーストタッチ）フォーム解析レポート】');
  lines.push(`出力日時,${new Date().toLocaleString('ja-JP')}`);
  lines.push(`蹴り足設定,${settings.kickingFoot === 'right' ? '右足' : '左足'}`);
  lines.push(`選手身長設定,${settings.playerHeightCm} cm`);
  lines.push('※注意事項,本データは単眼カメラ動画からの2次元推定骨格に基づく参考値です。3Dモーションキャプチャ等の精密測定値ではありません。');
  lines.push('');

  // 4局面ピン止めサマリー
  lines.push('【ピン止めされた4局面の比較サマリー】');
  lines.push(
    [
      '局面番号',
      '局面名',
      '真横動画ピン時刻(秒)',
      '真横:トラップ足膝角度(度)',
      '真横:軸足膝角度(度)',
      '真横:体幹前傾角度(度)',
      '真横:足首角度(度)',
      '後ろ動画ピン時刻(秒)',
      '後ろ:体幹左右傾き(度)',
      '後ろ:肩水平度(度)',
      '後ろ:骨盤水平度(度)',
    ].join(',')
  );

  for (const phase of TRAP_PHASES) {
    const sideTime = sideResult.pinnedPhases[phase.key];
    const sideFrame = sideTime !== null ? findClosestFrame(sideResult.frames, sideTime) : null;

    const rearTime = rearResult?.pinnedPhases[phase.key] ?? null;
    const rearFrame = rearTime !== null && rearResult ? findClosestFrame(rearResult.frames, rearTime) : null;

    lines.push(
      [
        phase.stepNumber,
        `"${phase.name}"`,
        sideTime !== null ? sideTime.toFixed(3) : '未設定',
        sideFrame?.angles.kickingKneeAngle ?? '-',
        sideFrame?.angles.supportKneeAngle ?? '-',
        sideFrame?.angles.trunkForwardTilt ?? '-',
        sideFrame?.angles.kickingAnkleAngle ?? '-',
        rearTime !== null ? rearTime.toFixed(3) : rearResult ? '未設定' : '動画なし',
        rearFrame?.angles.trunkLateralTilt ?? '-',
        rearFrame?.angles.shoulderTilt ?? '-',
        rearFrame?.angles.pelvisTilt ?? '-',
      ].join(',')
    );
  }

  lines.push('');
  lines.push('--------------------------------------------------');
  lines.push('【時系列詳細データ：真横動画】');
  lines.push(`ファイル名,${sideResult.fileName}`);
  lines.push(`動画長,${sideResult.duration.toFixed(2)} 秒`);
  lines.push(`フレームレート,${sideResult.fps.toFixed(1)} fps ${sideResult.isEstimatedFps ? '(推定値)' : '(実測値)'}`);
  lines.push('');

  // 詳細ヘッダー
  const headerCols = [
    '時刻(秒)',
    'フレーム番号',
    'ピン止め局面',
    'トラップ足膝角度(度)',
    'トラップ足股関節角度(度)',
    'トラップ足足首角度(度)',
    '軸足膝角度(度)',
    '体幹前傾角度(度)',
    // 主要ランドマーク座標 (X, Y, Z, 信頼度)
    'トラップ足首_X',
    'トラップ足首_Y',
    'トラップ足首_Z',
    'トラップ足首_信頼度',
    'トラップ膝_X',
    'トラップ膝_Y',
    'トラップ膝_Z',
    '軸足膝_X',
    '軸足膝_Y',
    '軸足足首_X',
    '軸足足首_Y',
  ];
  lines.push(headerCols.join(','));

  const isRight = settings.kickingFoot === 'right';
  const kickAnkleIdx = isRight ? POSE_LANDMARKS.RIGHT_ANKLE : POSE_LANDMARKS.LEFT_ANKLE;
  const kickKneeIdx = isRight ? POSE_LANDMARKS.RIGHT_KNEE : POSE_LANDMARKS.LEFT_KNEE;
  const suppKneeIdx = isRight ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;
  const suppAnkleIdx = isRight ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE;

  for (const f of sideResult.frames) {
    const pinnedKey = Object.entries(sideResult.pinnedPhases).find(
      ([, t]) => t !== null && Math.abs(t - f.timestamp) < 0.04
    );
    const phaseLabel = pinnedKey
      ? TRAP_PHASES.find((p) => p.key === pinnedKey[0])?.shortName ?? ''
      : '';

    const lm = f.landmarks;
    const ka = lm ? lm[kickAnkleIdx] : null;
    const kk = lm ? lm[kickKneeIdx] : null;
    const sk = lm ? lm[suppKneeIdx] : null;
    const sa = lm ? lm[suppAnkleIdx] : null;

    lines.push(
      [
        f.timestamp.toFixed(3),
        f.frameIndex,
        `"${phaseLabel}"`,
        f.angles.kickingKneeAngle ?? '',
        f.angles.kickingHipAngle ?? '',
        f.angles.kickingAnkleAngle ?? '',
        f.angles.supportKneeAngle ?? '',
        f.angles.trunkForwardTilt ?? '',
        ka ? ka.x.toFixed(4) : '',
        ka ? ka.y.toFixed(4) : '',
        ka ? (ka.z ?? 0).toFixed(4) : '',
        ka ? (ka.visibility ?? 1).toFixed(3) : '',
        kk ? kk.x.toFixed(4) : '',
        kk ? kk.y.toFixed(4) : '',
        kk ? (kk.z ?? 0).toFixed(4) : '',
        sk ? sk.x.toFixed(4) : '',
        sk ? sk.y.toFixed(4) : '',
        sa ? sa.x.toFixed(4) : '',
        sa ? sa.y.toFixed(4) : '',
      ].join(',')
    );
  }

  // 後ろ動画がある場合
  if (rearResult) {
    lines.push('');
    lines.push('--------------------------------------------------');
    lines.push('【時系列詳細データ：後ろ動画】');
    lines.push(`ファイル名,${rearResult.fileName}`);
    lines.push(`動画長,${rearResult.duration.toFixed(2)} 秒`);
    lines.push(`フレームレート,${rearResult.fps.toFixed(1)} fps ${rearResult.isEstimatedFps ? '(推定値)' : '(実測値)'}`);
    lines.push('');

    const rearHeader = [
      '時刻(秒)',
      'フレーム番号',
      'ピン止め局面',
      '体幹左右傾き(度)',
      '肩ライン水平度(度)',
      '骨盤水平度(度)',
      '左腰_X',
      '左腰_Y',
      '右腰_X',
      '右腰_Y',
      '左肩_X',
      '左肩_Y',
      '右肩_X',
      '右肩_Y',
    ];
    lines.push(rearHeader.join(','));

    for (const f of rearResult.frames) {
      const pinnedKey = Object.entries(rearResult.pinnedPhases).find(
        ([, t]) => t !== null && Math.abs(t - f.timestamp) < 0.04
      );
      const phaseLabel = pinnedKey
        ? TRAP_PHASES.find((p) => p.key === pinnedKey[0])?.shortName ?? ''
        : '';

      const lm = f.landmarks;
      const lh = lm ? lm[POSE_LANDMARKS.LEFT_HIP] : null;
      const rh = lm ? lm[POSE_LANDMARKS.RIGHT_HIP] : null;
      const ls = lm ? lm[POSE_LANDMARKS.LEFT_SHOULDER] : null;
      const rs = lm ? lm[POSE_LANDMARKS.RIGHT_SHOULDER] : null;

      lines.push(
        [
          f.timestamp.toFixed(3),
          f.frameIndex,
          `"${phaseLabel}"`,
          f.angles.trunkLateralTilt ?? '',
          f.angles.shoulderTilt ?? '',
          f.angles.pelvisTilt ?? '',
          lh ? lh.x.toFixed(4) : '',
          lh ? lh.y.toFixed(4) : '',
          rh ? rh.x.toFixed(4) : '',
          rh ? rh.y.toFixed(4) : '',
          ls ? ls.x.toFixed(4) : '',
          ls ? ls.y.toFixed(4) : '',
          rs ? rs.x.toFixed(4) : '',
          rs ? rs.y.toFixed(4) : '',
        ].join(',')
      );
    }
  }

  // Blob作成とダウンロード
  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const nowStr = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, '')
    .replace('T', '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `trap_analysis_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function findClosestFrame(frames: { timestamp: number }[], time: number) {
  if (frames.length === 0) return null;
  let closest = frames[0];
  let minDiff = Math.abs(frames[0].timestamp - time);
  for (let i = 1; i < frames.length; i++) {
    const diff = Math.abs(frames[i].timestamp - time);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frames[i];
    }
  }
  return closest as unknown as import('../types').FramePoseData;
}
