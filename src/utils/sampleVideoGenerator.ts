/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoAngleType } from '../types';

/**
 * サッカーのトラップ動作をシミュレートしたサンプル動画をCanvasとMediaRecorderで生成
 */
export async function generateSampleSoccerVideo(viewType: VideoAngleType): Promise<File> {
  const width = 640;
  const height = 480;
  const fps = 30;
  const durationSeconds = 3.2;
  const totalFrames = Math.round(durationSeconds * fps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // MediaRecorder support check
  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : '',
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    mediaRecorder.onerror = (e) => reject(e);
  });

  mediaRecorder.start();

  // サッカーグラウンド背景と選手・ボールの描画ループ
  for (let frame = 0; frame <= totalFrames; frame++) {
    const t = frame / fps; // 秒
    const progress = frame / totalFrames; // 0..1

    // 背景：人工芝の緑と空
    ctx.fillStyle = '#064e3b'; // 深い芝のグリーン
    ctx.fillRect(0, 0, width, height);

    // 芝生のストライプ模様
    for (let s = 0; s < 8; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#047857' : '#059669';
      ctx.fillRect(0, s * (height / 8), width, height / 8);
    }

    // 白線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.85);
    ctx.lineTo(width, height * 0.85);
    ctx.stroke();

    // トラップ動作のパラメータ計算
    // t = 0..1.0: ボール接近 & アプローチ
    // t = 1.0..1.4: 軸足踏み込み & トラップ足準備
    // t = 1.4: インパクト（ファーストタッチ！）
    // t = 1.4..2.2: クッション吸収 & コントロール
    // t = 2.2..3.2: 体重移動 & 次のパスへ
    const touchTime = 1.4;

    // ボール位置
    let ballX = 0;
    let ballY = 0;
    if (viewType === 'side') {
      if (t < touchTime) {
        const ratio = t / touchTime;
        ballX = 60 + ratio * 240; // 左から選手足元へ飛んでくる
        ballY = 160 + Math.sin(ratio * Math.PI) * -60 + ratio * 200;
      } else {
        const post = t - touchTime;
        ballX = 300 + post * 35; // トラップ後に少し前へ転がる
        ballY = 360 + Math.sin(post * 4) * -8;
      }
    } else {
      // 後ろ視点
      if (t < touchTime) {
        const ratio = t / touchTime;
        ballX = 320 + Math.sin(ratio * 3) * 15;
        ballY = 220 + ratio * 140;
      } else {
        const post = t - touchTime;
        ballX = 325 + post * 15;
        ballY = 360;
      }
    }

    // 選手の姿勢計算（棒人間・シルエットとして描画、MediaPipeが確実に全身を認識できるように人間のプロポーション）
    const playerBaseX = viewType === 'side' ? 320 : 320;
    const playerBaseY = 370;

    // 頭部
    const headY = playerBaseY - 210;
    const headX = playerBaseX - (viewType === 'side' ? (t < touchTime ? 10 : 15) : 0);

    // 肩・腰
    const shoulderY = headY + 35;
    const hipY = shoulderY + 70;

    // 体幹前傾（side視点）
    const trunkTilt = viewType === 'side' ? (t >= 1.2 && t <= 1.8 ? 18 : 12) : 0;
    const shoulderX = headX - (viewType === 'side' ? trunkTilt * 0.6 : 0);
    const hipX = playerBaseX;

    // 軸足（左足）
    const suppKneeAngle = t >= 1.2 && t <= 1.8 ? 142 : 158;
    const suppKneeX = hipX - 10;
    const suppKneeY = hipY + 55;
    const suppAnkleX = hipX - 15;
    const suppAnkleY = playerBaseY;

    // トラップ足（右足）
    let kickKneeX = hipX + 10;
    let kickKneeY = hipY + 50;
    let kickAnkleX = hipX + 15;
    let kickAnkleY = playerBaseY;

    if (viewType === 'side') {
      if (t < 1.0) {
        // 自然体
        kickAnkleX = hipX + 15;
        kickAnkleY = playerBaseY;
      } else if (t < touchTime) {
        // 足を迎え出す
        const p = (t - 1.0) / 0.4;
        kickKneeX = hipX - 5 - p * 15;
        kickKneeY = hipY + 45;
        kickAnkleX = hipX - 25 - p * 15;
        kickAnkleY = playerBaseY - 20 - p * 15;
      } else if (t < 2.0) {
        // クッション＆ボール吸収
        const p = (t - touchTime) / 0.6;
        kickKneeX = hipX - 15 + p * 20;
        kickKneeY = hipY + 50;
        kickAnkleX = hipX - 35 + p * 25;
        kickAnkleY = playerBaseY - 25 + p * 20;
      } else {
        // 次のステップへ
        kickAnkleX = hipX + 20;
        kickAnkleY = playerBaseY;
      }
    } else {
      // 後ろ視点：左右のブレ
      const lateralLean = t >= 1.2 && t <= 1.6 ? -6 : 0;
      kickKneeX = hipX + 25;
      kickAnkleX = hipX + 30;
      if (t >= 1.2 && t <= 1.8) {
        kickAnkleY = playerBaseY - 30;
      }
    }

    // 選手のシルエット描画（人体らしく丸みと太さを持たせる）
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ウェアの色（日本代表サムライブルー）
    // シャツ
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    // パンツ（白）
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo((suppKneeX + kickKneeX) / 2, hipY + 30);
    ctx.stroke();

    // 軸足（左足・ソックス白）
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(hipX - 10, hipY + 25);
    ctx.lineTo(suppKneeX, suppKneeY);
    ctx.lineTo(suppAnkleX, suppAnkleY);
    ctx.stroke();

    // 蹴り足（右足・ソックス白）
    ctx.strokeStyle = '#38bdf8'; // 視認しやすいようにトラップ足を少し明るいカラーで縁取り
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(hipX + 10, hipY + 25);
    ctx.lineTo(kickKneeX, kickKneeY);
    ctx.lineTo(kickAnkleX, kickAnkleY);
    ctx.stroke();

    // スパイク（赤）
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(suppAnkleX - 8, suppAnkleY - 4, 22, 8);
    ctx.fillRect(kickAnkleX - 8, kickAnkleY - 4, 22, 8);

    // 頭部（肌色）
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(headX, headY, 18, 0, Math.PI * 2);
    ctx.fill();

    // 髪の毛（黒）
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(headX, headY - 4, 18, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // 腕（バランス）
    ctx.strokeStyle = '#fbcfe8';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(shoulderX + (viewType === 'side' ? -35 : -40), shoulderY + 45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(shoulderX + (viewType === 'side' ? 35 : 40), shoulderY + 40);
    ctx.stroke();

    // サッカーボール（白黒テルスター柄）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
    ctx.fill();

    // 視点と局面のガイド文字（動画内）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(
      viewType === 'side' ? '【サンプル動画：真横視点】' : '【サンプル動画：後ろ視点】',
      16,
      28
    );

    let phaseName = '構え・アプローチ';
    if (t >= 1.0 && t < 1.35) phaseName = 'インパクト直前（踏み込み）';
    else if (t >= 1.35 && t <= 1.55) phaseName = '★インパクト（ファーストタッチ）';
    else if (t > 1.55) phaseName = 'コントロール後・次動作';

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText(`局面目安: ${phaseName} (${t.toFixed(2)}s)`, 16, 52);

    // フレーム進行待機
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  mediaRecorder.stop();
  const videoBlob = await recordingPromise;

  const fileName =
    viewType === 'side'
      ? 'sample_trap_side_view.webm'
      : 'sample_trap_rear_view.webm';

  return new File([videoBlob], fileName, { type: mimeType });
}
